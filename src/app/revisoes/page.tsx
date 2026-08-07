"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle, CalendarClock, BrainCircuit } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/contexts/PlanContext";
import { getPendingReviewsByPlan, completeReview } from "@/services/reviewService";
import { getSubjectsByPlan } from "@/services/planSubjectService";
import type { Review } from "@/types";
import { Button } from "@/components/ui/button";

interface ReviewWithSubject extends Review {
  subjectTitle: string;
  subjectColor: string;
}

export default function RevisoesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { activePlan } = usePlan();

  const [reviews, setReviews] = useState<ReviewWithSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);

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
          getPendingReviewsByPlan(user.uid, activePlan.id),
          getSubjectsByPlan(activePlan.id)
        ]);
        
        if (!cancelled) {
          const today = new Date();
          // Filter to only show reviews scheduled for today or earlier
          const activeReviews = fetchedReviews
            .filter(r => new Date(r.scheduledDate) <= today)
            .map(r => {
              const subject = fetchedSubjects.find(s => s.subjectId === r.subjectId);
              return {
                ...r,
                subjectTitle: subject?.subjectTitle || "Disciplina Desconhecida",
                subjectColor: subject?.subjectColor || "#94a3b8"
              };
            });
            
          // Sort by oldest first
          activeReviews.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
          
          setReviews(activeReviews);
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

  async function handleCompleteReview(review: Review) {
    try {
      setCompletingId(review.id);
      await completeReview(review);
      
      // Remove from UI with a slight delay for the animation
      setTimeout(() => {
        setReviews(prev => prev.filter(r => r.id !== review.id));
        setCompletingId(null);
      }, 300);
      
    } catch (err) {
      console.error("Erro ao completar revisão:", err);
      setCompletingId(null);
    }
  }

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
    <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 h-full w-1.5 bg-indigo-600" />
        <div className="flex flex-col pl-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <BrainCircuit className="h-7 w-7 text-indigo-600" />
            Revisões Pendentes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Revisões espaçadas agendadas automaticamente para otimizar sua retenção de memória.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center gap-4">
            <div className="p-4 bg-emerald-50 rounded-full">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <div>
              <p className="text-lg font-medium text-slate-800">Tudo em dia!</p>
              <p className="text-sm text-slate-500 mt-1">
                Você não possui revisões pendentes para hoje no plano <strong>{activePlan.title}</strong>.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {reviews.map(review => {
              const isCompleting = completingId === review.id;
              
              let stepLabel = "Revisão de 24h";
              if (review.step === 2) stepLabel = "Revisão de 7 dias";
              else if (review.step === 3) stepLabel = "Revisão de 30 dias";
              
              const isLate = new Date(review.scheduledDate).toLocaleDateString() !== new Date().toLocaleDateString();

              return (
                <div 
                  key={review.id} 
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4 transition-all duration-300 ${
                    isCompleting ? "opacity-0 translate-x-8" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-1.5 h-12 rounded-full shrink-0" 
                      style={{ backgroundColor: review.subjectColor }}
                    />
                    <div className="flex flex-col gap-1.5">
                      <h3 className="font-semibold text-slate-800 text-lg">
                        {review.subjectTitle}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                          {stepLabel}
                        </span>
                        
                        {isLate ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                            <CalendarClock className="h-3 w-3" />
                            Atrasada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
                            <CalendarClock className="h-3 w-3" />
                            Hoje
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => handleCompleteReview(review)}
                    disabled={isCompleting}
                    variant="outline"
                    className="group border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors shrink-0"
                  >
                    {isCompleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                        Marcar como Feita
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
