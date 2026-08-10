"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Clock, Target, CheckCircle, BarChart3, TrendingUp, BookOpen, Layers } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/contexts/PlanContext";
import { getSessionsByPlan } from "@/services/sessionService";
import { getSubjectsByPlan } from "@/services/planSubjectService";
import { getReviewsByPlan } from "@/services/reviewService";
import type { StudySession, ReviewItem } from "@/types";
import type { PlanSubjectWithDetails } from "@/services/planSubjectService";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

type PeriodFilter = "7d" | "14d" | "30d";

export default function EstatisticasPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { activePlan } = usePlan();

  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [subjects, setSubjects] = useState<PlanSubjectWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>("7d");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!user || !activePlan) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [fetchedSessions, fetchedSubjects, fetchedReviews] = await Promise.all([
          getSessionsByPlan(user.uid, activePlan.id),
          getSubjectsByPlan(activePlan.id),
          getReviewsByPlan(user.uid, activePlan.id)
        ]);

        if (!cancelled) {
          setSessions(fetchedSessions);
          setSubjects(fetchedSubjects);
          setReviews(fetchedReviews);
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
  const kpis = useMemo(() => {
    let tSeconds = 0;
    let qTotal = 0;
    let qCorrect = 0;
    const uniqueDays = new Set<string>();

    sessions.forEach(s => {
      tSeconds += s.durationInSeconds || 0;
      qTotal += s.questionsTotal || 0;
      qCorrect += s.questionsCorrect || 0;
      uniqueDays.add(new Date(s.date).toDateString());
    });

    const tempoTotalHoras = tSeconds / 3600;
    const h = Math.floor(tempoTotalHoras);
    const m = Math.floor((tSeconds % 3600) / 60);
    const timeFormatted = `${h}h ${m}m`;

    const diasUnicos = uniqueDays.size;
    const mediaDiariaHoras = diasUnicos > 0 ? tempoTotalHoras / diasUnicos : 0;
    const mediaH = Math.floor(mediaDiariaHoras);
    const mediaM = Math.round((mediaDiariaHoras - mediaH) * 60);

    let acc = 0;
    if (qTotal > 0) {
      acc = Math.round((qCorrect / qTotal) * 100);
    }

    let taxaRevisoes = 0;
    if (reviews.length > 0) {
      const completed = reviews.filter(r => r.status === 'completed').length;
      taxaRevisoes = Math.round((completed / reviews.length) * 100);
    }

    return {
      tempoTotalHoras: timeFormatted,
      mediaDiaria: `${mediaH}h ${mediaM}m/dia`,
      questoesTotais: qTotal,
      questoesAcertos: qCorrect,
      taxaAcertoGeral: acc,
      taxaRevisoes,
    };
  }, [sessions, reviews]);

  // ---------------------------------------------------------------------------
  // Data Processing: Area Chart (Time Evolution)
  // ---------------------------------------------------------------------------
  const areaChartData = useMemo(() => {
    const daysCount = selectedPeriod === "7d" ? 7 : selectedPeriod === "14d" ? 14 : 30;
    const days = Array.from({ length: daysCount }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - ((daysCount - 1) - i));
      return {
        dateObj: d,
        dateStr: d.toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' }),
        dayOfWeek: d.toLocaleDateString("pt-BR", { weekday: 'short' }).replace('.', ''),
        seconds: 0
      };
    });

    sessions.forEach(s => {
      const sessionDate = new Date(s.date);
      const match = days.find(
        d => d.dateObj.toDateString() === sessionDate.toDateString()
      );
      if (match) {
        match.seconds += s.durationInSeconds;
      }
    });

    return days.map(d => ({
      name: `${d.dayOfWeek} (${d.dateStr})`,
      horas: Number((d.seconds / 3600).toFixed(2))
    }));
  }, [sessions, selectedPeriod]);

  // ---------------------------------------------------------------------------
  // Data Processing: Pie Chart (Time by Subject - Donut)
  // ---------------------------------------------------------------------------
  const pieChartData = useMemo(() => {
    const daysCount = selectedPeriod === "7d" ? 7 : selectedPeriod === "14d" ? 14 : 30;
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - daysCount);
    limitDate.setHours(0,0,0,0);

    const filteredSessions = sessions.filter(s => new Date(s.date) >= limitDate);
    const timeBySubject: Record<string, number> = {};
    let totalSecs = 0;

    filteredSessions.forEach(s => {
      timeBySubject[s.subjectId] = (timeBySubject[s.subjectId] || 0) + s.durationInSeconds;
      totalSecs += s.durationInSeconds;
    });

    return Object.entries(timeBySubject).map(([subjectId, seconds]) => {
      const subject = subjects.find(sub => sub.subjectId === subjectId);
      return {
        name: subject?.subjectTitle || "Desconhecida",
        value: Number((seconds / 3600).toFixed(2)), // in hours
        color: subject?.subjectColor || "#94a3b8",
        percent: totalSecs > 0 ? Math.round((seconds / totalSecs) * 100) : 0
      };
    }).sort((a, b) => b.value - a.value);
  }, [sessions, subjects, selectedPeriod]);

  // ---------------------------------------------------------------------------
  // Data Processing: Subject Performance Table
  // ---------------------------------------------------------------------------
  const subjectPerformance = useMemo(() => {
    return subjects.map(subject => {
      const subSessions = sessions.filter(s => s.subjectId === subject.subjectId);
      
      const totalSecs = subSessions.reduce((acc, s) => acc + s.durationInSeconds, 0);
      const h = Math.floor(totalSecs / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      
      const qTotal = subSessions.reduce((acc, s) => acc + (s.questionsTotal || 0), 0);
      const qCorrect = subSessions.reduce((acc, s) => acc + (s.questionsCorrect || 0), 0);
      
      let accuracy = 0;
      if (qTotal > 0) {
        accuracy = Math.round((qCorrect / qTotal) * 100);
      }

      let colorClass = "bg-slate-200";
      if (qTotal > 0) {
        if (accuracy >= 80) colorClass = "bg-emerald-500";
        else if (accuracy >= 60) colorClass = "bg-amber-500";
        else colorClass = "bg-red-500";
      }

      return {
        id: subject.subjectId,
        title: subject.subjectTitle,
        color: subject.subjectColor,
        timeFormatted: `${h}h ${m}m`,
        qTotal,
        qCorrect,
        accuracy,
        colorClass
      };
    }).sort((a, b) => b.accuracy - a.accuracy || b.qTotal - a.qTotal);
  }, [sessions, subjects]);

  // Custom Legend for PieChart
  const CustomLegend = (props: any) => {
    const { payload } = props;
    if (!payload) return null;
    return (
      <ul className="flex flex-wrap justify-center gap-4 text-xs mt-4">
        {payload.map((entry: any, index: number) => (
          <li key={`item-${index}`} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full block" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-600 font-medium">
              {entry.value} <span className="text-slate-400">({entry.payload.percent}%)</span>
            </span>
          </li>
        ))}
      </ul>
    );
  };

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
            Métricas de aprendizado e consistência do plano <strong>{activePlan.title}</strong>.
          </p>
        </div>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tempo Total</CardTitle>
            <Clock className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-slate-900">{kpis.tempoTotalHoras}</div>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium">{kpis.mediaDiaria}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Desempenho</CardTitle>
            <Target className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-slate-900">{kpis.taxaAcertoGeral}%</div>
            <p className="text-[10px] text-emerald-600 font-medium mt-1">Média de Acertos Global</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Questões</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-slate-900">{kpis.questoesTotais}</div>
            <p className="text-[10px] text-blue-600 font-medium mt-1">{kpis.questoesAcertos} acertos no total</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Revisões</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-slate-900">{kpis.taxaRevisoes}%</div>
            <p className="text-[10px] text-purple-600 font-medium mt-1">Revisões concluídas no prazo</p>
          </CardContent>
        </Card>
      </div>

      {/* Period Selector */}
      <div className="flex justify-end gap-2">
        <Button 
          variant={selectedPeriod === "7d" ? "default" : "outline"} 
          size="sm" 
          onClick={() => setSelectedPeriod("7d")}
          className={selectedPeriod === "7d" ? "bg-indigo-600 text-white" : "text-slate-500"}
        >
          Últimos 7 dias
        </Button>
        <Button 
          variant={selectedPeriod === "14d" ? "default" : "outline"} 
          size="sm" 
          onClick={() => setSelectedPeriod("14d")}
          className={selectedPeriod === "14d" ? "bg-indigo-600 text-white" : "text-slate-500"}
        >
          Últimos 14 dias
        </Button>
        <Button 
          variant={selectedPeriod === "30d" ? "default" : "outline"} 
          size="sm" 
          onClick={() => setSelectedPeriod("30d")}
          className={selectedPeriod === "30d" ? "bg-indigo-600 text-white" : "text-slate-500"}
        >
          Últimos 30 dias
        </Button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Area Chart: Time Evolution */}
        <Card className="shadow-sm border-slate-200 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-500" />
              Evolução de Horas
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            {sessions.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400 border-2 border-dashed rounded-lg">
                Sem dados suficientes para exibir o gráfico.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHoras" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip 
                    cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }} 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                    formatter={(value: any) => [`${value} horas`, "Tempo Estudado"]}
                  />
                  <Area type="monotone" dataKey="horas" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorHoras)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart: Subject Distribution Donut */}
        <Card className="shadow-sm border-slate-200 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-500" />
              Distribuição por Disciplina
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            {pieChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400 border-2 border-dashed rounded-lg">
                Sem dados suficientes no período selecionado.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                    formatter={(value: any) => [`${value} horas`, "Tempo"]}
                  />
                  <Legend content={<CustomLegend />} verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subject Performance Panel */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-amber-500" />
            Desempenho por Disciplina (Todo o Período)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3 rounded-tl-lg">Disciplina</th>
                  <th scope="col" className="px-4 py-3 text-center">Tempo Acumulado</th>
                  <th scope="col" className="px-4 py-3 text-center">Questões</th>
                  <th scope="col" className="px-4 py-3 min-w-[200px] rounded-tr-lg">Taxa de Acerto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjectPerformance.map(subject => (
                  <tr key={subject.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: subject.color }}
                        />
                        <span className="font-semibold text-slate-800">{subject.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center font-medium text-slate-700">
                      {subject.timeFormatted}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className="text-slate-800 font-medium">{subject.qCorrect}</span>
                      <span className="text-slate-400"> / {subject.qTotal}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {subject.qTotal > 0 ? (
                        <div className="flex items-center gap-3">
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-2 rounded-full ${subject.colorClass}`}
                              style={{ width: `${subject.accuracy}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold w-9 text-right ${subject.colorClass.replace('bg-', 'text-')}`}>
                            {subject.accuracy}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sem questões</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
