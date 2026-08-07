"use client";

import { PlayCircle, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------
type ReviewMock = {
  id: string;
  subjectTitle: string;
  topicTitle: string;
  cycle: string;
  category: string;
  scheduledFor: string;
};

const PROGRAMADAS_MOCK: ReviewMock[] = [
  {
    id: "r1",
    subjectTitle: "Direito Administrativo",
    topicTitle: "Atos Administrativos - Extinção",
    cycle: "1 dia",
    category: "TEORIA",
    scheduledFor: "HOJE",
  },
  {
    id: "r2",
    subjectTitle: "Português",
    topicTitle: "Crase - Casos Especiais",
    cycle: "7 dias",
    category: "QUESTÕES",
    scheduledFor: "HOJE",
  },
  {
    id: "r3",
    subjectTitle: "Raciocínio Lógico",
    topicTitle: "Lógica de Argumentação",
    cycle: "21 dias",
    category: "REVISÃO",
    scheduledFor: "AMANHÃ",
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------
export default function RevisoesPage() {
  return (
    <div className="flex h-full flex-col p-4 md:p-8 max-w-5xl mx-auto w-full gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Revisões</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie seu ciclo de repetições espaçadas.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="programadas" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="programadas" className="py-2.5 text-xs sm:text-sm">
            PROGRAMADAS
          </TabsTrigger>
          <TabsTrigger value="atrasadas" className="py-2.5 text-xs sm:text-sm">
            ATRASADAS
          </TabsTrigger>
          <TabsTrigger value="ignoradas" className="py-2.5 text-xs sm:text-sm">
            IGNORADAS
          </TabsTrigger>
          <TabsTrigger value="concluidas" className="py-2.5 text-xs sm:text-sm">
            CONCLUÍDAS
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="programadas" className="m-0 flex flex-col gap-3">
            {PROGRAMADAS_MOCK.map((review) => (
              <Card key={review.id} className="overflow-hidden hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  
                  {/* Left info */}
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    {/* Cycle Badge */}
                    <div className="flex flex-col items-center justify-center bg-indigo-50 text-indigo-700 rounded-lg px-3 py-2 min-w-[70px] text-center border border-indigo-100">
                      <RotateCcw className="w-4 h-4 mb-1" />
                      <span className="text-xs font-bold whitespace-nowrap">{review.cycle}</span>
                    </div>

                    {/* Text content */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 tracking-wider">
                          {review.category}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          Agendado: <span className={review.scheduledFor === "HOJE" ? "text-amber-600 font-bold" : ""}>{review.scheduledFor}</span>
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-900 line-clamp-1">{review.subjectTitle}</h3>
                      <p className="text-sm text-slate-500 line-clamp-1">{review.topicTitle}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto justify-end mt-2 sm:mt-0">
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500 hover:bg-red-50">
                      <XCircle className="w-5 h-5" />
                      <span className="sr-only">Ignorar</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-emerald-500 hover:bg-emerald-50">
                      <CheckCircle className="w-5 h-5" />
                      <span className="sr-only">Concluir</span>
                    </Button>
                    <Button variant="default" size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-4">
                      <PlayCircle className="w-4 h-4" />
                      <span>Estudar</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="atrasadas" className="m-0">
            <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
              Nenhuma revisão atrasada. Tudo em dia! 🎉
            </div>
          </TabsContent>

          <TabsContent value="ignoradas" className="m-0">
            <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
              Nenhuma revisão ignorada.
            </div>
          </TabsContent>

          <TabsContent value="concluidas" className="m-0">
            <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
              Revisões concluídas aparecerão aqui.
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
