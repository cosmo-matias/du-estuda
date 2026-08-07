"use client";

import { useState, useEffect } from "react";
import { Loader2, History, Target } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/contexts/PlanContext";
import { getSessionsByPlan } from "@/services/sessionService";
import type { StudySession } from "@/types";

export default function HistoricoPage() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { activePlan } = usePlan();

  useEffect(() => {
    let cancelled = false;
    async function fetchSessions() {
      if (!user || !activePlan) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await getSessionsByPlan(user.uid, activePlan.id);
        if (!cancelled) {
          setSessions(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        }
      } catch (err) {
        console.error("Erro ao carregar histórico:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchSessions();
    return () => { cancelled = true; };
  }, [user, activePlan]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!activePlan) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center p-6">
        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
          <Target className="h-6 w-6 text-slate-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Nenhum plano ativo</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            Selecione ou crie um plano de estudos no menu superior para visualizar o histórico de sessões.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <History className="h-8 w-8 text-indigo-600" /> Histórico
        </h1>
        <p className="text-muted-foreground mt-1">
          Registro completo das suas sessões de estudo para este plano.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {sessions.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-slate-500">
            Nenhuma sessão encontrada para este plano.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sessions.map((s) => (
              <div key={s.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                <div>
                  <div className="text-sm font-semibold text-slate-800">
                    {new Date(s.date).toLocaleDateString("pt-BR")}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {s.category}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-indigo-600">
                    {Math.round(s.durationInSeconds / 60)} min
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
