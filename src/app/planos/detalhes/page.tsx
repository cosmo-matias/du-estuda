"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { Plus, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { getPlanById } from "@/services/studyPlanService";
import { getAllSubjects } from "@/services/planService";
import {
  addSubjectToPlan,
  getSubjectsByPlan,
  removeSubjectFromPlan,
  PlanSubjectWithDetails,
} from "@/services/planSubjectService";
import type { StudyPlan, Subject } from "@/types";

function PlanDetailsContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const router = useRouter();
  const { user } = useAuth();
  
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [globalSubjects, setGlobalSubjects] = useState<Subject[]>([]);
  const [planSubjects, setPlanSubjects] = useState<PlanSubjectWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [weight, setWeight] = useState(1);
  const [proficiency, setProficiency] = useState("Iniciante");

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      if (!user || !id) return;
      try {
        setLoading(true);
        const [fetchedPlan, fetchedSubjects, fetchedPlanSubjects] = await Promise.all([
          getPlanById(id),
          getAllSubjects(user.uid),
          getSubjectsByPlan(id),
        ]);

        if (!cancelled) {
          setPlan(fetchedPlan);
          setGlobalSubjects(fetchedSubjects);
          setPlanSubjects(fetchedPlanSubjects);
        }
      } catch (err) {
        console.error("Erro ao carregar dados do plano:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, [user, id]);

  async function handleAddSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSubjectId || !id) return;

    try {
      const added = await addSubjectToPlan({
        planId: id,
        subjectId: selectedSubjectId,
        weight: Number(weight),
        proficiency,
      });
      
      const subject = globalSubjects.find((s) => s.id === selectedSubjectId);
      if (subject) {
        const newPS: PlanSubjectWithDetails = {
          ...added,
          subjectTitle: subject.title,
          subjectColor: subject.color,
        };
        setPlanSubjects((prev) => [...prev, newPS]);
      }
      
      setIsDialogOpen(false);
      setSelectedSubjectId("");
      setWeight(1);
      setProficiency("Iniciante");
    } catch (err) {
      console.error("Erro ao adicionar disciplina:", err);
      alert("Erro ao vincular disciplina.");
    }
  }

  async function handleRemoveSubject(planSubjectId: string) {
    if (!window.confirm("Deseja remover esta disciplina do plano?")) return;

    try {
      setPlanSubjects((prev) => prev.filter((ps) => ps.id !== planSubjectId));
      await removeSubjectFromPlan(planSubjectId);
    } catch (err) {
      console.error("Erro ao remover:", err);
      alert("Erro ao remover o vínculo.");
      window.location.reload();
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-lg text-slate-500">Plano não encontrado.</p>
        <Button onClick={() => router.push("/planos")}>Voltar para Planos</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/planos")} className="text-slate-500">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{plan.title}</h1>
            <p className="text-muted-foreground mt-1">
              Data da Prova: {plan.targetDate ? new Date(plan.targetDate + "T00:00:00").toLocaleDateString("pt-BR") : "Não definida"}
            </p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-indigo-600 text-white hover:bg-indigo-700 h-10 py-2 px-4 gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Disciplina
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vincular Disciplina</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubject} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Disciplina Global</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  required
                >
                  <option value="" disabled>Selecione uma disciplina...</option>
                  {globalSubjects.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.title}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Peso</label>
                  <Input
                    type="number"
                    min={1}
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Nível de Proficiência</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={proficiency}
                    onChange={(e) => setProficiency(e.target.value)}
                    required
                  >
                    <option value="Iniciante">Iniciante</option>
                    <option value="Intermediário">Intermediário</option>
                    <option value="Avançado">Avançado</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!selectedSubjectId}>
                  Vincular
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {planSubjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
              <p>Nenhuma disciplina vinculada a este plano.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {planSubjects.map((ps) => (
                <div key={ps.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-10 rounded-full" style={{ backgroundColor: ps.subjectColor || "#cbd5e1" }} />
                    <div>
                      <h3 className="font-semibold text-slate-800">{ps.subjectTitle}</h3>
                      <p className="text-xs text-slate-500">
                        Peso: {ps.weight} • Proficiência: {ps.proficiency}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                    onClick={() => handleRemoveSubject(ps.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PlanDetailsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    }>
      <PlanDetailsContent />
    </Suspense>
  );
}
