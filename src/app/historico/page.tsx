"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, History, SearchX } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/contexts/PlanContext";
import { getSessionsByPlan, deleteStudySession } from "@/services/sessionService";
import { getSubjectsByPlan } from "@/services/planSubjectService";
import type { StudySession } from "@/types";
import type { PlanSubjectWithDetails } from "@/services/planSubjectService";
import { Button } from "@/components/ui/button";

interface SessionWithSubject extends StudySession {
  subjectTitle: string;
  subjectColor: string;
}

export default function HistoricoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { activePlan } = usePlan();

  const [sessions, setSessions] = useState<SessionWithSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      if (!user || !activePlan) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [fetchedSessions, fetchedSubjects] = await Promise.all([
          getSessionsByPlan(user.uid, activePlan.id),
          getSubjectsByPlan(activePlan.id),
        ]);

        if (!cancelled) {
          const merged = fetchedSessions.map(session => {
            const subject = fetchedSubjects.find(s => s.subjectId === session.subjectId);
            return {
              ...session,
              subjectTitle: subject?.subjectTitle || "Desconhecida",
              subjectColor: subject?.subjectColor || "#94a3b8"
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

  const renderPerformance = (session: SessionWithSubject) => {
    if (session.questionsTotal === undefined || session.questionsTotal === 0) {
      return <span className="text-slate-400 text-sm italic">-</span>;
    }
    
    const correct = session.questionsCorrect || 0;
    const total = session.questionsTotal;
    const percent = Math.round((correct / total) * 100);
    
    const isGood = percent >= 70;
    
    return (
      <div className={`font-medium ${isGood ? 'text-emerald-600' : 'text-red-500'}`}>
        {correct}/{total} <span className="text-sm opacity-80">({percent}%)</span>
      </div>
    );
  };

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
    <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 h-full w-1.5 bg-indigo-600" />
        <div className="flex flex-col pl-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <History className="h-7 w-7 text-indigo-600" />
            Histórico Global
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registro de todas as sessões de estudo realizadas no plano <strong>{activePlan.title}</strong>.
          </p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center gap-4 bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 bg-slate-50 rounded-full border border-slate-100">
            <SearchX className="h-8 w-8 text-slate-400" />
          </div>
          <div>
            <p className="text-lg font-medium text-slate-800">Nenhuma sessão encontrada</p>
            <p className="text-sm text-slate-500 mt-1">
              Seu histórico está vazio. Comece a estudar para ver seus registros aqui.
            </p>
          </div>
          <Button onClick={() => router.push("/planejamento")} className="mt-2">
            Ir para Planejamento
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-4">Data</th>
                  <th scope="col" className="px-6 py-4">Disciplina</th>
                  <th scope="col" className="px-6 py-4">Categoria</th>
                  <th scope="col" className="px-6 py-4">Tempo</th>
                  <th scope="col" className="px-6 py-4">Desempenho</th>
                  <th scope="col" className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map(session => {
                  const dateObj = new Date(session.date);
                  const isDeleting = deletingId === session.id;
                  
                  return (
                    <tr key={session.id} className={`hover:bg-slate-50 transition-colors ${isDeleting ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900">
                          {dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </div>
                        <div className="text-xs text-slate-400">
                          {dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span 
                          className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border"
                          style={{ 
                            backgroundColor: `${session.subjectColor}15`, 
                            color: session.subjectColor,
                            borderColor: `${session.subjectColor}30`
                          }}
                        >
                          {session.subjectTitle}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-slate-600 font-medium">
                          {session.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-700">
                        {formatDuration(session.durationInSeconds)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderPerformance(session)}
                      </td>
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
