"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Play,
  Wand2,
  Settings2,
  Trash2,
  RotateCcw,
  GripVertical,
  Clock,
  TrendingUp,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/contexts/PlanContext";
import { getSubjectsByPlan } from "@/services/planSubjectService";
import {
  getCycleConfig,
  deleteCycleConfig,
  updateCycleSequence,
} from "@/services/cycleService";
import { updatePlan } from "@/services/studyPlanService";
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
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function totalCycleMinutes(blocks: DisplayBlock[]): number {
  return blocks.reduce((s, b) => s + (b.durationMinutes ?? 0), 0);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DisplayBlock {
  id: string;
  subjectId: string;
  durationMinutes?: number;
  isLegacy: boolean;
}

// ---------------------------------------------------------------------------
// Donut Chart component (SVG-based via Recharts)
// ---------------------------------------------------------------------------
interface DonutChartProps {
  blocks: DisplayBlock[];
  subjectMap: Map<string, PlanSubjectWithDetails>;
  totalHours: number;
}

function DonutChart({ blocks, subjectMap, totalHours }: DonutChartProps) {
  // Aggregate minutes per subject
  const minutesBySubject = new Map<string, number>();
  for (const b of blocks) {
    const prev = minutesBySubject.get(b.subjectId) ?? 0;
    minutesBySubject.set(b.subjectId, prev + (b.durationMinutes ?? 60));
  }

  const data = Array.from(minutesBySubject.entries()).map(([subjectId, minutes]) => ({
    subjectId,
    minutes,
    name: subjectMap.get(subjectId)?.subjectTitle ?? "—",
    color: subjectMap.get(subjectId)?.subjectColor ?? "#6366f1",
  }));

  const totalMin = data.reduce((s, d) => s + d.minutes, 0);
  const displayH  = Math.floor(totalHours);
  const displayM  = Math.round((totalHours - displayH) * 60);
  const centerText = displayM === 0
    ? `${displayH}h`
    : `${displayH}h${String(displayM).padStart(2, "0")}min`;

  return (
    <div className="relative flex items-center justify-center">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={75}
            outerRadius={115}
            paddingAngle={2}
            dataKey="minutes"
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => {
              const minutes = typeof value === "number" ? value : 0;
              return [
                `${formatMinutes(minutes)} (${Math.round((minutes / totalMin) * 100)}%)`,
                name,
              ] as [string, string];
            }}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center label */}
      <div className="absolute flex flex-col items-center pointer-events-none">
        <span className="text-2xl font-black text-slate-800 tabular-nums leading-tight">
          {centerText}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-0.5">
          / semana
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Draggable list item
// ---------------------------------------------------------------------------
interface DraggableBlockProps {
  block: DisplayBlock;
  index: number;
  isCurrent: boolean;
  subject: PlanSubjectWithDetails | undefined;
  onDragStart: (i: number) => void;
  onDragOver: (i: number) => void;
  onDrop: () => void;
  onPlay: () => void;
  totalBlocks: number;
}

function DraggableBlock({
  block,
  index,
  isCurrent,
  subject,
  onDragStart,
  onDragOver,
  onDrop,
  onPlay,
  totalBlocks,
}: DraggableBlockProps) {
  const color = subject?.subjectColor ?? "#6366f1";

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3 transition-all duration-200 cursor-grab active:cursor-grabbing select-none ${
        isCurrent
          ? "border-indigo-300 shadow-md ring-2 ring-indigo-100"
          : "border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300"
      }`}
    >
      {/* Color stripe */}
      <div
        className="w-1 self-stretch rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />

      {/* Drag handle */}
      <GripVertical className="h-4 w-4 text-slate-300 flex-shrink-0" />

      {/* Block number */}
      <span
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
        style={{
          backgroundColor: isCurrent ? color : `${color}18`,
          color:            isCurrent ? "#fff" : color,
        }}
      >
        {index + 1}
      </span>

      {/* Subject info */}
      <div className="flex-1 min-w-0">
        <p className={`truncate text-sm font-semibold ${isCurrent ? "text-indigo-800" : "text-slate-800"}`}>
          {subject?.subjectTitle ?? "Disciplina"}
        </p>
        {block.durationMinutes && (
          <p className="text-[11px] text-slate-400 tabular-nums">
            0min / {block.durationMinutes}min
          </p>
        )}
      </div>

      {/* Current badge */}
      {isCurrent && (
        <span className="hidden sm:inline-flex items-center rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white flex-shrink-0">
          Atual
        </span>
      )}

      {/* Play button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onPlay(); }}
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all ${
          isCurrent
            ? "text-white shadow-sm"
            : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
        }`}
        style={isCurrent ? { backgroundColor: color } : {}}
        title="Estudar agora"
      >
        <Play className="h-3.5 w-3.5 fill-current" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function PlanejamentoPage() {
  const router         = useRouter();
  const { user }       = useAuth();
  const { activePlan, setActivePlan } = usePlan();

  const currentPos = activePlan?.currentCyclePosition ?? 0;

  const [subjects, setSubjects]       = useState<PlanSubjectWithDetails[]>([]);
  const [cycleConfig, setCycleConfig] = useState<(StudyCycleConfig & { id: string }) | null>(null);
  const [loading, setLoading]         = useState(true);
  const [wizardOpen, setWizardOpen]   = useState(false);
  const [deleting, setDeleting]       = useState(false);

  // Drag-and-drop state
  const dragIndexRef = useRef<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Legacy round-robin cycle (used when no custom config exists yet)
  const [legacyCycle, setLegacyCycle] = useState<PlanSubjectWithDetails[]>([]);

  // Local mutable blocks (supports reordering)
  const [localBlocks, setLocalBlocks] = useState<DisplayBlock[]>([]);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user || !activePlan) { setLoading(false); return; }
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

  // Sync localBlocks whenever cycleConfig or legacyCycle changes
  useEffect(() => {
    const hasCustom = cycleConfig !== null && cycleConfig.cycleSequence.length > 0;
    const blocks: DisplayBlock[] = hasCustom
      ? cycleConfig.cycleSequence.map((b: CycleBlock) => ({
          id: b.id, subjectId: b.subjectId,
          durationMinutes: b.durationMinutes, isLegacy: false,
        }))
      : legacyCycle.map((ps, i) => ({
          id: `legacy-${i}`, subjectId: ps.subjectId, isLegacy: true,
        }));
    setLocalBlocks(blocks);
  }, [cycleConfig, legacyCycle]);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------
  const subjectMap = new Map(subjects.map((s) => [s.subjectId, s]));
  const hasCustomCycle = cycleConfig !== null && cycleConfig.cycleSequence.length > 0;
  const totalMins  = totalCycleMinutes(localBlocks);
  const totalHours = cycleToHours(
    localBlocks.map((b) => ({
      id: b.id, subjectId: b.subjectId,
      durationMinutes: b.durationMinutes ?? 0, completed: false,
    }))
  );

  // Completed blocks (currentPos acts as "how many have been studied")
  const completedCount = currentPos;
  const progressPct = localBlocks.length > 0
    ? Math.round((completedCount / localBlocks.length) * 100)
    : 0;

  // ---------------------------------------------------------------------------
  // Drag-and-drop handlers
  // ---------------------------------------------------------------------------
  const handleDragStart = useCallback((i: number) => {
    dragIndexRef.current = i;
  }, []);

  const handleDragOver = useCallback((i: number) => {
    setHoverIndex(i);
  }, []);

  const handleDrop = useCallback(async () => {
    const from = dragIndexRef.current;
    const to   = hoverIndex;
    if (from === null || to === null || from === to) {
      dragIndexRef.current = null;
      setHoverIndex(null);
      return;
    }

    setLocalBlocks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      // Persist reorder to Firestore (fire-and-forget)
      if (activePlan && hasCustomCycle) {
        const newSeq = next.map((b) => ({
          id: b.id, subjectId: b.subjectId,
          durationMinutes: b.durationMinutes ?? 0, completed: false,
        }));
        updateCycleSequence(activePlan.id, newSeq).catch(console.error);
      }
      return next;
    });

    dragIndexRef.current = null;
    setHoverIndex(null);
  }, [hoverIndex, activePlan, hasCustomCycle]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  async function handleRestart() {
    if (!activePlan) return;
    try {
      await updatePlan(activePlan.id, { currentCyclePosition: 0 });
      setActivePlan({ ...activePlan, currentCyclePosition: 0 });
    } catch (err) { console.error(err); }
  }

  async function handleDeleteCycle() {
    if (!activePlan) return;
    setDeleting(true);
    try {
      await deleteCycleConfig(activePlan.id);
      setCycleConfig(null);
    } catch (err) { console.error(err); }
    finally { setDeleting(false); }
  }

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
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-12">

      {/* ================================================================ */}
      {/* TOP HEADER — metrics + action buttons                            */}
      {/* ================================================================ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left — plan title + quick metrics */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Ciclo de Estudos
          </h1>
          <p className="text-sm text-slate-500">
            Plano{" "}
            <span className="font-semibold text-slate-700">{activePlan.title}</span>
            {" · "}
            {localBlocks.length} bloco{localBlocks.length !== 1 ? "s" : ""}
            {hasCustomCycle && (
              <> · {cycleConfig!.weeklyHours}h/semana · {cycleConfig!.selectedDays.length} dias</>
            )}
          </p>
        </div>

        {/* Right — action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-slate-600"
            onClick={handleRestart}
            title="Reiniciar ciclo do bloco 1"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Recomeçar
          </Button>
          <Button
            size="sm"
            onClick={() => setWizardOpen(true)}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {hasCustomCycle ? (
              <><Settings2 className="h-3.5 w-3.5" /> Ajustar Ciclo</>
            ) : (
              <><Wand2 className="h-3.5 w-3.5" /> Criar Planejamento</>
            )}
          </Button>
          {hasCustomCycle && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={handleDeleteCycle}
              disabled={deleting}
              title="Remover ciclo personalizado"
            >
              {deleting
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Trash2 className="h-3.5 w-3.5" />}
              Remover
            </Button>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* METRICS ROW                                                       */}
      {/* ================================================================ */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Ciclos Completos */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm gap-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 ring-4 ring-indigo-100">
            <span className="text-lg font-black text-indigo-700 tabular-nums">
              {Math.floor(completedCount / Math.max(1, localBlocks.length))}
            </span>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 text-center mt-1">
            Ciclos Completos
          </p>
        </div>

        {/* Bloco Atual */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm gap-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 ring-4 ring-emerald-100">
            <span className="text-lg font-black text-emerald-700 tabular-nums">
              {Math.min(currentPos + 1, localBlocks.length)}
            </span>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 text-center mt-1">
            Bloco Atual
          </p>
        </div>

        {/* Tempo Total */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm gap-1">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="text-lg font-black text-amber-700 tabular-nums">
              {totalMins > 0 ? formatMinutes(totalMins) : "—"}
            </span>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 text-center mt-1">
            Carga do Ciclo
          </p>
        </div>

        {/* Progresso */}
        <div className="col-span-2 sm:col-span-1 flex flex-col justify-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Progresso
              </span>
            </div>
            <span className="text-sm font-black text-indigo-700 tabular-nums">{progressPct}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-2.5 rounded-full bg-indigo-500 transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 tabular-nums">
            {completedCount} / {localBlocks.length} blocos concluídos
          </p>
        </div>
      </div>

      {/* ================================================================ */}
      {/* MAIN SPLIT LAYOUT                                                 */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

        {/* ============================================================== */}
        {/* LEFT — Draggable study sequence (7 cols)                        */}
        {/* ============================================================== */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Sequência dos Estudos
            </h2>
            {hasCustomCycle && (
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <GripVertical className="h-3 w-3" /> Arraste para reordenar
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {localBlocks.map((block, index) => (
              <div
                key={block.id}
                className={`transition-transform duration-150 ${
                  hoverIndex === index && dragIndexRef.current !== index
                    ? "translate-y-1 opacity-70"
                    : ""
                }`}
              >
                <DraggableBlock
                  block={block}
                  index={index}
                  isCurrent={index === currentPos}
                  subject={subjectMap.get(block.subjectId)}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onPlay={() =>
                    router.push(
                      `/cronometro?subjectId=${block.subjectId}&cycleIndex=${index}&cycleLength=${localBlocks.length}`
                    )
                  }
                  totalBlocks={localBlocks.length}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT — Donut chart (5 cols)                                    */}
        {/* ============================================================== */}
        <div className="lg:col-span-5">
          <div className="sticky top-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Ciclo
            </h2>

            <DonutChart
              blocks={localBlocks}
              subjectMap={subjectMap}
              totalHours={totalHours}
            />

            {/* Legend */}
            <div className="flex flex-col gap-2 mt-1">
              {(() => {
                const minutesBySubject = new Map<string, number>();
                for (const b of localBlocks) {
                  const prev = minutesBySubject.get(b.subjectId) ?? 0;
                  minutesBySubject.set(b.subjectId, prev + (b.durationMinutes ?? 60));
                }
                const total = Array.from(minutesBySubject.values()).reduce((s, m) => s + m, 0);
                return Array.from(minutesBySubject.entries()).map(([subjectId, minutes]) => {
                  const subj = subjectMap.get(subjectId);
                  const pct  = total > 0 ? Math.round((minutes / total) * 100) : 0;
                  return (
                    <div key={subjectId} className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: subj?.subjectColor ?? "#6366f1" }}
                      />
                      <span className="flex-1 truncate text-xs text-slate-700">{subj?.subjectTitle ?? "—"}</span>
                      <span className="text-xs font-semibold text-slate-500 tabular-nums">
                        {formatMinutes(minutes)} · {pct}%
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* Wizard Modal                                                      */}
      {/* ================================================================ */}
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
