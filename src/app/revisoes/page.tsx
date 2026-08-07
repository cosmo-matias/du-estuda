"use client";

import { useState, useEffect } from "react";
import { PlayCircle, CheckCircle, XCircle, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getReviews, updateReviewStatus } from "@/services/reviewService";
import type { Review } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------
export default function RevisoesPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const { user }              = useAuth();

  // -------------------------------------------------------------------------
  // Fetch Reviews
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function fetchReviews() {
      if (!user) return;
      try {
        setLoading(true);
        const data = await getReviews(user.uid);
        if (!cancelled) setReviews(data);
      } catch (err) {
        console.error("Erro ao carregar revisões:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchReviews();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  async function handleStatusChange(id: string, newStatus: 'completed' | 'ignored') {
    try {
      // Optimistic update
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
      // Persist to Firestore
      await updateReviewStatus(id, newStatus);
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      // Revert on error could be implemented here
    }
  }

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------
  const pendingReviews   = reviews.filter((r) => r.status === "pending");
  const completedReviews = reviews.filter((r) => r.status === "completed");
  const ignoredReviews   = reviews.filter((r) => r.status === "ignored");
  // Assuming 'atrasadas' requires logic based on scheduledFor vs today.
  // For now, let's keep it empty or mock it if needed.
  const delayedReviews: Review[] = []; 

  // -------------------------------------------------------------------------
  // Render Item Helper
  // -------------------------------------------------------------------------
  const renderReviewItem = (review: Review, showActions: boolean = false) => (
    <Card key={review.id} className="overflow-hidden hover:shadow-sm transition-shadow">
      <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left info */}
        <div className="flex items-center gap-4 w-full sm:w-auto">
          {/* Cycle Badge */}
          <div className="flex flex-col items-center justify-center bg-indigo-50 text-indigo-700 rounded-lg px-3 py-2 min-w-[70px] text-center border border-indigo-100">
            <RotateCcw className="w-4 h-4 mb-1" />
            <span className="text-xs font-bold whitespace-nowrap">{review.cycle}</span>
          </div>

          {/* Text content */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 tracking-wider">
                {review.category}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Agendado:{" "}
                <span className={review.scheduledFor === "HOJE" ? "text-amber-600 font-bold" : ""}>
                  {String(review.scheduledFor)}
                </span>
              </span>
            </div>
            <h3 className="font-semibold text-slate-900 line-clamp-1">{review.subjectTitle}</h3>
            <p className="text-sm text-slate-500 line-clamp-1">{review.topicTitle}</p>
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto justify-end mt-2 sm:mt-0">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-red-500 hover:bg-red-50"
              onClick={() => handleStatusChange(review.id, "ignored")}
            >
              <XCircle className="w-5 h-5" />
              <span className="sr-only">Ignorar</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-emerald-500 hover:bg-emerald-50"
              onClick={() => handleStatusChange(review.id, "completed")}
            >
              <CheckCircle className="w-5 h-5" />
              <span className="sr-only">Concluir</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-4"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Estudar</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex h-full flex-col p-4 md:p-8 max-w-5xl mx-auto w-full gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Revisões</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie seu ciclo de repetições espaçadas.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="programadas" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="programadas" className="py-2.5 text-xs sm:text-sm">
            PROGRAMADAS
          </TabsTrigger>
          <TabsTrigger value="atrasadas" className="py-2.5 text-xs sm:text-sm">
            ATRASADAS
          </TabsTrigger>
          <TabsTrigger value="ignoradas" className="py-2.5 text-xs sm:text-sm">
            IGNORADAS
          </TabsTrigger>
          <TabsTrigger value="concluidas" className="py-2.5 text-xs sm:text-sm">
            CONCLUÍDAS
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="programadas" className="m-0 flex flex-col gap-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : pendingReviews.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
                Nenhuma revisão programada.
              </div>
            ) : (
              pendingReviews.map((r) => renderReviewItem(r, true))
            )}
          </TabsContent>

          <TabsContent value="atrasadas" className="m-0 flex flex-col gap-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : delayedReviews.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
                Nenhuma revisão atrasada. Tudo em dia! 🎉
              </div>
            ) : (
              delayedReviews.map((r) => renderReviewItem(r, false))
            )}
          </TabsContent>

          <TabsContent value="ignoradas" className="m-0 flex flex-col gap-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : ignoredReviews.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
                Nenhuma revisão ignorada.
              </div>
            ) : (
              ignoredReviews.map((r) => renderReviewItem(r, false))
            )}
          </TabsContent>

          <TabsContent value="concluidas" className="m-0 flex flex-col gap-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : completedReviews.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
                Revisões concluídas aparecerão aqui.
              </div>
            ) : (
              completedReviews.map((r) => renderReviewItem(r, false))
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
