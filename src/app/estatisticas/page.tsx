"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Clock, Target, CheckCircle, BarChart3 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/contexts/PlanContext";
import { getSessionsByPlan } from "@/services/sessionService";
import { getSubjectsByPlan } from "@/services/planSubjectService";
import type { StudySession } from "@/types";
import type { PlanSubjectWithDetails } from "@/services/planSubjectService";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
  Legend
} from "recharts";

export default function EstatisticasPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { activePlan } = usePlan();

  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [subjects, setSubjects] = useState<PlanSubjectWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

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
          getSubjectsByPlan(activePlan.id),
        ]);

        if (!cancelled) {
          setSessions(fetchedSessions);
          setSubjects(fetchedSubjects);
        }
      } catch (err) {
        console.error("Erro ao carregar estatísticas:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [user, activePlan]);

  // ---------------------------------------------------------------------------
  // Data Processing: Global KPIs
  // ---------------------------------------------------------------------------
  const { totalTimeFormatted, totalQuestions, totalCorrect, accuracyPercent } = useMemo(() => {
    let tSeconds = 0;
    let qTotal = 0;
    let qCorrect = 0;

    sessions.forEach(s => {
      tSeconds += s.durationInSeconds || 0;
      qTotal += s.questionsTotal || 0;
      qCorrect += s.questionsCorrect || 0;
    });

    const h = Math.floor(tSeconds / 3600);
    const m = Math.floor((tSeconds % 3600) / 60);
    const timeFormatted = `${h}h ${m}m`;

    let acc = 0;
    if (qTotal > 0) {
      acc = Math.round((qCorrect / qTotal) * 100);
    }

    return {
      totalTimeFormatted: timeFormatted,
      totalQuestions: qTotal,
      totalCorrect: qCorrect,
      accuracyPercent: acc,
    };
  }, [sessions]);

  // ---------------------------------------------------------------------------
  // Data Processing: Bar Chart (Last 7 Days)
  // ---------------------------------------------------------------------------
  const barChartData = useMemo(() => {
    // Generate the last 7 days array (including today)
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        dateObj: d,
        dateStr: d.toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' }),
        dayOfWeek: d.toLocaleDateString("pt-BR", { weekday: 'short' }).replace('.', ''),
        seconds: 0
      };
    });

    sessions.forEach(s => {
      const sessionDate = new Date(s.date);
      // Find matching day by ignoring time
      const match = days.find(
        d => d.dateObj.toDateString() === sessionDate.toDateString()
      );
      if (match) {
        match.seconds += s.durationInSeconds;
      }
    });

    return days.map(d => ({
      name: `${d.dayOfWeek} (${d.dateStr})`,
      horas: Number((d.seconds / 3600).toFixed(2)) // Decimal hours for chart
    }));
  }, [sessions]);

  // ---------------------------------------------------------------------------
  // Data Processing: Pie Chart (Time by Subject)
  // ---------------------------------------------------------------------------
  const pieChartData = useMemo(() => {
    const timeBySubject: Record<string, number> = {};

    sessions.forEach(s => {
      timeBySubject[s.subjectId] = (timeBySubject[s.subjectId] || 0) + s.durationInSeconds;
    });

    return Object.entries(timeBySubject).map(([subjectId, seconds]) => {
      const subject = subjects.find(sub => sub.subjectId === subjectId);
      return {
        name: subject?.subjectTitle || "Desconhecida",
        value: Number((seconds / 3600).toFixed(2)),
        color: subject?.subjectColor || "#94a3b8"
      };
    }).sort((a, b) => b.value - a.value); // Sort by highest time
  }, [sessions, subjects]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!activePlan) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg text-slate-500">Nenhum plano selecionado.</p>
        <Button onClick={() => router.push("/planos")}>Ver Meus Planos</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 h-full w-1.5 bg-indigo-600" />
        <div className="flex flex-col pl-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-indigo-600" />
            Estatísticas Globais
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral de desempenho e dedicação no plano <strong>{activePlan.title}</strong>.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Tempo Total</CardTitle>
            <Clock className="h-5 w-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{totalTimeFormatted}</div>
            <p className="text-xs text-muted-foreground mt-1">Sessões registradas neste plano</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Desempenho</CardTitle>
            <Target className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{accuracyPercent}%</div>
            <p className="text-xs text-emerald-600 font-medium mt-1">Taxa de acerto global</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Questões</CardTitle>
            <CheckCircle className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{totalQuestions}</div>
            <p className="text-xs text-blue-600 font-medium mt-1">
              {totalCorrect} acertos registrados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card className="shadow-sm border-slate-200 flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg text-slate-800">Estudo nos Últimos 7 Dias (Horas)</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            {sessions.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400 border-2 border-dashed rounded-lg">
                Sem dados suficientes para exibir o gráfico.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }} 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                    formatter={(value: any) => [`${value} horas`, "Tempo"]}
                  />
                  <Bar dataKey="horas" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="shadow-sm border-slate-200 flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg text-slate-800">Distribuição por Disciplina (Horas)</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            {pieChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400 border-2 border-dashed rounded-lg">
                Sem dados suficientes para exibir o gráfico.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                    formatter={(value: any) => [`${value} horas`, "Tempo"]}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
