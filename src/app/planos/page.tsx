import { Plus, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubjectCard } from "@/components/planos/SubjectCard";
import type { Plan, Subject } from "@/types";

// ---------------------------------------------------------------------------
// Mock data — substituir por dados reais do Firestore nas próximas iterações
// ---------------------------------------------------------------------------
const mockPlan: Plan = {
  id: "1",
  userId: "user1",
  title: "Projeto Interdisciplinar",
  createdAt: new Date(),
};

const mockSubjects: Subject[] = [
  { id: "1", planId: "1", title: "Matemática",        color: "#10b981" },
  { id: "2", planId: "1", title: "Língua Portuguesa", color: "#3b82f6" },
  { id: "3", planId: "1", title: "Geografia",         color: "#f59e0b" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function PlanosPage() {
  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Page header                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
            <BookOpen className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {mockPlan.title}
            </h1>
            <p className="text-sm text-slate-500">
              {mockSubjects.length} disciplina
              {mockSubjects.length !== 1 ? "s" : ""} cadastrada
              {mockSubjects.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* "+ Nova Disciplina" — visual only, sem função ainda */}
        <Button
          id="btn-nova-disciplina"
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="h-4 w-4" />
          Nova Disciplina
        </Button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Subjects grid                                                       */}
      {/* ------------------------------------------------------------------ */}
      {mockSubjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
          <BookOpen className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">
            Nenhuma disciplina cadastrada ainda.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Clique em &quot;Nova Disciplina&quot; para começar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mockSubjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      )}
    </div>
  );
}
