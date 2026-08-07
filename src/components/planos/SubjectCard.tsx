"use client";

import { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Plus,
  Loader2,
  Circle,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getTopicsByPlanAndSubject, addTopic } from "@/services/topicService";
import { usePlan } from "@/contexts/PlanContext";
import type { Subject, Topic } from "@/types";

// ---------------------------------------------------------------------------
// StatItem — metric column inside the card body
// ---------------------------------------------------------------------------
interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: number;
}

function StatItem({ icon, label, value }: StatItemProps) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-slate-50 p-3 text-center">
      <div className="text-slate-400">{icon}</div>
      <span className="text-xl font-bold text-slate-700">{value}</span>
      <span className="text-xs leading-tight text-slate-500">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SubjectCard
// ---------------------------------------------------------------------------
interface SubjectCardProps {
  subject: Subject;
}

export function SubjectCard({ subject }: SubjectCardProps) {
  const { activePlan } = usePlan();
  // Safe fallbacks for values coming from Firestore
  const title = subject?.title?.trim() || "Disciplina sem nome";
  const color = subject?.color?.trim() || "#94a3b8";

  // -------------------------------------------------------------------------
  // Dialog / topics state
  // -------------------------------------------------------------------------
  const [isOpen, setIsOpen]               = useState(false);
  const [topics, setTopics]               = useState<Topic[]>([]);
  const [isLoading, setIsLoading]         = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [adding, setAdding]               = useState(false);
  const [inputError, setInputError]       = useState("");
  const inputRef                          = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------------------
  // Fetch topics only when dialog opens
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    async function fetchTopics() {
      if (!activePlan) return;
      try {
        setIsLoading(true);
        const data = await getTopicsByPlanAndSubject(activePlan.id, subject.id);
        if (!cancelled) setTopics(data);
      } catch (err) {
        console.error("Erro ao carregar tópicos:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchTopics();
    return () => { cancelled = true; };
  }, [isOpen, subject.id]);

  // Focus the input when the dialog opens
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // -------------------------------------------------------------------------
  // Add topic handler
  // -------------------------------------------------------------------------
  async function handleAddTopic() {
    if (!activePlan) {
      setInputError("Selecione um plano primeiro.");
      return;
    }
    const trimmed = newTopicTitle.trim();
    if (!trimmed) {
      setInputError("Digite o nome do tópico.");
      return;
    }

    try {
      setAdding(true);
      setInputError("");

      const created = await addTopic({
        planId: activePlan.id,
        subjectId:   subject.id,
        title:       trimmed,
        isCompleted: false,
      });

      // Optimistic local append — no re-fetch needed
      setTopics((prev) => [...prev, created]);
      setNewTopicTitle("");
      inputRef.current?.focus();
    } catch (err) {
      console.error("Erro ao adicionar tópico:", err);
      setInputError("Erro ao salvar. Tente novamente.");
    } finally {
      setAdding(false);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Card — clickable button that opens the topics dialog               */}
      {/* ------------------------------------------------------------------ */}
      <button
        type="button"
        className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-xl"
        style={{ "--tw-ring-color": color } as React.CSSProperties}
        onClick={() => setIsOpen(true)}
        aria-label={`Abrir tópicos de ${title}`}
      >
        <Card className="overflow-hidden transition-shadow hover:shadow-md pointer-events-none">
          {/* Colored top border */}
          <div
            className="h-1.5 w-full"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />

          <CardHeader className="flex flex-row items-center gap-3 pb-2 pt-4">
            <div
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            <CardTitle className="text-base font-semibold leading-tight text-slate-800">
              {title}
            </CardTitle>
          </CardHeader>

          <CardContent className="pb-4">
            <div className="grid grid-cols-3 gap-2">
              <StatItem
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="Tópicos Estudados"
                value={0}
              />
              <StatItem
                icon={<BookOpen className="h-4 w-4" />}
                label="Tópicos Totais"
                value={0}
              />
              <StatItem
                icon={<HelpCircle className="h-4 w-4" />}
                label="Questões Resolvidas"
                value={0}
              />
            </div>

            <p className="mt-3 text-center text-xs text-slate-400">
              Clique para gerenciar tópicos
            </p>
          </CardContent>
        </Card>
      </button>

      {/* ------------------------------------------------------------------ */}
      {/* Dialog — topic management (controlled, no DialogTrigger needed)    */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            {/* Subject title with left colored border */}
            <div
              className="border-l-4 pl-3"
              style={{ borderColor: color }}
            >
              <DialogTitle className="text-lg font-bold text-slate-800">
                {title}
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Gerencie os tópicos desta disciplina
              </p>
            </div>
          </DialogHeader>

          <Separator />

          {/* -------------------------------------------------------------- */}
          {/* Add topic input row                                            */}
          {/* -------------------------------------------------------------- */}
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                id={`input-topic-${subject.id}`}
                placeholder="Nome do tópico (ex: Direitos Fundamentais)"
                value={newTopicTitle}
                onChange={(e) => {
                  setNewTopicTitle(e.target.value);
                  if (inputError) setInputError("");
                }}
                onKeyDown={(e) =>
                  e.key === "Enter" && !adding && handleAddTopic()
                }
                disabled={adding}
                className="flex-1"
              />
              <Button
                id={`btn-add-topic-${subject.id}`}
                onClick={handleAddTopic}
                disabled={adding}
                style={{ backgroundColor: color }}
                className="shrink-0 text-white hover:opacity-90 border-0"
              >
                {adding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </>
                )}
              </Button>
            </div>
            {inputError && (
              <p className="text-xs text-red-500">{inputError}</p>
            )}
          </div>

          <Separator />

          {/* -------------------------------------------------------------- */}
          {/* Topics list                                                    */}
          {/* -------------------------------------------------------------- */}
          <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
            {/* Loading */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            )}

            {/* Empty state */}
            {!isLoading && topics.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BookOpen className="h-8 w-8 text-slate-200 mb-2" />
                <p className="text-sm text-slate-400">
                  Nenhum tópico cadastrado ainda.
                </p>
                <p className="text-xs text-slate-300 mt-0.5">
                  Use o campo acima para adicionar o primeiro.
                </p>
              </div>
            )}

            {/* Topic rows */}
            {!isLoading &&
              topics.map((topic, index) => (
                <div key={topic.id}>
                  <div className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-50 transition-colors">
                    {/* Status icon */}
                    <div className="shrink-0 text-slate-300">
                      {topic.isCompleted ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </div>

                    {/* Index + title */}
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="text-xs font-mono text-slate-400 shrink-0">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="text-sm text-slate-700 truncate">
                        {topic.title}
                      </span>
                    </div>

                    {/* Status badge */}
                    <span
                      className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        topic.isCompleted
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {topic.isCompleted ? "Concluído" : "Pendente"}
                    </span>
                  </div>

                  {index < topics.length - 1 && (
                    <Separator className="mx-2" />
                  )}
                </div>
              ))}
          </div>

          {/* Summary footer */}
          {!isLoading && topics.length > 0 && (
            <p className="text-xs text-slate-400 text-right">
              {topics.filter((t) => t.isCompleted).length} de{" "}
              {topics.length} concluídos
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
