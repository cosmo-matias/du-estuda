"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Play, Pause, Square, RotateCcw, Loader2, BookOpen, Target } from "lucide-react";
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
import { completeCycleBlock } from "@/services/cycleService";
import { AddStudyModal } from "@/components/estudo/AddStudyModal";
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
  const queryBlockId = searchParams.get("blockId");
  const queryDuration = searchParams.get("duration");
  const queryCycleIndex = searchParams.get("cycleIndex");
  const queryCycleLength = searchParams.get("cycleLength");
  
  const { user }                              = useAuth();
  const { activePlan, setActivePlan }         = usePlan();

  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

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
  const [pausedTime, setPausedTime]   = useState(0);
  const [isPaused, setIsPaused]       = useState(false);
  const intervalRef                   = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseIntervalRef              = useRef<ReturnType<typeof setInterval> | null>(null);

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
  // Add Study Modal (Manual / Zen Mode exit)                                //
  // ---------------------------------------------------------------------- //
  const [addStudyModalOpen, setAddStudyModalOpen] = useState(false);

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

  // Pause interval tracker
  useEffect(() => {
    if (isPaused) {
      pauseIntervalRef.current = setInterval(
        () => setPausedTime((prev) => prev + 1),
        1000
      );
    } else {
      if (pauseIntervalRef.current) {
        clearInterval(pauseIntervalRef.current);
        pauseIntervalRef.current = null;
      }
    }

    return () => {
      if (pauseIntervalRef.current) {
        clearInterval(pauseIntervalRef.current);
        pauseIntervalRef.current = null;
      }
    };
  }, [isPaused]);


  // Auto-finish Pomodoro when time runs out
  useEffect(() => {
    if (
      mode === "pomodoro" &&
      timerState === "running" &&
      elapsedSeconds >= pomodoroTotalSec
    ) {
      setTimerState("paused");
      setAddStudyModalOpen(true);
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
  // Auto-select subject and cycle parameters from URL                       //
  // ---------------------------------------------------------------------- //
  useEffect(() => {
    if (querySubjectId && subjects.length > 0) {
      const exists = subjects.find((s) => s.id === querySubjectId);
      if (exists && !selectedSubject) {
        setSelectedSubject(querySubjectId);
      }
    }
  }, [querySubjectId, subjects, selectedSubject]);

  useEffect(() => {
    if (queryBlockId) {
      setActiveBlockId(queryBlockId);
    }
  }, [queryBlockId]);

  useEffect(() => {
    if (queryDuration) {
      const dur = parseInt(queryDuration, 10);
      if (!isNaN(dur) && dur > 0) {
        setMode("pomodoro");
        setPomodoroDuration(dur);
      }
    }
  }, [queryDuration]);

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
  function handlePlay()  { 
    setTimerState("running"); 
    setIsPaused(false);
  }
  
  function handlePause() { 
    setTimerState("paused");  
    setIsPaused(true);
  }

  function handleStop() {
    setTimerState("paused");
    setIsPaused(true);
    if (elapsedSeconds > 0) {
      setAddStudyModalOpen(true);
    } else {
      resetTimer();
    }
  }

  function resetTimer() {
    setTimerState("idle");
    setElapsed(0);
    setPausedTime(0);
    setIsPaused(false);
  }

  function handleAddTime(minutes: number) {
    if (mode === "pomodoro") {
      setPomodoroDuration((prev) => prev + minutes);
    }
  }

  // ---------------------------------------------------------------------- //
  // Mode switching (only when timer is idle)                                //
  // ---------------------------------------------------------------------- //
  function handleModeChange(value: string | null) {
    if (!value || timerState !== "idle") return;
    setMode(value as TimerMode);
    setElapsed(0);
    setPausedTime(0);
  }

  function handlePomodoroDuration(minutes: number) {
    if (timerState !== "idle") return;
    setPomodoroDuration(minutes);
    setElapsed(0);
    setPausedTime(0);
  }

  // ---------------------------------------------------------------------- //
  async function handleAddStudyModalSaved() {
    if (activeBlockId && activePlan) {
      await completeCycleBlock(activePlan.id, activeBlockId);
      setActiveBlockId(null);
    }
    if (queryCycleIndex && queryCycleLength && activePlan) {
      const cIndex = parseInt(queryCycleIndex, 10);
      const cLength = parseInt(queryCycleLength, 10);
      if (!isNaN(cIndex) && !isNaN(cLength) && cLength > 0) {
        const nextPos = (cIndex + 1) % cLength;
        await updatePlan(activePlan.id, { currentCyclePosition: nextPos });
        setActivePlan({ ...activePlan, currentCyclePosition: nextPos });
      }
    }
    resetTimer();
    setAddStudyModalOpen(false);
  }

  // ---------------------------------------------------------------------- //
  // Render                                                                  //
  // ---------------------------------------------------------------------- //
  const isZenMode = timerState === "running" || timerState === "paused";

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-8 py-12 relative">
      {/* Top action bar */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <Button
          variant="outline"
          size="sm"
          className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
          onClick={() => setAddStudyModalOpen(true)}
        >
          + Adicionar Estudo
        </Button>
      </div>

      {queryDuration && (
        <div className="flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700">
          <BookOpen className="h-4 w-4" />
          Estudando Bloco do Ciclo: {queryDuration}min
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Zen Mode Overlay                                                   */}
      {/* ------------------------------------------------------------------ */}
      {isZenMode && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
          <div className="absolute top-12 flex flex-col items-center gap-2">
            <span className="text-xl font-black tracking-tight text-white/90">DuEstuda</span>
            <p className="text-sm font-medium text-white/50 uppercase tracking-widest mt-4">Você está estudando:</p>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full border border-white/5 mt-1">
              <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
              <span className="font-semibold">{subjectLabel}</span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center flex-1 w-full max-w-lg">
            <div className="flex flex-col items-center mb-12">
              <div className={`font-mono text-7xl md:text-9xl font-bold tracking-wider tabular-nums transition-colors duration-500 ${isPaused ? "text-white/50" : "text-white"}`}>
                {formatTime(displaySeconds)}
              </div>
              
              {isPaused && (
                <div className="mt-4 flex items-center justify-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-5 py-2 text-sm font-medium text-amber-400 animate-pulse">
                  <Pause className="h-4 w-4" />
                  Pausado há: {formatTime(pausedTime)}
                </div>
              )}
            </div>

            {mode === "pomodoro" && (
              <div className="w-full max-w-xs space-y-2 mb-12">
                <div className="h-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-1000"
                    style={{ width: `${pomodoroProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-8">
              <Button
                variant="outline"
                size="icon"
                onClick={handleStop}
                className="h-16 w-16 rounded-full border-none bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-white transition-all"
                aria-label="Finalizar"
              >
                <Square className="h-6 w-6 fill-current" />
              </Button>

              <Button
                size="icon"
                onClick={timerState === "running" ? handlePause : handlePlay}
                className={`h-24 w-24 rounded-full shadow-2xl transition-all ${timerState === "running" ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20" : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"}`}
              >
                {timerState === "running" ? <Pause className="h-10 w-10 fill-current text-white" /> : <Play className="h-10 w-10 fill-current text-white ml-2" />}
              </Button>

              <div className="h-16 w-16" /> {/* Spacer to balance the layout */}
            </div>
          </div>

          {mode === "pomodoro" && (
            <div className="absolute bottom-12 flex flex-col items-center gap-4">
              <p className="text-sm font-medium text-white/40">Adicione mais tempo se quiser continuar estudando:</p>
              <div className="flex items-center gap-3">
                <button onClick={() => handleAddTime(1)} className="px-5 py-2 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-sm font-semibold transition-colors">+1 min</button>
                <button onClick={() => handleAddTime(5)} className="px-5 py-2 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-sm font-semibold transition-colors">+5 min</button>
                <button onClick={() => handleAddTime(15)} className="px-5 py-2 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-sm font-semibold transition-colors">+15 min</button>
              </div>
            </div>
          )}
        </div>
      )}

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
      {/* Idle State Illustration                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center mb-6">
          <Target className="h-12 w-12 text-slate-300" />
        </div>
        <h2 className="text-xl font-bold text-slate-700 mb-2">Pronto para iniciar sua sessão?</h2>
        <p className="text-sm text-slate-500 max-w-sm">
          Selecione a disciplina e clique no Play para entrar no Modo Foco.
        </p>
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

      <AddStudyModal
        open={addStudyModalOpen}
        onClose={() => {
          setAddStudyModalOpen(false);
          if (elapsedSeconds > 0) resetTimer(); // manual discard via close
        }}
        subjects={subjects.map((s) => ({ subjectId: s.id, subjectTitle: s.title, subjectColor: "#6366f1" } as any))}
        initialSubjectId={selectedSubject}
        initialDurationSeconds={elapsedSeconds}
        onSaved={handleAddStudyModalSaved}
      />
    </div>
  );
}
