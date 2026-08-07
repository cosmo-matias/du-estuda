"use client";

import Link from "next/link";

import { useState, useEffect } from "react";
import { Plus, Folder, Calendar, Trash2 } from "lucide-react";
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
import { getPlans, addPlan, deletePlan } from "@/services/studyPlanService";
import type { StudyPlan } from "@/types";

export default function PlanosPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTargetDate, setNewTargetDate] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadPlans() {
      if (!user) return;
      try {
        setLoading(true);
        const data = await getPlans(user.uid);
        if (!cancelled) setPlans(data);
      } catch (err) {
        console.error("Erro ao buscar planos:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPlans();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newTitle.trim()) return;

    try {
      const plan = await addPlan({
        userId: user.uid,
        title: newTitle.trim(),
        targetDate: newTargetDate || "",
        active: true,
      });
      setPlans((prev) => [...prev, plan]);
      setNewTitle("");
      setNewTargetDate("");
      setIsDialogOpen(false);
    } catch (err) {
      console.error("Erro ao criar plano:", err);
      alert("Ocorreu um erro ao criar o plano.");
    }
  }

  async function handleDeletePlan(planId: string) {
    if (!window.confirm("Tem certeza que deseja excluir este plano? Esta ação não pode ser desfeita.")) {
      return;
    }

    try {
      setPlans((prev) => prev.filter((p) => p.id !== planId));
      await deletePlan(planId);
    } catch (err) {
      console.error("Erro ao excluir plano:", err);
      alert("Erro ao excluir o plano.");
      window.location.reload();
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Meus Planos de Estudo</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus projetos, editais ou concursos ativos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Criar Novo Plano */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger className="flex flex-col items-center justify-center gap-3 h-48 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-indigo-400 transition-all group">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 group-hover:bg-indigo-200 transition-colors">
              <Plus className="h-6 w-6 text-indigo-600" />
            </div>
            <span className="font-semibold text-slate-600 group-hover:text-indigo-600 transition-colors">
              Criar Novo Plano
            </span>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Plano de Estudo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreatePlan} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nome do Plano</label>
                <Input
                  placeholder="Ex: Concurso Banco do Brasil 2025"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Data da Prova (Opcional)</label>
                <Input
                  type="date"
                  value={newTargetDate}
                  onChange={(e) => setNewTargetDate(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!newTitle.trim()}>
                  Criar Plano
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Planos Salvos */}
        {plans.map((plan) => (
          <Card key={plan.id} className="relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
            <CardContent className="p-6 h-48 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 text-indigo-600 mb-2">
                    <Folder className="h-5 w-5" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      {plan.active ? "Ativo" : "Arquivado"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 -mt-2 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeletePlan(plan.id)}
                    title="Excluir Plano"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <h3 className="font-bold text-lg text-slate-800 line-clamp-2 leading-tight">
                  {plan.title}
                </h3>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>
                    {plan.targetDate
                      ? new Date(plan.targetDate + "T00:00:00").toLocaleDateString("pt-BR")
                      : "Sem data definida"}
                  </span>
                </div>
                <Link
                  href={`/planos/${plan.id}`}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-indigo-50 text-indigo-700 hover:bg-indigo-100 h-9 px-3"
                >
                  Abrir
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
