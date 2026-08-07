"use client";

import { useState } from "react";
import { Play, Pause, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// ---------------------------------------------------------------------------
// Mock data — will be replaced with Firestore data in future iterations
// ---------------------------------------------------------------------------
const MOCK_SUBJECTS = [
  { id: "1", title: "Matemática" },
  { id: "2", title: "Língua Portuguesa" },
  { id: "3", title: "Geografia" },
  { id: "4", title: "Direito Constitucional" },
  { id: "5", title: "Raciocínio Lógico" },
];

const MOCK_TOPICS: Record<string, { id: string; title: string }[]> = {
  "1": [
    { id: "t1", title: "Teoria dos Conjuntos" },
    { id: "t2", title: "Progressões Aritméticas" },
    { id: "t3", title: "Geometria Plana" },
  ],
  "2": [
    { id: "t4", title: "Interpretação de Texto" },
    { id: "t5", title: "Concordância Verbal" },
  ],
  "3": [
    { id: "t6", title: "Geopolítica Brasileira" },
    { id: "t7", title: "Clima e Biomas" },
  ],
  "4": [
    { id: "t8", title: "Direitos Fundamentais" },
    { id: "t9", title: "Organização do Estado" },
  ],
  "5": [
    { id: "t10", title: "Lógica Proposicional" },
    { id: "t11", title: "Sequências e Séries" },
  ],
};

const CATEGORIES = ["Teoria", "Questões", "Revisão", "Leitura de Lei"] as const;

// ---------------------------------------------------------------------------
// Timer state type
// ---------------------------------------------------------------------------
type TimerState = "idle" | "running" | "paused";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function CronometroPage() {
  const [timerState, setTimerState]     = useState<TimerState>("idle");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedTopic, setSelectedTopic]     = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const availableTopics = selectedSubject ? (MOCK_TOPICS[selectedSubject] ?? []) : [];

  function handlePlay()  { setTimerState("running"); }
  function handlePause() { setTimerState("paused");  }
  function handleStop()  { setTimerState("idle");    }

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-10 py-12">

      {/* ------------------------------------------------------------------ */}
      {/* Context selectors                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex w-full max-w-2xl flex-col items-center gap-4">
        <p className="text-sm font-medium uppercase tracking-widest text-slate-400">
          O que você está estudando agora?
        </p>

        {/* Row 1 — Disciplina + Categoria */}
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          {/* Disciplina */}
          <Select
            value={selectedSubject}
            onValueChange={(v) => {
              if (v) {
                setSelectedSubject(v);
                setSelectedTopic(""); // reset topic when subject changes
              }
            }}
          >
            <SelectTrigger id="select-disciplina" className="flex-1 bg-white">
              <SelectValue placeholder="Selecione a disciplina…" />
            </SelectTrigger>
            <SelectContent>
              {MOCK_SUBJECTS.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Categoria */}
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

        {/* Row 2 — Tópico (full width) */}
        <Select
          value={selectedTopic}
          onValueChange={(v) => { if (v) setSelectedTopic(v); }}
          disabled={availableTopics.length === 0}
        >
          <SelectTrigger
            id="select-topico"
            className="w-full bg-white disabled:opacity-50"
          >
            <SelectValue
              placeholder={
                availableTopics.length === 0
                  ? "Selecione uma disciplina primeiro…"
                  : "Selecione o tópico…"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {availableTopics.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator className="w-full max-w-2xl" />

      {/* ------------------------------------------------------------------ */}
      {/* Timer display                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col items-center gap-3">
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

        {/* Clock face */}
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
          00:00:00
        </div>
      </div>

      <Separator className="w-full max-w-2xl" />

      {/* ------------------------------------------------------------------ */}
      {/* Controls                                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center gap-4">

        {/* Stop / Save */}
        <Button
          id="btn-stop-timer"
          variant="outline"
          size="lg"
          disabled={timerState === "idle"}
          onClick={handleStop}
          className="h-14 w-14 rounded-full border-2 border-red-200 text-red-400 hover:border-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
          aria-label="Parar e salvar sessão"
        >
          <Square className="h-6 w-6 fill-current" />
        </Button>

        {/* Play / Pause — primary action */}
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

        {/* Placeholder for a future "Lap" or "Notes" action */}
        <div className="h-14 w-14" aria-hidden="true" />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Hint text                                                           */}
      {/* ------------------------------------------------------------------ */}
      <p className="text-xs text-slate-400">
        {timerState === "idle"
          ? "Selecione a disciplina e pressione Play para começar."
          : timerState === "running"
          ? "Foco total! Pressione Pause para interromper ou Stop para salvar a sessão."
          : "Sessão pausada. Pressione Play para continuar ou Stop para salvar."}
      </p>
    </div>
  );
}
