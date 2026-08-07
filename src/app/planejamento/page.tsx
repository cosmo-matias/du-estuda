"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, Play } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/contexts/PlanContext";
import { getSubjectsByPlan } from "@/services/planSubjectService";
import type { PlanSubjectWithDetails } from "@/services/planSubjectService";
import { generateStudyCycle } from "@/utils/cycleGenerator";
import { Button } from "@/components/ui/button";

export default function PlanejamentoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { activePlan } = usePlan();
  
  const [subjects, setSubjects] = useState<PlanSubjectWithDetails[]>([]);
  const [cycle, setCycle] = useState<PlanSubjectWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadCycle() {
      if (!user || !activePlan) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const fetchedSubjects = await getSubjectsByPlan(activePlan.id);
        
        if (!cancelled) {
          setSubjects(fetchedSubjects);
          setCycle(generateStudyCycle(fetchedSubjects));
        }
      } catch (err) {
        console.error("Erro ao carregar o ciclo:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCycle();
    return () => {
      cancelled = true;
    };
  }, [user, activePlan]);

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

  if (subjects.length === 0) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg text-slate-500">
          Seu plano não possui disciplinas.
        </p>
        <Button onClick={() => router.push(`/planos/detalhes?id=${activePlan.id}`)}>
          Adicionar Disciplinas
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 h-full w-1.5 bg-indigo-600" />
        <div className="flex flex-col pl-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Ciclo de Estudos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Esteira gerada automaticamente com base nos pesos das disciplinas do plano <strong>{activePlan.title}</strong>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {cycle.map((item, index) => {
          const color = item.subjectColor || "#6366f1";
          return (
            <div
              key={`${item.id}-${index}`}
              className="flex flex-col justify-between rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-md relative overflow-hidden group"
              style={{ borderColor: color }}
            >
              <div 
                className="absolute top-0 left-0 h-full w-1.5 opacity-70 group-hover:opacity-100 transition-opacity" 
                style={{ backgroundColor: color }} 
              />
              
              <div className="flex flex-col gap-3 pl-3">
                <div className="flex items-center justify-between">
                  <span 
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: `${color}15`, color: color }}
                  >
                    Bloco {index + 1}
                  </span>
                  
                  {index < cycle.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-slate-300 hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 z-10" />
                  )}
                </div>
                
                <h3 className="font-semibold text-slate-800 line-clamp-2">
                  {item.subjectTitle}
                </h3>
              </div>
              
              <div className="mt-4 pl-3 pt-3 flex items-center justify-between border-t border-slate-100">
                <span className="text-xs font-medium text-slate-500">
                  Peso {item.weight}
                </span>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 px-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                  onClick={() => router.push(`/cronometro?subjectId=${item.subjectId}`)}
                  title="Estudar agora"
                >
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
