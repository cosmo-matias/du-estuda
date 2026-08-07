"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Play, Pause, Square, RotateCcw, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { addStudySession } from "@/services/sessionService";
import { updatePlan } from "@/services/studyPlanService";
import { addReview } from "@/services/reviewService";
import { getSubjectsByPlan } from "@/services/planSubjectService";
import { getTopicsBySubject } from "@/services/topicService";
import type { Topic, StudyCategory } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/contexts/PlanContext";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES: StudyCategory[] = [
  "Teoria",
  "Questões",
  "Revisão",
  "Leitura de Lei",
];

/** Pomodoro duration options in minutes */
const POMODORO_DURATIONS = [25, 30, 50] as const;

/** Placeholder until authentication is implemented */
const PLACEHOLDER_USER_ID = "user-placeholder-123";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type TimerMode  = "free" | "pomodoro";
type TimerState = "idle" | "running" | "paused";

// ---------------------------------------------------------------------------
// Helper — format seconds as HH:MM:SS
// ---------------------------------------------------------------------------
function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

// ---------------------------------------------------------------------------
// Helper — parse a string input to a positive integer, or return undefined.
// Guards against empty strings, NaN, and negative values.
// ---------------------------------------------------------------------------
function safeInt(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) return undefined;
  return parsed;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function CronometroPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    }>
      <CronometroContent />
    </Suspense>
  );
}

function CronometroContent() {
  const searchParams = useSearchParams();
  const querySubjectId = searchParams.get("subjectId");
  const queryCycleIndex = searchParams.get("cycleIndex");
  const queryCycleLength = searchParams.get("cycleLength");
  
  const { user }                              = useAuth();
  const { activePlan, setActivePlan }         = usePlan();

  // ---------------------------------------------------------------------- //
  // Mode & Pomodoro settings                                                //
  // ---------------------------------------------------------------------- //
  const [mode, setMode]                       = useState<TimerMode>("free");
  const [pomodoroDuration, setPomodoroDuration] = useState<number>(25);

  // ---------------------------------------------------------------------- //
  // Timer                                                                   //
  // ---------------------------------------------------------------------- //
  const [timerState, setTimerState]   = useState<TimerState>("idle");
  const [elapsedSeconds, setElapsed]  = useState(0);
  const intervalRef                   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---------------------------------------------------------------------- //
  // Context selectors                                                       //
  // ---------------------------------------------------------------------- //
  const [selectedSubject, setSelectedSubject]   = useState<string>("");
  const [selectedTopic, setSelectedTopic]       = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // ---------------------------------------------------------------------- //
  // Firestore data                                                          //
  // ---------------------------------------------------------------------- //
  const [subjects, setSubjects]           = useState<{id: string; title: string}[]>([]);
  const [topics, setTopics]               = useState<Topic[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingTopics, setLoadingTopics]     = useState(false);

  // ---------------------------------------------------------------------- //
  // Session dialog                                                          //
  // ---------------------------------------------------------------------- //
  const [isDialogOpen, setIsDialogOpen]           = useState(false);
  const [questionsTotal, setQuestionsTotal]       = useState("");
  const [questionsCorrect, setQuestionsCorrect]   = useState("");
  const [pagesRead, setPagesRead]                 = useState("");
  const [notes, setNotes]                         = useState("");
  const [saving, setSaving]                       = useState(false);
  const [saveError, setSaveError]                 = useState("");

  // ---------------------------------------------------------------------- //
  // Derived values                                                          //
  // ---------------------------------------------------------------------- //
  const pomodoroTotalSec = pomodoroDuration * 60;

  /** Seconds shown on the clock face */
  const displaySeconds =
    mode === "free"
      ? elapsedSeconds
      : Math.max(0, pomodoroTotalSec - elapsedSeconds);

  const subjectLabel =
    subjects.find((s) => s.id === selectedSubject)?.title ??
    "Não selecionada";

  const pomodoroProgress =
    pomodoroTotalSec > 0
      ? Math.min(100, Math.round((elapsedSeconds / pomodoroTotalSec) * 100))
      : 0;

  // ---------------------------------------------------------------------- //
  // Timer interval — increments elapsedSeconds every second when running   //
  // ---------------------------------------------------------------------- //
  useEffect(() => {
    if (timerState === "running") {
      intervalRef.current = setInterval(
        () => setElapsed((prev) => prev + 1),
        1000
      );
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerState]);

  // Auto-finish Pomodoro when time runs out
  useEffect(() => {
    if (
      mode === "pomodoro" &&
      timerState === "running" &&
      elapsedSeconds >= pomodoroTotalSec
    ) {
      setTimerState("paused");
      openSessionDialog();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSeconds, mode, timerState, pomodoroTotalSec]);

  // ---------------------------------------------------------------------- //
  // Load subjects from Firestore on mount                                   //
  // ---------------------------------------------------------------------- //
  useEffect(() => {
    let cancelled = false;

    async function fetchSubjects() {
      if (!user || !activePlan) {
        setSubjects([]);
        return;
      }
      try {
        setLoadingSubjects(true);
        const data = await getSubjectsByPlan(activePlan.id);
        if (!cancelled) {
          setSubjects(data.map(ps => ({ id: ps.subjectId, title: ps.subjectTitle })));
        }
      } catch (err) {
        console.error("Erro ao carregar disciplinas:", err);
      } finally {
        if (!cancelled) setLoadingSubjects(false);
      }
    }

    fetchSubjects();
    return () => { cancelled = true; };
  }, [user, activePlan]);

  // ---------------------------------------------------------------------- //
  // Auto-select subject from URL parameters                                 //
  // ---------------------------------------------------------------------- //
  useEffect(() => {
    if (querySubjectId && subjects.length > 0) {
      const exists = subjects.find((s) => s.id === querySubjectId);
      if (exists && !selectedSubject) {
        setSelectedSubject(querySubjectId);
      }
    }
  }, [querySubjectId, subjects, selectedSubject]);

  // ---------------------------------------------------------------------- //
  // Load topics from Firestore when selected subject changes                //
  // ---------------------------------------------------------------------- //
  useEffect(() => {
    if (!selectedSubject) {
      setTopics([]);
      return;
    }

    let cancelled = false;

    async function fetchTopics() {
      try {
        setLoadingTopics(true);
        const data = await getTopicsBySubject(selectedSubject);
        if (!cancelled) setTopics(data);
      } catch (err) {
        console.error("Erro ao carregar tópicos:", err);
      } finally {
        if (!cancelled) setLoadingTopics(false);
      }
    }

    fetchTopics();
    return () => { cancelled = true; };
  }, [selectedSubject]);

  // ---------------------------------------------------------------------- //
  // Control handlers                                                        //
  // ---------------------------------------------------------------------- //
  function handlePlay()  { setTimerState("running"); }
  function handlePause() { setTimerState("paused");  }

  function handleStop() {
    setTimerState("paused");
    if (elapsedSeconds > 0) {
      openSessionDialog();
    } else {
      resetTimer();
    }
  }

  function resetTimer() {
    setTimerState("idle");
    setElapsed(0);
  }

  // ---------------------------------------------------------------------- //
  // Mode switching (only when timer is idle)                                //
  // ---------------------------------------------------------------------- //
  function handleModeChange(value: string | null) {
    if (!value || timerState !== "idle") return;
    setMode(value as TimerMode);
    setElapsed(0);
  }

  function handlePomodoroDuration(minutes: number) {
    if (timerState !== "idle") return;
    setPomodoroDuration(minutes);
    setElapsed(0);
  }

  // ---------------------------------------------------------------------- //
  // Session dialog helpers                                                  //
  // ---------------------------------------------------------------------- //
  function openSessionDialog() {
    setQuestionsTotal("");
    setQuestionsCorrect("");
    setPagesRead("");
    setNotes("");
    setSaveError("");
    setIsDialogOpen(true);
  }

  function handleDiscardSession() {
    setIsDialogOpen(false);
    resetTimer();
  }

  async function handleSaveSession() {
    if (!selectedSubject) {
      setSaveError("Erro: Selecione uma disciplina antes de salvar a sessão.");
      return;
    }

    try {
      setSaving(true);
      setSaveError("");

      const sessionPayload = {
        userId:            user!.uid,
        planId:            activePlan!.id,
        subjectId:         selectedSubject,
        topicId:           selectedTopic || undefined,
        date:              new Date(),
        durationInSeconds: elapsedSeconds,
        category:          (selectedCategory as StudyCategory) || "Teoria",
        questionsTotal:    safeInt(questionsTotal),
        questionsCorrect:  safeInt(questionsCorrect),
        pagesRead:         safeInt(pagesRead),
        notes:             notes.trim() || undefined,
      };

      await addStudySession(sessionPayload);

      if (queryCycleIndex && queryCycleLength && activePlan) {
        const cIndex = parseInt(queryCycleIndex, 10);
        const cLength = parseInt(queryCycleLength, 10);
        if (!isNaN(cIndex) && !isNaN(cLength) && cLength > 0) {
          const nextPos = (cIndex + 1) % cLength;
          await updatePlan(activePlan.id, { currentCyclePosition: nextPos });
          // Update the local context so it reflects immediately on navigation
          setActivePlan({ ...activePlan, currentCyclePosition: nextPos });
        }
      }

      // -------------------------------------------------------------
      // Agendamento Automático de Revisão (24h)
      // -------------------------------------------------------------
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      await addReview({
        userId: user!.uid,
        planId: activePlan!.id,
        subjectId: selectedSubject,
        scheduledDate: tomorrow.toISOString(),
        completed: false,
        step: 1
      });

      setIsDialogOpen(false);
      resetTimer();
    } catch (err: any) {
      console.error("Erro original ao salvar sessão no Firestore:", err);
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
      setSaveError(`Falha ao salvar: ${errorMessage}`);
      // Fallback de alerta nativo para evitar falha completamente silenciosa caso o erro não seja visto na UI
      alert(`Erro crítico ao salvar a sessão: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------------- //
  // Render                                                                  //
  // ---------------------------------------------------------------------- //
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-8 py-12">

      {/* ------------------------------------------------------------------ */}
      {/* Mode tabs — disabled while timer is active                         */}
      {/* ------------------------------------------------------------------ */}
      <Tabs
        value={mode}
        onValueChange={handleModeChange}
        className="w-full max-w-2xl"
      >
        <TabsList className="w-full">
          <TabsTrigger
            value="free"
            disabled={timerState !== "idle"}
            className="flex-1"
          >
            ⏱ Modo Livre
          </TabsTrigger>
          <TabsTrigger
            value="pomodoro"
            disabled={timerState !== "idle"}
            className="flex-1"
          >
            🍅 Pomodoro
          </TabsTrigger>
        </TabsList>

        {/* Pomodoro duration picker — only visible in pomodoro mode */}
        <TabsContent value="pomodoro" className="mt-4">
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-slate-500">Tempo de foco:</span>
            {POMODORO_DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handlePomodoroDuration(d)}
                disabled={timerState !== "idle"}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors
                  ${
                    pomodoroDuration === d
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "border bg-white text-slate-600 hover:bg-slate-50"
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {d} min
              </button>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ------------------------------------------------------------------ */}
      {/* Context selectors                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex w-full max-w-2xl flex-col items-center gap-3">
        <p className="text-sm font-medium uppercase tracking-widest text-slate-400">
          O que você está estudando agora?
        </p>

        {/* Row 1 — Disciplina + Categoria */}
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <Select
            value={selectedSubject}
            onValueChange={(v) => {
              if (!v) return;
              setSelectedSubject(v);
              setSelectedTopic("");
            }}
          >
            <SelectTrigger id="select-disciplina" className="flex-1 bg-white">
              <SelectValue placeholder="Selecione a disciplina…">
                {/* Explicit title — prevents Base UI from falling back to the raw ID
                    when subjects are still loading (async Firestore fetch). */}
                {selectedSubject
                  ? (subjects.find((s) => s.id === selectedSubject)?.title ?? undefined)
                  : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {loadingSubjects ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                </div>
              ) : subjects.length === 0 ? (
                <div className="py-3 text-center text-xs text-slate-400">
                  Nenhuma disciplina cadastrada no plano.
                </div>
              ) : (
                subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <Select
            value={selectedCategory}
            onValueChange={(v) => { if (v) setSelectedCategory(v); }}
          >
            <SelectTrigger id="select-categoria" className="flex-1 bg-white">
              <SelectValue placeholder="Tipo de atividade…" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Row 2 — Tópico */}
        <Select
          value={selectedTopic}
          onValueChange={(v) => { if (v) setSelectedTopic(v); }}
          disabled={!selectedSubject || loadingTopics}
        >
          <SelectTrigger id="select-topico" className="w-full bg-white">
            <SelectValue
              placeholder={
                !selectedSubject
                  ? "Selecione uma disciplina primeiro…"
                  : loadingTopics
                  ? "Carregando tópicos…"
                  : "Selecione o tópico (opcional)…"
              }
            >
              {/* Explicit title — same reason as Disciplina above. */}
              {selectedTopic
                ? (topics.find((t) => t.id === selectedTopic)?.title ?? undefined)
                : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {loadingTopics ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            ) : topics.length === 0 ? (
              <div className="py-3 text-center text-xs text-slate-400">
                {selectedSubject
                  ? "Nenhum tópico cadastrado nesta disciplina."
                  : "Selecione uma disciplina primeiro."}
              </div>
            ) : (
              topics.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.title}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <Separator className="w-full max-w-2xl" />

      {/* ------------------------------------------------------------------ */}
      {/* Clock display                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col items-center gap-4">
        {/* Status pill */}
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest transition-colors ${
            timerState === "running"
              ? "bg-emerald-100 text-emerald-700"
              : timerState === "paused"
              ? "bg-amber-100 text-amber-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {timerState === "running"
            ? "● Em andamento"
            : timerState === "paused"
            ? "⏸ Pausado"
            : "Pronto para iniciar"}
        </span>

        {/* Giant clock */}
        <div
          className={`select-none font-mono text-8xl font-bold tabular-nums tracking-tight transition-colors md:text-9xl ${
            timerState === "running"
              ? "text-slate-800"
              : timerState === "paused"
              ? "text-amber-500"
              : "text-slate-300"
          }`}
          aria-label="Cronômetro"
          aria-live="polite"
        >
          {formatTime(displaySeconds)}
        </div>

        {/* Pomodoro progress bar */}
        {mode === "pomodoro" && timerState !== "idle" && (
          <div className="w-full max-w-sm space-y-1">
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-emerald-500 transition-all duration-1000"
                style={{ width: `${pomodoroProgress}%` }}
                role="progressbar"
                aria-valuenow={pomodoroProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <p className="text-center text-xs text-slate-400">
              {pomodoroProgress}% concluído
            </p>
          </div>
        )}
      </div>

      <Separator className="w-full max-w-2xl" />

      {/* ------------------------------------------------------------------ */}
      {/* Controls                                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center gap-6">
        {/* Stop / Finalizar */}
        <Button
          id="btn-stop-timer"
          variant="outline"
          size="lg"
          disabled={timerState === "idle"}
          onClick={handleStop}
          className="h-14 w-14 rounded-full border-2 border-red-200 text-red-400 hover:border-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-25"
          aria-label="Finalizar e salvar sessão"
        >
          <Square className="h-6 w-6 fill-current" />
        </Button>

        {/* Play / Pause — the primary action */}
        {timerState === "running" ? (
          <Button
            id="btn-pause-timer"
            size="lg"
            onClick={handlePause}
            className="h-20 w-20 rounded-full bg-amber-500 text-white shadow-lg shadow-amber-200 hover:bg-amber-600"
            aria-label="Pausar cronômetro"
          >
            <Pause className="h-8 w-8 fill-current" />
          </Button>
        ) : (
          <Button
            id="btn-play-timer"
            size="lg"
            onClick={handlePlay}
            className="h-20 w-20 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600"
            aria-label="Iniciar cronômetro"
          >
            <Play className="h-8 w-8 fill-current" />
          </Button>
        )}

        {/* Reset (active only when there's elapsed time and timer is not running) */}
        <Button
          id="btn-reset-timer"
          variant="ghost"
          size="lg"
          onClick={resetTimer}
          disabled={elapsedSeconds === 0 || timerState === "running"}
          className="h-14 w-14 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-25"
          aria-label="Resetar cronômetro"
        >
          <RotateCcw className="h-5 w-5" />
        </Button>
      </div>

      {/* Hint text */}
      <p className="text-xs text-slate-400">
        {timerState === "idle"
          ? "Selecione a disciplina e pressione Play para começar."
          : timerState === "running"
          ? "Foco total! Pressione Pause para interromper ou Stop (■) para finalizar e salvar a sessão."
          : "Sessão pausada. Pressione Play para continuar ou Stop (■) para salvar."}
      </p>

      {/* ------------------------------------------------------------------ */}
      {/* Session registration Dialog                                         */}
      {/* Controlled — no DialogTrigger (Base UI limitation, same pattern     */}
      {/* used in SubjectCard).                                               */}
      {/* ------------------------------------------------------------------ */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open && !saving) handleDiscardSession();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Registrar Sessão de Estudo
            </DialogTitle>
          </DialogHeader>

          {/* Summary card */}
          <div className="rounded-xl bg-emerald-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-200">
                <BookOpen className="h-4 w-4 text-emerald-700" />
              </div>
              <span className="text-sm font-semibold text-emerald-800">
                Resumo da sessão
              </span>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Tempo total</span>
                <span className="font-mono font-bold text-emerald-700">
                  {formatTime(elapsedSeconds)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Disciplina</span>
                <span className="font-medium text-slate-700">{subjectLabel}</span>
              </div>
              {selectedCategory && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Tipo de atividade</span>
                  <span className="font-medium text-slate-700">
                    {selectedCategory}
                  </span>
                </div>
              )}
              {mode === "pomodoro" && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Modo</span>
                  <span className="font-medium text-slate-700">
                    🍅 Pomodoro {pomodoroDuration} min
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Optional metrics */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Métricas opcionais
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="input-questions-total"
                  className="block text-xs font-medium text-slate-600"
                >
                  Total de Questões
                </label>
                <Input
                  id="input-questions-total"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={questionsTotal}
                  onChange={(e) => setQuestionsTotal(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="input-questions-correct"
                  className="block text-xs font-medium text-slate-600"
                >
                  Acertos
                </label>
                <Input
                  id="input-questions-correct"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={questionsCorrect}
                  onChange={(e) => setQuestionsCorrect(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="input-pages-read"
                  className="block text-xs font-medium text-slate-600"
                >
                  Páginas
                </label>
                <Input
                  id="input-pages-read"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={pagesRead}
                  onChange={(e) => setPagesRead(e.target.value)}
                />
              </div>
            </div>

            {/* Notes textarea */}
            <div className="space-y-1">
              <label
                htmlFor="textarea-notes"
                className="block text-xs font-medium text-slate-600"
              >
                Comentários (opcional)
              </label>
              <textarea
                id="textarea-notes"
                rows={3}
                placeholder="Como foi a sessão? Alguma dúvida ou insight?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {saveError && (
              <p className="text-xs text-red-500">{saveError}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              id="btn-discard-session"
              variant="outline"
              onClick={handleDiscardSession}
              disabled={saving}
            >
              Descartar
            </Button>
            <Button
              id="btn-save-session"
              onClick={handleSaveSession}
              disabled={saving}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando…
                </>
              ) : (
                "Salvar Sessão"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
