"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Target, TrendingUp, Check, X, Loader2, Trash2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { getSessionsByPlan, deleteStudySession } from "@/services/sessionService";
import { getSubjects } from "@/services/planService";
import type { StudySession, Subject } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/contexts/PlanContext";

// Constants & Mocks
// ---------------------------------------------------------------------------

const WEEKLY_HOURS_MOCK = [
  { day: "Seg", hours: 4.5 },
  { day: "Ter", hours: 3.0 },
  { day: "Qua", hours: 5.2 },
  { day: "Qui", hours: 4.8 },
  { day: "Sex", hours: 2.5 },
  { day: "Sáb", hours: 6.0 },
  { day: "Dom", hours: 1.5 },
];

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

// Helper to format seconds to Xh Ymin
function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h}h ${m}min`;
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const { user }              = useAuth();
  const { activePlan }        = usePlan();

  // -------------------------------------------------------------------------
  // Fetch Data
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      if (!user || !activePlan) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [fetchedSessions, fetchedSubjects] = await Promise.all([
          getSessionsByPlan(user.uid, activePlan.id),
          getSubjects(user.uid, activePlan.id),
        ]);
        if (!cancelled) {
          setSessions(fetchedSessions);
          setSubjects(fetchedSubjects);
        }
      } catch (err) {
        console.error("Erro ao carregar dados do dashboard:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, [user, activePlan]);

  // -------------------------------------------------------------------------
  // Aggregations (useMemo)
  // -------------------------------------------------------------------------

  // 1. Tempo Total
  const totalStudyTime = useMemo(() => {
    const totalSeconds = sessions.reduce((acc, session) => acc + session.durationInSeconds, 0);
    return formatDuration(totalSeconds);
  }, [sessions]);

  // 2. Habit Tracker (Últimos 14 dias)
  const habitTracker = useMemo(() => {
    const tracker = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    let foundBreak = false;

    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateString = d.toDateString();

      const hasSession = sessions.some((s) => {
        const sessionDate = new Date(s.date);
        return sessionDate.toDateString() === dateString;
      });

      tracker.push(hasSession);
    }

    // Calculate streak (counting backwards from today)
    for (let i = tracker.length - 1; i >= 0; i--) {
      if (tracker[i]) {
        streak++;
      } else {
        break; // Streak broken
      }
    }

    return { tracker, streak };
  }, [sessions]);

  // 3. Estudos do Dia (PieChart)
  const dailySubjectsData = useMemo(() => {
    const todayStr = new Date().toDateString();
    
    // Filter today's sessions
    const todaysSessions = sessions.filter((s) => {
      return new Date(s.date).toDateString() === todayStr;
    });

    // Group by subjectId
    const grouped: Record<string, number> = {};
    todaysSessions.forEach((s) => {
      grouped[s.subjectId] = (grouped[s.subjectId] || 0) + s.durationInSeconds;
    });

    // Map to recharts format (and convert to minutes or hours)
    return Object.entries(grouped).map(([subjectId, totalSeconds], index) => {
      const subject = subjects.find((sub) => sub.id === subjectId);
      return {
        name: subject?.title || "Desconhecida",
        value: Math.round(totalSeconds / 60), // In minutes
        color: subject?.color || PIE_COLORS[index % PIE_COLORS.length],
      };
    }).filter(item => item.value > 0);
  }, [sessions, subjects]);

  // 4. Últimas sessões
  const recentSessions = useMemo(() => {
    return [...sessions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [sessions]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  async function handleDeleteSession(sessionId: string) {
    if (!window.confirm("Tem certeza que deseja excluir esta sessão de estudo? Esta ação não pode ser desfeita.")) {
      return;
    }

    try {
      // Optimistic local update
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      await deleteStudySession(sessionId);
    } catch (error) {
      console.error("Erro ao excluir sessão:", error);
      alert("Ocorreu um erro ao excluir a sessão. A página será recarregada.");
      window.location.reload();
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!activePlan) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center p-6">
        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
          <Target className="h-6 w-6 text-slate-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Nenhum plano ativo</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            Selecione ou crie um plano de estudos no menu superior para começar a acompanhar seu desempenho.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Acompanhe seu desempenho e constância nos estudos.
        </p>
      </div>

      {/* Section 1: Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Tempo de Estudo
            </CardTitle>
            <Clock className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{totalStudyTime}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total acumulado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Desempenho
            </CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">78%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Média de acertos geral (Mock)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Progresso no Edital
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">12%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tópicos concluídos (Mock)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Section 2: Habit Tracker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">Constância nos Estudos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <p className="text-sm font-medium text-emerald-600 bg-emerald-50 w-fit px-3 py-1 rounded-full border border-emerald-100">
              {habitTracker.streak > 0 
                ? `🔥 Você está há ${habitTracker.streak} dia(s) sem falhar!`
                : "Comece a estudar hoje para criar sua constância!"}
            </p>
            
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {habitTracker.tracker.map((status, idx) => (
                <div
                  key={idx}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                    status
                      ? "bg-emerald-100 border-emerald-200 text-emerald-600"
                      : "bg-red-50 border-red-100 text-red-400"
                  }`}
                  title={status ? "Meta atingida" : "Falhou"}
                >
                  {status ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1">Últimos 14 dias</p>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Bar Chart - Weekly Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-slate-800">Estudo Semanal (Mock)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={WEEKLY_HOURS_MOCK} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="hours" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart - Daily Subjects */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-slate-800">Estudos do Dia (Minutos)</CardTitle>
          </CardHeader>
          <CardContent>
            {dailySubjectsData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                Nenhum estudo registrado hoje.
              </div>
            ) : (
              <>
                <div className="h-[250px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dailySubjectsData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {dailySubjectsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
                  {dailySubjectsData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: entry.color }} 
                      />
                      <span className="text-xs text-slate-600">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 4: Últimas Sessões */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">Últimas Sessões</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSessions.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-sm text-slate-500 border-2 border-dashed rounded-lg">
              Nenhuma sessão registrada.
            </div>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((session) => {
                const subject = subjects.find((s) => s.id === session.subjectId);
                const sessionDate = new Date(session.date).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric"
                });

                return (
                  <div 
                    key={session.id} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-2 h-10 rounded-full" 
                        style={{ backgroundColor: subject?.color || "#cbd5e1" }}
                      />
                      <div>
                        <p className="font-medium text-slate-800 text-sm">
                          {subject?.title || "Disciplina Desconhecida"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {sessionDate} • {session.category}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <span className="text-sm font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-md">
                        {formatDuration(session.durationInSeconds)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteSession(session.id)}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 h-8 w-8"
                        title="Excluir Sessão"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
