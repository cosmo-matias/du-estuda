"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addStudySession } from "@/services/sessionService";
import { addReview } from "@/services/reviewService";
import { getTopicsBySubject, updateTopic } from "@/services/topicService";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/contexts/PlanContext";
import type { PlanSubjectWithDetails } from "@/services/planSubjectService";
import type { StudyCategory, Topic } from "@/types";
import { Loader2, Check, BookOpen, Clock, X } from "lucide-react";

interface AddStudyModalProps {
  open: boolean;
  onClose: () => void;
  subjects: PlanSubjectWithDetails[];
  initialSubjectId?: string;
  initialCategory?: StudyCategory;
  initialTopicId?: string;
  initialDurationSeconds?: number;
  onSaved?: () => void;
}

const CATEGORIES: StudyCategory[] = ["Teoria", "Questões", "Revisão", "Leitura de Lei"];

export function AddStudyModal({
  open,
  onClose,
  subjects,
  initialSubjectId,
  initialCategory,
  initialTopicId,
  initialDurationSeconds,
  onSaved,
}: AddStudyModalProps) {
  const { user } = useAuth();
  const { activePlan } = usePlan();

  const [saving, setSaving] = useState(false);
  
  // Date selection
  const [dateType, setDateType] = useState<"hoje" | "ontem" | "outro">("hoje");
  const [customDate, setCustomDate] = useState("");

  // Main fields
  const [category, setCategory] = useState<StudyCategory>("Teoria");
  const [subjectId, setSubjectId] = useState("");
  const [durationStr, setDurationStr] = useState("");

  // Secondary fields
  const [topicId, setTopicId] = useState("");
  const [material, setMaterial] = useState("");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  // Checkboxes
  const [theoryCompleted, setTheoryCompleted] = useState(false);
  const [scheduleReviews, setScheduleReviews] = useState(true);

  // Optional Metric Cards
  const [showQuestions, setShowQuestions] = useState(false);
  const [qCorrect, setQCorrect] = useState("");
  const [qTotal, setQTotal] = useState("");

  const [showPages, setShowPages] = useState(false);
  const [pStart, setPStart] = useState("");
  const [pEnd, setPEnd] = useState("");

  const [showVideo, setShowVideo] = useState(false);
  const [vTitle, setVTitle] = useState("");
  const [vStart, setVStart] = useState("");
  const [vEnd, setVEnd] = useState("");

  const [notes, setNotes] = useState("");
  const [saveAndNew, setSaveAndNew] = useState(false);

  // Reset form when opened
  useEffect(() => {
    if (open) {
      if (initialSubjectId) setSubjectId(initialSubjectId);
      if (initialCategory) setCategory(initialCategory);
      if (initialTopicId) setTopicId(initialTopicId);
      if (initialDurationSeconds) {
        const m = Math.floor(initialDurationSeconds / 60);
        setDurationStr(m.toString());
      }
    }
  }, [open, initialSubjectId, initialCategory, initialTopicId, initialDurationSeconds]);

  // Fetch topics
  useEffect(() => {
    if (!subjectId) {
      setTopics([]);
      setTopicId("");
      return;
    }
    let cancelled = false;
    async function fetchTopics() {
      setLoadingTopics(true);
      try {
        const data = await getTopicsBySubject(subjectId);
        if (!cancelled) setTopics(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoadingTopics(false);
      }
    }
    fetchTopics();
    return () => { cancelled = true; };
  }, [subjectId]);

  // Helpers
  function getSelectedDate(): Date {
    const d = new Date();
    if (dateType === "ontem") {
      d.setDate(d.getDate() - 1);
    } else if (dateType === "outro" && customDate) {
      const [year, month, day] = customDate.split("-").map(Number);
      d.setFullYear(year, month - 1, day);
    }
    return d;
  }

  function parseDurationToSeconds(val: string): number {
    if (!val) return 0;
    if (val.includes(":")) {
      const parts = val.split(":").map(Number);
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1]; // mm:ss
      return 0;
    }
    const mins = parseInt(val, 10);
    if (isNaN(mins)) return 0;
    return mins * 60;
  }

  const handleSave = async () => {
    if (!user || !activePlan) return;
    const durSec = parseDurationToSeconds(durationStr);
    
    // Blindagem de Chaves Estrangeiras (evita envio de objetos)
    const safeSubjectId = typeof subjectId === "string" ? subjectId : String(subjectId);
    const safeTopicId = topicId ? (typeof topicId === "string" ? topicId : String(topicId)) : undefined;

    console.log("[AddStudyModal] Validating FKs before save:", { safeSubjectId, safeTopicId });

    if (!safeSubjectId || durSec <= 0) {
      alert("Selecione uma disciplina e informe o tempo de estudo (ex: 45 para minutos).");
      return;
    }

    setSaving(true);
    try {
      const selectedDate = getSelectedDate();
      
      const sessionPayload: any = {
        userId: user.uid,
        planId: activePlan.id,
        subjectId: safeSubjectId,
        date: selectedDate,
        durationInSeconds: durSec,
        category,
        scheduleReviews,
        theoryCompleted,
      };

      if (safeTopicId) sessionPayload.topicId = safeTopicId;
      if (material) sessionPayload.material = material;
      if (notes) sessionPayload.notes = notes;

      if (showQuestions && qTotal) {
        sessionPayload.questionsTotal = parseInt(qTotal, 10);
        sessionPayload.questionsCorrect = parseInt(qCorrect, 10) || 0;
      }
      
      if (showPages && pStart && pEnd) {
        sessionPayload.pagesReadDetails = { start: parseInt(pStart, 10), end: parseInt(pEnd, 10) };
        sessionPayload.pagesRead = (parseInt(pEnd, 10) - parseInt(pStart, 10)) + 1;
      }

      if (showVideo && vTitle) {
        sessionPayload.videoDetails = { title: vTitle, start: vStart, end: vEnd };
      }

      const { id: sessionId } = await addStudySession(sessionPayload);

      // Agendar revisões
      if (scheduleReviews) {
        const sub = subjects.find(s => s.subjectId === safeSubjectId);
        const subName = sub?.subjectTitle ?? "Disciplina";
        const subColor = sub?.subjectColor;
        const topicName = topics.find(t => t.id === safeTopicId)?.title;
        const baseDate = new Date(selectedDate);
        const intervals = [1, 7, 15, 30];
        
        for (let i = 0; i < intervals.length; i++) {
          const rDate = new Date(baseDate);
          rDate.setDate(rDate.getDate() + intervals[i]);
          await addReview({
            userId: user.uid,
            planId: activePlan.id,
            subjectId: safeSubjectId,
            subjectName: subName,
            subjectColor: subColor,
            topicId: safeTopicId,
            topicName,
            category,
            createdDate: baseDate.toISOString(),
            scheduledDate: rDate.toISOString(),
            intervalDays: intervals[i],
            status: 'scheduled',
            metrics: {
              studyTime: durationStr,
              questionsCount: showQuestions && qTotal ? parseInt(qTotal, 10) : undefined,
              correctCount: showQuestions && qCorrect ? parseInt(qCorrect, 10) : undefined,
              accuracy: showQuestions && qTotal && qCorrect ? Math.round((parseInt(qCorrect, 10) / parseInt(qTotal, 10)) * 100) : undefined
            }
          });
        }
      }

      // Concluir tópico
      if (theoryCompleted && safeTopicId) {
        await updateTopic(safeTopicId, { isCompleted: true });
      }

      if (onSaved) onSaved();

      if (saveAndNew) {
        // Reset only secondary/specific fields
        setTopicId("");
        setMaterial("");
        setDurationStr("");
        setNotes("");
        setQCorrect(""); setQTotal("");
        setPStart(""); setPEnd("");
        setVTitle(""); setVStart(""); setVEnd("");
        setShowQuestions(false); setShowPages(false); setShowVideo(false);
      } else {
        onClose();
      }

    } catch (e) {
      console.error(e);
      alert("Erro ao salvar o registro de estudo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-600" />
            Adicionar Estudo
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          {/* Date Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase text-slate-500">Data do Estudo</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDateType("hoje")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  dateType === "hoje" ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500 ring-offset-1" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setDateType("ontem")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  dateType === "ontem" ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500 ring-offset-1" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Ontem
              </button>
              <button
                type="button"
                onClick={() => setDateType("outro")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  dateType === "outro" ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500 ring-offset-1" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Outra Data
              </button>
            </div>
            {dateType === "outro" && (
              <Input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="mt-2 w-full sm:w-48"
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Categoria */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase text-slate-500">Categoria</label>
              <Select value={category} onValueChange={(v) => setCategory(v as StudyCategory)}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Disciplina */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase text-slate-500">Disciplina</label>
              <Select value={subjectId} onValueChange={(val) => setSubjectId(val || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => {
                    const realName = activePlan?.subjects?.find(a => a.id === s.subjectId)?.name || s.subjectTitle || "Disciplina Removida";
                    return <SelectItem key={s.subjectId} value={s.subjectId}>{realName}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Tempo */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs font-semibold uppercase text-slate-500">Tempo de Estudo</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Ex: 45 (minutos) ou 01:15:00"
                  value={durationStr}
                  onChange={(e) => setDurationStr(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Tópico */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase text-slate-500">Tópico (Opcional)</label>
              <Select value={topicId} onValueChange={(val) => setTopicId(val || "")} disabled={!subjectId || loadingTopics}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingTopics ? "Carregando..." : "Selecione..."} />
                </SelectTrigger>
                <SelectContent>
                  {topics.map(t => <SelectItem key={t.id} value={t.id}>{t.title || (t as any).name || "Tópico sem nome"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Material */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase text-slate-500">Material (Opcional)</label>
              <Input
                placeholder="Ex: Aula 01, PDF Cap. 2"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <button
                type="button"
                onClick={() => setTheoryCompleted(!theoryCompleted)}
                className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${theoryCompleted ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}
              >
                {theoryCompleted && <Check className="h-3.5 w-3.5" />}
              </button>
              <span className="text-sm font-medium text-slate-700">Teoria Finalizada</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <button
                type="button"
                onClick={() => setScheduleReviews(!scheduleReviews)}
                className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${scheduleReviews ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'}`}
              >
                {scheduleReviews && <Check className="h-3.5 w-3.5" />}
              </button>
              <span className="text-sm font-medium text-slate-700">Programar Revisões</span>
            </label>
          </div>

          {/* Metrics Toggles */}
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => setShowQuestions(!showQuestions)} className={`px-3 py-1.5 rounded-md text-xs font-medium border ${showQuestions ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}>+ Questões</button>
            <button type="button" onClick={() => setShowPages(!showPages)} className={`px-3 py-1.5 rounded-md text-xs font-medium border ${showPages ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}>+ Páginas</button>
            <button type="button" onClick={() => setShowVideo(!showVideo)} className={`px-3 py-1.5 rounded-md text-xs font-medium border ${showVideo ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}>+ Videoaula</button>
          </div>

          {/* Metrics Cards */}
          {(showQuestions || showPages || showVideo) && (
            <div className="flex flex-col gap-3 p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
              {showQuestions && (
                <div className="flex flex-col gap-2 relative">
                  <button type="button" onClick={() => setShowQuestions(false)} className="absolute right-0 top-0 text-slate-400 hover:text-slate-600"><X className="h-4 w-4"/></button>
                  <label className="text-xs font-bold uppercase text-slate-500">Questões</label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Input type="number" placeholder="Acertos" value={qCorrect} onChange={(e) => setQCorrect(e.target.value)} />
                    </div>
                    <div className="flex-1">
                      <Input type="number" placeholder="Total Feitas" value={qTotal} onChange={(e) => setQTotal(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {showPages && (
                <div className="flex flex-col gap-2 relative pt-2 border-t border-slate-100 first:border-0 first:pt-0">
                  <button type="button" onClick={() => setShowPages(false)} className="absolute right-0 top-2 text-slate-400 hover:text-slate-600"><X className="h-4 w-4"/></button>
                  <label className="text-xs font-bold uppercase text-slate-500">Páginas Lidas</label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Input type="number" placeholder="Pág. Inicial" value={pStart} onChange={(e) => setPStart(e.target.value)} />
                    </div>
                    <div className="flex-1">
                      <Input type="number" placeholder="Pág. Final" value={pEnd} onChange={(e) => setPEnd(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {showVideo && (
                <div className="flex flex-col gap-2 relative pt-2 border-t border-slate-100 first:border-0 first:pt-0">
                  <button type="button" onClick={() => setShowVideo(false)} className="absolute right-0 top-2 text-slate-400 hover:text-slate-600"><X className="h-4 w-4"/></button>
                  <label className="text-xs font-bold uppercase text-slate-500">Videoaula</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-[2]">
                      <Input placeholder="Título do Vídeo" value={vTitle} onChange={(e) => setVTitle(e.target.value)} />
                    </div>
                    <div className="flex-1 flex gap-2">
                      <Input placeholder="Início" value={vStart} onChange={(e) => setVStart(e.target.value)} />
                      <Input placeholder="Fim" value={vEnd} onChange={(e) => setVEnd(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase text-slate-500">Comentários e Anotações</label>
            <textarea
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-600"
              rows={3}
              placeholder="Anotações livres sobre a sessão..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

        </div>

        <DialogFooter className="flex-col sm:flex-row gap-3 sm:justify-between items-center border-t border-slate-100 pt-4 mt-2">
          <label className="flex items-center gap-2 cursor-pointer select-none self-start sm:self-center">
            <button
              type="button"
              onClick={() => setSaveAndNew(!saveAndNew)}
              className={`h-4 w-4 rounded-sm border flex items-center justify-center transition-colors ${saveAndNew ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}
            >
              {saveAndNew && <Check className="h-3 w-3" />}
            </button>
            <span className="text-xs text-slate-600">Salvar e criar novo</span>
          </label>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1 sm:flex-none">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Estudo"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
