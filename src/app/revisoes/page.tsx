"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CheckCircle,
  CalendarClock,
  BrainCircuit,
  Play,
  XCircle,
  Check,
  CalendarDays,
  Target,
  Sparkles,
  Inbox
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/contexts/PlanContext";
import {
  getReviewsByPlan,
  completeReview,
  ignoreReview,
} from "@/services/reviewService";
import { getSubjectsByPlan } from "@/services/planSubjectService";
import type { ReviewItem } from "@/types";
import type { PlanSubjectWithDetails } from "@/services/planSubjectService";
import { Button } from "@/components/ui/button";
import { AddStudyModal } from "@/components/estudo/AddStudyModal";

type TabValue = "scheduled" | "delayed" | "completed" | "ignored";

export default function RevisoesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { activePlan } = usePlan();

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [subjects, setSubjects] = useState<PlanSubjectWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<TabValue>("scheduled");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [addStudyModalOpen, setAddStudyModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadReviews() {
      if (!user || !activePlan) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [fetchedReviews, fetchedSubjects] = await Promise.all([
          getReviewsByPlan(user.uid, activePlan.id),
          getSubjectsByPlan(activePlan.id)
        ]);
        
        if (!cancelled) {
          setSubjects(fetchedSubjects);
          setReviews(fetchedReviews);
        }
      } catch (err) {
        console.error("Erro ao carregar revisões:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadReviews();
    return () => {
      cancelled = true;
    };
  }, [user, activePlan]);

  async function handleComplete(review: ReviewItem) {
    try {
      setActionLoadingId(review.id);
      await completeReview(review.id);
      setReviews(prev => prev.map(r => r.id === review.id ? { ...r, status: 'completed' } : r));
    } catch (err) {
      console.error("Erro ao completar revisão:", err);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleIgnore(review: ReviewItem) {
    try {
      setActionLoadingId(review.id);
      await ignoreReview(review.id);
      setReviews(prev => prev.map(r => r.id === review.id ? { ...r, status: 'ignored' } : r));
    } catch (err) {
      console.error("Erro ao ignorar revisão:", err);
    } finally {
      setActionLoadingId(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const filteredReviews = useMemo(() => {
    return reviews.filter(r => r.status === activeTab);
  }, [reviews, activeTab]);

  const delayedCount = useMemo(() => {
    return reviews.filter(r => r.status === 'delayed').length;
  }, [reviews]);

  // Group by scheduledDate (yyyy-MM-dd)
  const groupedReviews = useMemo(() => {
    const groups: Record<string, ReviewItem[]> = {};
    filteredReviews.forEach(r => {
      const dateKey = new Date(r.scheduledDate).toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "long"
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(r);
    });

    // Sort dates (descending if completed/ignored, ascending if scheduled/delayed)
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      // a hacky sort by parsing the actual first item's scheduledDate
      const dateA = new Date(groups[a][0].scheduledDate).getTime();
      const dateB = new Date(groups[b][0].scheduledDate).getTime();
      return (activeTab === 'completed' || activeTab === 'ignored') 
        ? dateB - dateA 
        : dateA - dateB;
    });

    return sortedKeys.map(key => ({
      dateLabel: key,
      items: groups[key]
    }));
  }, [filteredReviews, activeTab]);

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
        <p className="text-lg text-slate-500">
          Nenhum plano selecionado.
        </p>
        <Button onClick={() => router.push("/planos")}>
          Ver Meus Planos
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 h-full w-1.5 bg-indigo-600" />
        <div className="flex flex-col pl-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <BrainCircuit className="h-7 w-7 text-indigo-600" />
            Revisões
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plano ativo: <strong className="text-slate-800">{activePlan.title}</strong>
          </p>
        </div>
        
        <div className="flex-shrink-0 z-10">
          <Button
            variant="outline"
            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 bg-white"
            onClick={() => setAddStudyModalOpen(true)}
          >
            + Adicionar Estudo
          </Button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex overflow-x-auto pb-2 gap-2 hide-scrollbar">
        <button
          onClick={() => setActiveTab("scheduled")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === "scheduled" 
              ? "bg-indigo-600 text-white shadow-md" 
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          PROGRAMADAS
        </button>
        <button
          onClick={() => setActiveTab("delayed")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === "delayed" 
              ? "bg-red-500 text-white shadow-md" 
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          ATRASADAS
          {delayedCount > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === "delayed" ? "bg-white/20" : "bg-red-100 text-red-600"}`}>
              {delayedCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === "completed" 
              ? "bg-emerald-500 text-white shadow-md" 
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          CONCLUÍDAS
        </button>
        <button
          onClick={() => setActiveTab("ignored")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === "ignored" 
              ? "bg-slate-600 text-white shadow-md" 
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          IGNORADAS
        </button>
      </div>

      {/* TIMELINE */}
      <div className="flex flex-col gap-8">
        {groupedReviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 bg-white rounded-xl border border-slate-200 border-dashed text-center">
            {activeTab === "delayed" ? (
              <>
                <div className="p-4 bg-emerald-50 rounded-full mb-4">
                  <Sparkles className="h-10 w-10 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Tudo em dia!</h3>
                <p className="text-slate-500 mt-2 max-w-sm">
                  Legal, você não tem revisões atrasadas no momento. Continue assim!
                </p>
              </>
            ) : activeTab === "scheduled" ? (
              <>
                <div className="p-4 bg-indigo-50 rounded-full mb-4">
                  <CalendarDays className="h-10 w-10 text-indigo-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Sem revisões programadas</h3>
                <p className="text-slate-500 mt-2 max-w-sm">
                  Suas futuras revisões aparecerão aqui à medida que você estudar novas matérias.
                </p>
              </>
            ) : (
              <>
                <div className="p-4 bg-slate-50 rounded-full mb-4">
                  <Inbox className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Nenhum item encontrado</h3>
                <p className="text-slate-500 mt-2">
                  Não há revisões com o status "{activeTab}".
                </p>
              </>
            )}
          </div>
        ) : (
          groupedReviews.map((group) => (
            <div key={group.dateLabel} className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="h-px bg-slate-200 flex-1" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" />
                  {group.dateLabel}
                </h2>
                <div className="h-px bg-slate-200 flex-1" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.items.map(review => {
                  const isLoading = actionLoadingId === review.id;
                  
                  return (
                    <div 
                      key={review.id} 
                      className={`relative flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 ${isLoading ? 'opacity-50 scale-95' : 'hover:shadow-md hover:border-slate-300'}`}
                    >
                      <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: review.subjectColor || '#6366f1' }} />
                      
                      <div className="p-5 flex-1 flex flex-col gap-3 mt-1">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-bold text-slate-800 text-lg leading-tight line-clamp-2">
                            {review.subjectName}
                          </h3>
                          <span className="inline-flex items-center whitespace-nowrap rounded-md bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700 ring-1 ring-inset ring-indigo-700/10 shrink-0">
                            Revisão {review.intervalDays}d
                          </span>
                        </div>
                        
                        {(review.topicName || review.category) && (
                          <div className="flex flex-wrap gap-2 text-xs">
                            {review.category && (
                              <span className="bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded">
                                {review.category}
                              </span>
                            )}
                            {review.topicName && (
                              <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-medium truncate max-w-[200px]">
                                {review.topicName}
                              </span>
                            )}
                          </div>
                        )}
                        
                        <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col gap-1.5 text-xs text-slate-500">
                          {review.metrics?.studyTime && (
                            <div className="flex justify-between">
                              <span>Tempo estudado:</span>
                              <span className="font-medium text-slate-700">{review.metrics.studyTime} min</span>
                            </div>
                          )}
                          {review.metrics?.questionsCount !== undefined && (
                            <div className="flex justify-between">
                              <span>Questões resolvidas:</span>
                              <span className="font-medium text-slate-700">{review.metrics.questionsCount}</span>
                            </div>
                          )}
                          {review.metrics?.accuracy !== undefined && (
                            <div className="flex justify-between">
                              <span>Acertos:</span>
                              <span className="font-medium text-slate-700">{review.metrics.accuracy}%</span>
                            </div>
                          )}
                          <div className="flex justify-between text-[10px] mt-1 text-slate-400">
                            <span>Gerada em: {new Date(review.createdDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* ACTIONS */}
                      {(activeTab === 'scheduled' || activeTab === 'delayed') && (
                        <div className="flex border-t border-slate-100 divide-x divide-slate-100 bg-slate-50">
                          <button
                            onClick={() => router.push(`/cronometro?subjectId=${review.subjectId}&reviewId=${review.id}`)}
                            disabled={isLoading}
                            className="flex-1 py-3 flex justify-center items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Estudar agora"
                          >
                            <Play className="h-4 w-4 fill-current" />
                            Estudar
                          </button>
                          <button
                            onClick={() => handleComplete(review)}
                            disabled={isLoading}
                            className="flex-1 py-3 flex justify-center items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Marcar como concluída"
                          >
                            <Check className="h-4 w-4" />
                            Concluir
                          </button>
                          <button
                            onClick={() => handleIgnore(review)}
                            disabled={isLoading}
                            className="w-14 py-3 flex justify-center items-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Ignorar revisão"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <AddStudyModal
        open={addStudyModalOpen}
        onClose={() => setAddStudyModalOpen(false)}
        subjects={subjects}
      />
    </div>
  );
}
