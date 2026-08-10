"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ArrowRight,
  Play,
  Wand2,
  Clock,
  Settings2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/contexts/PlanContext";
import { getSubjectsByPlan } from "@/services/planSubjectService";
import { getCycleConfig } from "@/services/cycleService";
import type { PlanSubjectWithDetails } from "@/services/planSubjectService";
import type { CycleBlock, StudyCycleConfig } from "@/types";
import { generateStudyCycle, cycleToHours } from "@/utils/cycleGenerator";
import { Button } from "@/components/ui/button";
import { CycleWizard } from "@/components/planejamento/CycleWizard";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function PlanejamentoPage() {
  const router      = useRouter();
  const { user }    = useAuth();
  const { activePlan } = usePlan();

  const currentPos = activePlan?.currentCyclePosition ?? 0;

  const [subjects, setSubjects]         = useState<PlanSubjectWithDetails[]>([]);
  const [cycleConfig, setCycleConfig]   = useState<(StudyCycleConfig & { id: string }) | null>(null);
  const [loading, setLoading]           = useState(true);
  const [wizardOpen, setWizardOpen]     = useState(false);

  // Legacy round-robin cycle (used when no custom config exists yet)
  const [legacyCycle, setLegacyCycle]   = useState<PlanSubjectWithDetails[]>([]);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user || !activePlan) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [fetchedSubjects, savedConfig] = await Promise.all([
          getSubjectsByPlan(activePlan.id),
          getCycleConfig(activePlan.id),
        ]);

        if (!cancelled) {
          setSubjects(fetchedSubjects);
          setLegacyCycle(generateStudyCycle(fetchedSubjects));
          setCycleConfig(savedConfig);
        }
      } catch (err) {
        console.error("Erro ao carregar o ciclo:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user, activePlan]);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const hasCustomCycle = cycleConfig !== null && cycleConfig.cycleSequence.length > 0;

  // Map subjectId → PlanSubjectWithDetails for block rendering
  const subjectMap = new Map(subjects.map((s) => [s.subjectId, s]));

  // Blocks to render (custom OR legacy)
  const blocks: Array<{ id: string; subjectId: string; durationMinutes?: number; isLegacy: boolean }> =
    hasCustomCycle
      ? cycleConfig.cycleSequence.map((b: CycleBlock) => ({
          id:              b.id,
          subjectId:       b.subjectId,
          durationMinutes: b.durationMinutes,
          isLegacy:        false,
        }))
      : legacyCycle.map((ps, i) => ({
          id:        `legacy-${i}`,
          subjectId: ps.subjectId,
          isLegacy:  true,
        }));

  // ---------------------------------------------------------------------------
  // Guard renders
  // ---------------------------------------------------------------------------
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

  if (subjects.length === 0) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg text-slate-500">Seu plano não possui disciplinas.</p>
        <Button onClick={() => router.push(`/planos/detalhes?id=${activePlan.id}`)}>
          Adicionar Disciplinas
        </Button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full pb-12">

      {/* ------------------------------------------------------------------ */}
      {/* Page header                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 h-full w-1.5 bg-indigo-600" />
        <div className="flex flex-col pl-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Ciclo de Estudos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {hasCustomCycle ? (
              <>
                Ciclo personalizado ·{" "}
                <span className="font-semibold text-indigo-600">
                  {blocks.length} blocos
                </span>{" "}
                ·{" "}
                <span className="font-semibold text-indigo-600">
                  {cycleToHours(cycleConfig.cycleSequence)}h
                </span>{" "}
                de estudo ·{" "}
                {cycleConfig.selectedDays.length} dias/semana
              </>
            ) : (
              <>
                Esteira gerada automaticamente para{" "}
                <strong>{activePlan.title}</strong>
              </>
            )}
          </p>
        </div>

        {/* CTA button */}
        <div className="flex items-center gap-2 pl-4 sm:pl-0">
          {hasCustomCycle && (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-100">
              <Clock className="h-3.5 w-3.5" />
              {cycleConfig.weeklyHours}h/semana
            </span>
          )}
          <Button
            id="btn-criar-planejamento"
            onClick={() => setWizardOpen(true)}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            {hasCustomCycle ? (
              <>
                <Settings2 className="h-4 w-4" />
                Ajustar Ciclo
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                Criar Planejamento
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Blocks grid                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {blocks.map((block, index) => {
          const subj    = subjectMap.get(block.subjectId);
          const color   = subj?.subjectColor || "#6366f1";
          const isCurrent = index === currentPos;

          return (
            <div
              key={`${block.id}-${index}`}
              className={`flex flex-col justify-between rounded-xl border bg-white p-5 transition-all duration-500 ease-in-out relative overflow-hidden group ${
                isCurrent
                  ? "scale-105 shadow-xl ring-4 z-10 opacity-100"
                  : "scale-95 opacity-60 grayscale-[30%] shadow-sm hover:opacity-80 hover:grayscale-0"
              }`}
              style={{ borderColor: color }}
            >
              <div
                className={`absolute top-0 left-0 h-full w-1.5 opacity-70 transition-opacity duration-500 ${
                  isCurrent ? "opacity-100" : "group-hover:opacity-100"
                }`}
                style={{ backgroundColor: color }}
              />

              <div className="flex flex-col gap-3 pl-3">
                <div className="flex items-center justify-between">
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{
                      backgroundColor: isCurrent ? color : `${color}15`,
                      color:           isCurrent ? "#fff"  : color,
                    }}
                  >
                    Bloco {index + 1} {isCurrent && "(Atual)"}
                  </span>

                  {index < blocks.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-slate-300 hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 z-10" />
                  )}
                </div>

                <h3 className="font-semibold text-slate-800 line-clamp-2">
                  {subj?.subjectTitle ?? "Disciplina"}
                </h3>
              </div>

              <div className="mt-4 pl-3 pt-3 flex items-center justify-between border-t border-slate-100">
                <span className="text-xs font-medium text-slate-500">
                  {block.durationMinutes
                    ? formatMinutes(block.durationMinutes)
                    : `Peso ${subj?.weight ?? "—"}`}
                </span>
                <Button
                  size="sm"
                  variant={isCurrent ? "default" : "ghost"}
                  className={`h-8 px-2 ${
                    isCurrent
                      ? "text-white"
                      : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                  }`}
                  style={isCurrent ? { backgroundColor: color } : {}}
                  onClick={() =>
                    router.push(
                      `/cronometro?subjectId=${block.subjectId}&cycleIndex=${index}&cycleLength=${blocks.length}`
                    )
                  }
                  title="Estudar agora"
                >
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Wizard Modal                                                        */}
      {/* ------------------------------------------------------------------ */}
      <CycleWizard
        planId={activePlan.id}
        subjects={subjects}
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSaved={(saved) => {
          setCycleConfig(saved);
          setWizardOpen(false);
        }}
      />
    </div>
  );
}
