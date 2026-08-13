"use client";

import {
  BookOpen,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePlan } from "@/contexts/PlanContext";
import type { Subject } from "@/types";

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

  return (
    <div
      className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-xl"
      style={{ "--tw-ring-color": color } as React.CSSProperties}
      aria-label={`Visualizar detalhes de ${title}`}
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
            Clique para ver detalhes e tópicos
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
