import { BookOpen, CheckCircle2, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Subject } from "@/types";

// ---------------------------------------------------------------------------
// Stat item shown inside the card body
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
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      {/* Colored top border using inline style for dynamic HEX colors */}
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: subject.color }}
        aria-hidden="true"
      />

      <CardHeader className="flex flex-row items-center gap-3 pb-2 pt-4">
        {/* Color dot indicator */}
        <div
          className="h-3 w-3 rounded-full shrink-0"
          style={{ backgroundColor: subject.color }}
          aria-hidden="true"
        />
        <CardTitle className="text-base font-semibold leading-tight text-slate-800">
          {subject.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="pb-4">
        {/* Stats grid — 3 columns with zeroed placeholder data */}
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
      </CardContent>
    </Card>
  );
}
