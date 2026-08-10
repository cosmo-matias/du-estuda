"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, History, SearchX, Filter, PauseCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/contexts/PlanContext";
import { getSessionsByPlan, deleteStudySession } from "@/services/sessionService";
import { getSubjectsByPlan } from "@/services/planSubjectService";
import { getTopicsByPlan } from "@/services/topicService";
import type { StudySession, Topic } from "@/types";
import type { PlanSubjectWithDetails } from "@/services/planSubjectService";
import { Button } from "@/components/ui/button";

interface SessionWithDetails extends StudySession {
  subjectTitle: string;
  subjectColor: string;
  topicTitle?: string;
}

export default function HistoricoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { activePlan } = usePlan();

  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [subjects, setSubjects] = useState<PlanSubjectWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filtros
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      if (!user || !activePlan) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [fetchedSessions, fetchedSubjects, fetchedTopics] = await Promise.all([
          getSessionsByPlan(user.uid, activePlan.id),
          getSubjectsByPlan(activePlan.id),
          getTopicsByPlan(activePlan.id),
        ]);

        if (!cancelled) {
          setSubjects(fetchedSubjects);
          
          const merged = fetchedSessions.map(session => {
            const subject = fetchedSubjects.find(s => s.subjectId === session.subjectId);
            const topic = session.topicId ? fetchedTopics.find(t => t.id === session.topicId) : undefined;
            return {
              ...session,
              subjectTitle: subject?.subjectTitle || "Desconhecida",
              subjectColor: subject?.subjectColor || "#94a3b8",
              topicTitle: topic?.title
            };
          });

          // Sort descending by date
          merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setSessions(merged);
        }
      } catch (err) {
        console.error("Erro ao carregar histórico:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [user, activePlan]);

  const handleDeleteSession = async (sessionId: string) => {
    const confirm = window.confirm("Tem certeza que deseja excluir esta sessão permanentemente?");
    if (!confirm) return;

    try {
      setDeletingId(sessionId);
      await deleteStudySession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err) {
      console.error("Erro ao deletar sessão:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const renderPerformance = (session: SessionWithDetails) => {
    if (session.pagesRead !== undefined && session.pagesRead > 0) {
      return (
        <div className="font-medium text-slate-700">
          Págs: {session.pagesRead}
        </div>
      );
    }

    if (session.questionsTotal === undefined || session.questionsTotal === 0) {
      return <span className="text-slate-400 text-sm italic">-</span>;
    }
    
    const correct = session.questionsCorrect || 0;
    const total = session.questionsTotal;
    const percent = Math.round((correct / total) * 100);
    
    const isGood = percent >= 70;
    
    return (
      <div className={`font-medium ${isGood ? 'text-emerald-600' : 'text-red-500'}`}>
        {correct}/{total} <span className="text-xs opacity-80">({percent}%)</span>
      </div>
    );
  };

  const filteredSessions = useMemo(() => {
    let result = sessions;

    if (selectedSubjectFilter !== "all") {
      result = result.filter(s => s.subjectId === selectedSubjectFilter);
    }

    if (selectedCategoryFilter !== "all") {
      result = result.filter(s => s.category === selectedCategoryFilter);
    }

    if (selectedPeriodFilter !== "all") {
      const now = new Date();
      let limitDate = new Date();
      
      if (selectedPeriodFilter === "7d") {
        limitDate.setDate(now.getDate() - 7);
      } else if (selectedPeriodFilter === "30d") {
        limitDate.setDate(now.getDate() - 30);
      } else if (selectedPeriodFilter === "month") {
        limitDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      
      result = result.filter(s => new Date(s.date) >= limitDate);
    }

    return result;
  }, [sessions, selectedSubjectFilter, selectedCategoryFilter, selectedPeriodFilter]);

  // Unique categories for the filter
  const categories = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach(s => set.add(s.category));
    return Array.from(set).sort();
  }, [sessions]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!activePlan) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg text-slate-500">Nenhum plano selecionado.</p>
        <Button onClick={() => router.push("/planos")}>Ver Meus Planos</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 h-full w-1.5 bg-indigo-600" />
        <div className="flex flex-col pl-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <History className="h-7 w-7 text-indigo-600" />
            Histórico Global
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registro detalhado de todas as suas sessões de estudo.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex items-center gap-2 text-slate-500 mr-2 shrink-0">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-semibold">Filtros:</span>
        </div>
        
        <div className="flex flex-wrap gap-3 flex-1 w-full">
          <select
            className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
          >
            <option value="all">Todas as Disciplinas</option>
            {subjects.map(sub => (
              <option key={sub.subjectId} value={sub.subjectId}>{sub.subjectTitle}</option>
            ))}
          </select>

          <select
            className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
          >
            <option value="all">Todas as Categorias</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={selectedPeriodFilter}
            onChange={(e) => setSelectedPeriodFilter(e.target.value)}
          >
            <option value="all">Todo o Período</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="month">Este Mês</option>
          </select>
        </div>
      </div>

      {filteredSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center gap-4 bg-white rounded-xl shadow-sm border border-slate-200 border-dashed">
          <div className="p-4 bg-slate-50 rounded-full border border-slate-100">
            <SearchX className="h-8 w-8 text-slate-400" />
          </div>
          <div>
            <p className="text-lg font-medium text-slate-800">
              {sessions.length === 0 
                ? "Nenhuma sessão registrada no plano"
                : "Nenhuma sessão encontrada para os filtros selecionados"}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Ajuste os filtros acima ou registre um novo estudo.
            </p>
          </div>
          {sessions.length === 0 && (
            <Button onClick={() => router.push("/planejamento")} className="mt-2">
              Ir para Planejamento
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-4">Data / Hora</th>
                  <th scope="col" className="px-6 py-4">Disciplina & Tópico</th>
                  <th scope="col" className="px-6 py-4">Categoria</th>
                  <th scope="col" className="px-6 py-4">Tempo</th>
                  <th scope="col" className="px-6 py-4">Métricas</th>
                  <th scope="col" className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSessions.map(session => {
                  const dateObj = new Date(session.date);
                  const isDeleting = deletingId === session.id;
                  
                  return (
                    <tr key={session.id} className={`hover:bg-slate-50 transition-colors ${isDeleting ? 'opacity-50' : ''}`}>
                      {/* Data / Hora */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900">
                          {dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + '.'}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      
                      {/* Disciplina & Tópico */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span 
                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold border"
                            style={{ 
                              backgroundColor: `${session.subjectColor}15`, 
                              color: session.subjectColor,
                              borderColor: `${session.subjectColor}30`
                            }}
                          >
                            {session.subjectTitle}
                          </span>
                          {(session.topicTitle || session.material) && (
                            <span className="text-xs text-slate-500 line-clamp-2 max-w-[250px]" title={session.topicTitle || session.material}>
                              {session.topicTitle || session.material}
                            </span>
                          )}
                        </div>
                      </td>
                      
                      {/* Categoria */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-semibold">
                          {session.category}
                        </span>
                      </td>
                      
                      {/* Tempo */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-700">
                          {formatDuration(session.durationInSeconds)}
                        </div>
                        {session.pausedDurationInSeconds && session.pausedDurationInSeconds > 0 ? (
                          <div className="flex items-center gap-1 text-[10px] text-amber-600 mt-1 font-medium bg-amber-50 w-fit px-1.5 py-0.5 rounded">
                            <PauseCircle className="h-3 w-3" />
                            {formatDuration(session.pausedDurationInSeconds)} em pausa
                          </div>
                        ) : null}
                      </td>
                      
                      {/* Desempenho / Métricas */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderPerformance(session)}
                      </td>
                      
                      {/* Ações */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSession(session.id)}
                          disabled={isDeleting}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
