"use client";

import { useState, useCallback, useEffect } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2, Wand2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { saveCycleConfig } from "@/services/cycleService";
import { buildCycleConfig, cycleToHours } from "@/utils/cycleGenerator";
import type { CycleBlock, StudyCycleConfig } from "@/types";
import type { PlanSubjectWithDetails } from "@/services/planSubjectService";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DAYS_OF_WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

const BLOCK_DURATIONS = [
  { label: "30 min", value: 30  },
  { label: "45 min", value: 45  },
  { label: "1 h",    value: 60  },
  { label: "1h15",   value: 75  },
  { label: "1h30",   value: 90  },
  { label: "2 h",    value: 120 },
];

const DEFAULT_WEEKLY_HOURS = 20;
const DEFAULT_MIN_BLOCK    = 45;
const DEFAULT_MAX_BLOCK    = 90;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface CycleWizardProps {
  planId: string;
  subjects: PlanSubjectWithDetails[];
  open: boolean;
  onClose: () => void;
  /** Called with the freshly-generated cycle after save */
  onSaved: (config: StudyCycleConfig & { id: string }) => void;
}

// ---------------------------------------------------------------------------
// Step-indicator component
// ---------------------------------------------------------------------------
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i + 1 === current
              ? "w-8 bg-indigo-600"
              : i + 1 < current
              ? "w-2 bg-indigo-300"
              : "w-2 bg-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main wizard
// ---------------------------------------------------------------------------
export function CycleWizard({
  planId,
  subjects,
  open,
  onClose,
  onSaved,
}: CycleWizardProps) {
  const [step, setStep]     = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  // Custom block duration input state
  const [minIsCustom, setMinIsCustom] = useState(false);
  const [maxIsCustom, setMaxIsCustom] = useState(false);
  const [customMinInput, setCustomMinInput] = useState("");
  const [customMaxInput, setCustomMaxInput] = useState("");

  // Step 1 — selected subject IDs
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(subjects.map((s) => s.subjectId))
  );

  // Step 2 — importance weights (1–5 per subject)
  const [weights, setWeights] = useState<Record<string, number>>(
    () => Object.fromEntries(subjects.map((s) => [s.subjectId, s.weight || 3]))
  );

  // Step 3 — schedule parameters
  const [weeklyHours,   setWeeklyHours]   = useState(DEFAULT_WEEKLY_HOURS);
  const [selectedDays,  setSelectedDays]  = useState<number[]>([1, 2, 3, 4, 5]);
  const [minBlock,      setMinBlock]       = useState(DEFAULT_MIN_BLOCK);
  const [maxBlock,      setMaxBlock]       = useState(DEFAULT_MAX_BLOCK);

  // Step 3 — Editable cycle
  const [editableCycle, setEditableCycle] = useState<CycleBlock[]>([]);
  const [targetTotalTime, setTargetTotalTime] = useState(0);
  const [editingBlockIdx, setEditingBlockIdx] = useState<number | null>(null);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const selectedSubjects = subjects.filter((s) => selectedIds.has(s.subjectId));
  const totalWeight      = selectedSubjects.reduce(
    (sum, s) => sum + (weights[s.subjectId] ?? 3),
    0
  );

  function toggleSubject(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  const canAdvance = useCallback(() => {
    if (step === 1) return selectedIds.size > 0;
    if (step === 2) return selectedSubjects.length > 0;
    if (step === 3)
      return (
        weeklyHours > 0 &&
        selectedDays.length > 0 &&
        minBlock <= maxBlock
      );
    return false;
  }, [step, selectedIds, selectedSubjects, weeklyHours, selectedDays, minBlock, maxBlock]);

  // ---------------------------------------------------------------------------
  // Finish — generate & save
  // ---------------------------------------------------------------------------
  async function handleFinish() {
    setError("");
    setSaving(true);

    try {
      const subjectWeights = selectedSubjects.map((s) => ({
        subjectId: s.subjectId,
        weight:    weights[s.subjectId] ?? 3,
      }));

      const cycleInput = {
        planId,
        weeklyHours,
        minBlockMinutes: minBlock,
        maxBlockMinutes: maxBlock,
        subjectWeights,
        subjects: selectedSubjects,
      };

      const configPayload = buildCycleConfig(cycleInput, selectedDays);
      // Override with user's manual edits
      configPayload.cycleSequence = editableCycle;

      const saved = await saveCycleConfig(configPayload);
      onSaved(saved);
      onClose();
    } catch (err: unknown) {
      console.error("Erro ao salvar ciclo:", err);
      setError("Ocorreu um erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    // Reset wizard state on close
    setStep(1);
    setError("");
    onClose();
  }

  // ---------------------------------------------------------------------------
  // Preview (step 3)
  // ---------------------------------------------------------------------------
  const cycleDependencies = JSON.stringify({
    weeklyHours,
    minBlock,
    maxBlock,
    weights,
    selectedDays,
    ids: Array.from(selectedIds)
  });

  useEffect(() => {
    if (step === 3 && selectedSubjects.length > 0) {
      const generated = buildCycleConfig(
        {
          planId,
          weeklyHours,
          minBlockMinutes: minBlock,
          maxBlockMinutes: maxBlock,
          subjectWeights: selectedSubjects.map((s) => ({
            subjectId: s.subjectId,
            weight: weights[s.subjectId] ?? 3,
          })),
          subjects: selectedSubjects,
        },
        selectedDays
      ).cycleSequence;
      setEditableCycle(generated);
      const total = generated.reduce((acc, block) => acc + (block.durationMinutes ?? 0), 0);
      setTargetTotalTime(total);
      setEditingBlockIdx(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleDependencies, step]);

  const currentTotalTime = editableCycle.reduce((acc, block) => acc + (block.durationMinutes ?? 0), 0);
  const balance = currentTotalTime - targetTotalTime;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Wand2 className="h-5 w-5 text-indigo-600" />
            Criar Planejamento de Ciclo
          </DialogTitle>
        </DialogHeader>

        <StepIndicator current={step} total={3} />

        {/* ================================================================ */}
        {/* STEP 1 — Select subjects                                         */}
        {/* ================================================================ */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">
                Passo 1 de 3 — Selecione as Disciplinas
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Escolha as disciplinas que farão parte do ciclo.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {subjects.map((s) => {
                const selected = selectedIds.has(s.subjectId);
                return (
                  <button
                    key={s.subjectId}
                    type="button"
                    onClick={() => toggleSubject(s.subjectId)}
                    className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      selected
                        ? "border-indigo-500 bg-indigo-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span
                      className="h-4 w-4 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: s.subjectColor || "#6366f1" }}
                    />
                    <span className={`flex-1 text-sm font-medium ${selected ? "text-indigo-800" : "text-slate-700"}`}>
                      {s.subjectTitle}
                    </span>
                    {selected && (
                      <Check className="h-4 w-4 flex-shrink-0 text-indigo-600" />
                    )}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-slate-400">
              {selectedIds.size} disciplina{selectedIds.size !== 1 ? "s" : ""} selecionada{selectedIds.size !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 2 — Importance weights                                      */}
        {/* ================================================================ */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">
                Passo 2 de 3 — Defina a Importância
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Quanto maior a importância, mais blocos a disciplina recebe no ciclo.
              </p>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {selectedSubjects.map((s) => {
                const w     = weights[s.subjectId] ?? 3;
                const pct   = totalWeight > 0
                  ? Math.round((w / totalWeight) * 100)
                  : 0;

                return (
                  <div
                    key={s.subjectId}
                    className="rounded-xl border border-slate-200 bg-white p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: s.subjectColor || "#6366f1" }}
                        />
                        <span className="text-sm font-semibold text-slate-800">
                          {s.subjectTitle}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-indigo-600 tabular-nums">
                        {pct}%
                      </span>
                    </div>

                    {/* Weight buttons 1–5 */}
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() =>
                            setWeights((prev) => ({ ...prev, [s.subjectId]: v }))
                          }
                          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                            w === v
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>

                    {/* Mini progress bar */}
                    <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-1 rounded-full bg-indigo-500 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 3 — Schedule parameters + preview                           */}
        {/* ================================================================ */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-800">
                Passo 3 de 3 — Configure a Agenda
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Defina horas semanais, dias disponíveis e duração dos blocos.
              </p>
            </div>

            {/* Weekly hours */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Horas de estudo por semana
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="input-weekly-hours"
                  type="range"
                  min={1}
                  max={60}
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(Number(e.target.value))}
                  className="flex-1 accent-indigo-600"
                />
                <span className="w-16 rounded-lg border border-slate-200 bg-slate-50 py-1 text-center text-sm font-bold text-indigo-700 tabular-nums">
                  {weeklyHours}h
                </span>
              </div>
            </div>

            {/* Days of the week */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Dias disponíveis
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {DAYS_OF_WEEK.map((label, day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`flex-1 min-w-[38px] rounded-lg py-2 text-xs font-semibold transition-all ${
                      selectedDays.includes(day)
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "border border-slate-200 text-slate-500 hover:border-indigo-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Block durations */}
            <div className="grid grid-cols-2 gap-4">
              {/* --- Min block --- */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Bloco mínimo</label>
                <div className="flex flex-wrap gap-1.5">
                  {BLOCK_DURATIONS.map(({ label, value }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setMinIsCustom(false);
                        setMinBlock(value);
                        if (value > maxBlock) setMaxBlock(value);
                      }}
                      className={`rounded-lg px-2 py-1 text-xs font-medium transition-all ${
                        !minIsCustom && minBlock === value
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "border border-slate-200 text-slate-500 hover:border-emerald-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setMinIsCustom(true)}
                    className={`rounded-lg px-2 py-1 text-xs font-medium transition-all ${
                      minIsCustom
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "border border-slate-200 text-slate-500 hover:border-emerald-300"
                    }`}
                  >
                    Custom
                  </button>
                </div>
                {minIsCustom && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      type="number"
                      min={5}
                      max={240}
                      placeholder="min"
                      value={customMinInput}
                      onChange={(e) => {
                        setCustomMinInput(e.target.value);
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v) && v >= 5) {
                          setMinBlock(v);
                          if (v > maxBlock) setMaxBlock(v);
                        }
                      }}
                      className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-slate-400">min</span>
                  </div>
                )}
              </div>

              {/* --- Max block --- */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Bloco máximo</label>
                <div className="flex flex-wrap gap-1.5">
                  {BLOCK_DURATIONS.filter((d) => d.value >= minBlock).map(({ label, value }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => { setMaxIsCustom(false); setMaxBlock(value); }}
                      className={`rounded-lg px-2 py-1 text-xs font-medium transition-all ${
                        !maxIsCustom && maxBlock === value
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "border border-slate-200 text-slate-500 hover:border-indigo-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setMaxIsCustom(true)}
                    className={`rounded-lg px-2 py-1 text-xs font-medium transition-all ${
                      maxIsCustom
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "border border-slate-200 text-slate-500 hover:border-indigo-300"
                    }`}
                  >
                    Custom
                  </button>
                </div>
                {maxIsCustom && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      type="number"
                      min={minBlock}
                      max={480}
                      placeholder="max"
                      value={customMaxInput}
                      onChange={(e) => {
                        setCustomMaxInput(e.target.value);
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v) && v >= minBlock) setMaxBlock(v);
                      }}
                      className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-400">min</span>
                  </div>
                )}
              </div>
            </div>


            {/* Preview */}
            {editableCycle.length > 0 && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                    Pré-visualização do ciclo
                  </p>
                  <p className="text-sm text-indigo-800">
                    <span className="font-bold">{editableCycle.length}</span> blocos
                  </p>
                </div>

                {/* Painel de Saldo */}
                {(() => {
                  let alertClass = "bg-emerald-100 text-emerald-800 border-emerald-200";
                  let text = "Tempo perfeitamente distribuído";
                  if (balance < 0) {
                    alertClass = "bg-amber-100 text-amber-800 border-amber-200";
                    text = `Falta alocar ${Math.abs(balance)} min`;
                  } else if (balance > 0) {
                    alertClass = "bg-red-100 text-red-800 border-red-200";
                    text = `Ultrapassou ${balance} min da meta original`;
                  }
                  
                  return (
                    <div className={`text-xs font-medium px-3 py-2 rounded-lg border ${alertClass}`}>
                      {text}
                    </div>
                  );
                })()}

                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                  {editableCycle.map((block, idx) => {
                    const subj = subjects.find((s) => s.subjectId === block.subjectId);
                    return (
                      <div key={`${block.id}-${idx}`} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2 shadow-sm">
                        <div className="flex items-center gap-2">
                           <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: subj?.subjectColor || "#6366f1" }} />
                           <span className="text-xs font-semibold text-slate-700 truncate max-w-[150px] sm:max-w-[200px]">
                             {subj?.subjectTitle}
                           </span>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                           {editingBlockIdx === idx ? (
                             <input 
                               type="number"
                               autoFocus
                               defaultValue={block.durationMinutes}
                               onBlur={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (!isNaN(val) && val > 0) {
                                    setEditableCycle(prev => prev.map((b, i) => i === idx ? { ...b, durationMinutes: val } : b));
                                  }
                                  setEditingBlockIdx(null);
                               }}
                               onKeyDown={(e) => {
                                  if (e.key === 'Enter') e.currentTarget.blur();
                               }}
                               className="w-16 text-xs font-bold text-center border border-indigo-300 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                             />
                           ) : (
                             <span className="text-xs font-bold text-slate-600 min-w-[32px] text-right">
                               {block.durationMinutes}m
                             </span>
                           )}
                           
                           {editingBlockIdx !== idx && (
                             <button 
                               onClick={() => setEditingBlockIdx(idx)} 
                               className="text-slate-400 hover:text-indigo-600 p-1"
                               title="Editar duração"
                             >
                               <Pencil className="h-3.5 w-3.5" />
                             </button>
                           )}
                           {editingBlockIdx === idx && (
                             <div className="w-5" /> // spacer to keep layout from shifting
                           )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-red-500 rounded-lg bg-red-50 px-3 py-2 border border-red-100">
            {error}
          </p>
        )}

        {/* ================================================================ */}
        {/* Footer navigation                                                */}
        {/* ================================================================ */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (step === 1) handleClose();
              else setStep((prev) => (prev - 1) as 1 | 2 | 3);
            }}
            className="gap-1 text-slate-500"
          >
            <ChevronLeft className="h-4 w-4" />
            {step === 1 ? "Cancelar" : "Voltar"}
          </Button>

          {step < 3 ? (
            <Button
              size="sm"
              disabled={!canAdvance()}
              onClick={() => setStep((prev) => (prev + 1) as 2 | 3)}
              className="gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Avançar
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={!canAdvance() || saving}
              onClick={handleFinish}
              className="gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Concluir Planejamento
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
