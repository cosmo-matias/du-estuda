"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Target, TrendingUp, Check, X, Loader2, Trash2, ChevronLeft, ChevronRight, Quote } from "lucide-react";
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
import { getTopicsByPlan } from "@/services/topicService";
import type { StudySession, Subject, Topic } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/contexts/PlanContext";

// Constants & Mocks
// ---------------------------------------------------------------------------

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

const INSPIRATIONAL_QUOTES = [
  {
    text: "O mais alto objetivo de toda verdadeira educação é o aperfeiçoamento moral bem como o desenvolvimento mental.",
    author: "Ellen G. White, Educação"
  },
  {
    text: "A verdadeira educação significa mais do que o avanço num certo curso de estudos. É o desenvolvimento harmônico das faculdades físicas, mentais e espirituais.",
    author: "Ellen G. White, Educação"
  },
  {
    text: "Maior do que a mais alta aspiração do pensamento humano para si mesmo é o ideal de Deus para Seus filhos.",
    author: "Ellen G. White, Educação"
  },
  {
    text: "A disciplina própria é a chave para o domínio de qualquer ciência ou arte.",
    author: "Ellen G. White"
  },
  {
    text: "A mente se expande à medida que busca compreender os mistérios do conhecimento com perseverança e fé.",
    author: "Ellen G. White, Educação"
  },
  {
    text: "O sucesso não é o resultado de uma explosão repentina, mas de um esforço constante e deliberado em direção a um ideal.",
    author: "Ellen G. White, Educação"
  },
  {
    text: "Na obra da educação é necessária a mais paciente e perseverante atenção aos pormenores.",
    author: "Ellen G. White, Educação"
  }
];

// Helper to format seconds to Xh Ymin
function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [habitOffset, setHabitOffset] = useState(0);

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
        const [fetchedSessions, fetchedSubjects, fetchedTopics] = await Promise.all([
          getSessionsByPlan(user.uid, activePlan.id),
          getSubjects(user.uid, activePlan.id),
          getTopicsByPlan(activePlan.id)
        ]);
        if (!cancelled) {
          setSessions(fetchedSessions);
          setSubjects(fetchedSubjects);
          setTopics(fetchedTopics);
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

  // 2. Desempenho Global (Acertos)
  const accuracyPercent = useMemo(() => {
    let qTotal = 0;
    let qCorrect = 0;
    sessions.forEach(s => {
      qTotal += s.questionsTotal || 0;
      qCorrect += s.questionsCorrect || 0;
    });
    if (qTotal === 0) return 0;
    return Math.round((qCorrect / qTotal) * 100);
  }, [sessions]);

  // 3. Progresso no Edital
  const planProgress = useMemo(() => {
    if (topics.length === 0) return 0;
    const completed = topics.filter(t => t.isCompleted).length;
    return Math.round((completed / topics.length) * 100);
  }, [topics]);

  // 4. Global Habit Stats (Streak & Month)
  const globalHabitStats = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    let streak = 0;
    let i = 0;
    while(true) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const hasSession = sessions.some(s => new Date(s.date).toDateString() === d.toDateString());
        
        if (!hasSession && i === 0) {
            // Did not study today yet, streak might be alive from yesterday, skip breaking it
        } else if (!hasSession) {
            break;
        } else {
            streak++;
        }
        i++;
    }

    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();
    const uniqueDaysThisMonth = new Set<string>();
    sessions.forEach(s => {
        const d = new Date(s.date);
        if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
            uniqueDaysThisMonth.add(d.toDateString());
        }
    });

    return { streak, monthDays: uniqueDaysThisMonth.size };
  }, [sessions]);

  // 5. Habit Tracker (Paginated 14 days)
  const habitTracker = useMemo(() => {
    const tracker = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const viewEndDate = new Date(today);
    viewEndDate.setDate(viewEndDate.getDate() - habitOffset);
    
    const viewStartDate = new Date(viewEndDate);
    viewStartDate.setDate(viewStartDate.getDate() - 13);
    
    let daysStudiedInPeriod = 0;

    for (let i = 13; i >= 0; i--) {
      const d = new Date(viewEndDate);
      d.setDate(d.getDate() - i);
      const dateString = d.toDateString();

      const daySessions = sessions.filter(s => new Date(s.date).toDateString() === dateString);
      const hasSession = daySessions.length > 0;
      const totalSeconds = daySessions.reduce((acc, s) => acc + s.durationInSeconds, 0);

      if (hasSession) daysStudiedInPeriod++;

      tracker.push({
        dateObj: d,
        hasSession,
        totalSeconds,
        dayOfWeek: d.toLocaleDateString("pt-BR", { weekday: 'short' }).replace('.', ''),
        dayNumber: d.getDate(),
        fullDateStr: d.toLocaleDateString("pt-BR", { day: '2-digit', month: 'long' })
      });
    }
    
    return { tracker, viewStartDate, viewEndDate, daysStudiedInPeriod };
  }, [sessions, habitOffset]);

  // 6. Calendário de Constância (Mês Atual)
  const { currentMonthDays, studiedDates } = useMemo(() => {
    const dates = new Set<string>();
    sessions.forEach(s => {
      dates.add(new Date(s.date).toDateString());
    });

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return { currentMonthDays: days, studiedDates: dates };
  }, [sessions, currentCalendarDate]);

  // 7. Estudos do Dia (PieChart)
  const dailySubjectsData = useMemo(() => {
    const todayStr = new Date().toDateString();
    
    const todaysSessions = sessions.filter((s) => {
      return new Date(s.date).toDateString() === todayStr;
    });

    const grouped: Record<string, number> = {};
    todaysSessions.forEach((s) => {
      grouped[s.subjectId] = (grouped[s.subjectId] || 0) + s.durationInSeconds;
    });

    return Object.entries(grouped).map(([subjectId, totalSeconds], index) => {
      const subject = subjects.find((sub) => sub.id === subjectId);
      return {
        name: subject?.title || "Desconhecida",
        value: Math.round(totalSeconds / 60),
        color: subject?.color || PIE_COLORS[index % PIE_COLORS.length],
      };
    }).filter(item => item.value > 0);
  }, [sessions, subjects]);

  // 8. Últimas sessões
  const recentSessions = useMemo(() => {
    return [...sessions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [sessions]);

  // 9. Gráfico Semanal Real
  const weeklyChartData = useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        dateObj: d,
        day: d.toLocaleDateString("pt-BR", { weekday: 'short' }).replace('.', ''),
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
      day: d.day,
      hours: Number((d.seconds / 3600).toFixed(2))
    }));
  }, [sessions]);

  // 10. Daily Inspirational Quote
  const dailyQuote = useMemo(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    
    return INSPIRATIONAL_QUOTES[dayOfYear % INSPIRATIONAL_QUOTES.length];
  }, []);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  
  const handlePrevMonth = () => {
    setCurrentCalendarDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setCurrentCalendarDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  async function handleDeleteSession(sessionId: string) {
    if (!window.confirm("Tem certeza que deseja excluir esta sessão de estudo? Esta ação não pode ser desfeita.")) {
      return;
    }
    try {
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
            <div className="text-2xl font-bold text-slate-900">{accuracyPercent}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Média de acertos geral
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
            <div className="text-2xl font-bold text-slate-900">{planProgress}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tópicos concluídos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Section 2: Habit Tracker & Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col min-h-[320px]">
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-lg text-slate-800">Constância Diária</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-md">
                    {habitTracker.viewStartDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short'})} - {habitTracker.viewEndDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short'})}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon" className="h-7 w-7 text-slate-500" onClick={() => setHabitOffset(p => p + 14)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-7 w-7 text-slate-500" onClick={() => setHabitOffset(p => Math.max(0, p - 14))} disabled={habitOffset === 0}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              {/* Resumo Rápido */}
              <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 mb-4">
                <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                  <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Sequência Atual</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-emerald-700 leading-none">{globalHabitStats.streak}</span>
                    <span className="text-sm font-bold text-emerald-600">🔥</span>
                  </div>
                </div>
                <div className="flex-1 bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                  <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Dias no Mês</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-indigo-700 leading-none">{globalHabitStats.monthDays}</span>
                    <span className="text-sm font-bold text-indigo-600">📅</span>
                  </div>
                </div>
                <div className="flex-1 bg-amber-50 border border-amber-100 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                  <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-1">Neste Período</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-amber-700 leading-none">{habitTracker.daysStudiedInPeriod}</span>
                    <span className="text-sm font-bold text-amber-600">/ 14</span>
                  </div>
                </div>
              </div>
              
              {/* Banner Inspiracional */}
              <div className="my-auto py-5 px-6 rounded-xl border border-indigo-100/50 bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-emerald-50/60 flex items-center justify-center relative overflow-hidden shadow-sm">
                <Quote className="absolute top-2 left-3 h-8 w-8 text-indigo-500/10 rotate-180" />
                <div className="flex flex-col items-center justify-center relative z-10">
                  <p className="italic font-medium text-slate-700 text-[13px] leading-relaxed text-center max-w-lg">
                    "{dailyQuote.text}"
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold mt-2 text-center uppercase tracking-wider">
                    — {dailyQuote.author}
                  </p>
                </div>
                <Quote className="absolute bottom-2 right-3 h-8 w-8 text-emerald-500/10" />
              </div>
              
              {/* Bolinhas (Dias) */}
              <div className="flex flex-wrap items-end justify-center gap-2 sm:gap-3 lg:gap-4 mt-auto pt-4">
                {habitTracker.tracker.map((day, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1.5 group relative">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">{day.dayOfWeek}</span>
                    <div
                      className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 transition-all ${
                        day.hasSession
                          ? "bg-emerald-100 border-emerald-400 text-emerald-600 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-300"
                      }`}
                    >
                      {day.hasSession ? <Check className="h-4 w-4 sm:h-5 sm:w-5" /> : <X className="h-4 w-4 sm:h-5 sm:w-5" />}
                    </div>
                    <span className="text-xs font-bold text-slate-600">{day.dayNumber}</span>
                    
                    {/* Tooltip Hover Suave */}
                    <div className="absolute -top-11 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 flex flex-col items-center">
                      <div className="bg-slate-800 text-white text-[10px] whitespace-nowrap px-2 py-1 rounded shadow-lg flex flex-col items-center">
                        <span className="font-semibold">{day.fullDateStr}</span>
                        {day.hasSession ? (
                          <span className="text-emerald-300 font-medium">{formatDuration(day.totalSeconds)}</span>
                        ) : (
                          <span className="text-slate-400">Não estudou</span>
                        )}
                      </div>
                      <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800 -mt-px"></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col min-h-[320px]">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider capitalize">
                {currentCalendarDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center">
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                  <div key={i} className="text-xs font-semibold text-slate-400">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {currentMonthDays.map((dateObj, i) => {
                  if (!dateObj) return <div key={`empty-${i}`} className="aspect-square" />;
                  
                  const dateStr = dateObj.toDateString();
                  const isToday = dateStr === new Date().toDateString();
                  const isStudied = studiedDates.has(dateStr);
                  
                  const isExamDay = activePlan?.targetDate 
                    ? new Date(activePlan.targetDate).toDateString() === dateStr
                    : false;
                  
                  if (isExamDay) {
                    return (
                      <div
                        key={i}
                        className="aspect-square flex flex-col items-center justify-center rounded-md bg-red-500 text-white font-bold ring-4 ring-red-200 shadow-sm"
                        title="Dia D - Data da Prova"
                      >
                        <span className="text-xs leading-none mb-0.5">{dateObj.getDate()}</span>
                        <span className="text-[9px] block leading-none font-black">DIA D</span>
                      </div>
                    );
                  }
                  
                  return (
                    <div
                      key={i}
                      className={`aspect-square flex items-center justify-center rounded-md text-xs font-medium transition-all ${
                        isStudied
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                      } ${isToday ? "ring-2 ring-indigo-500 ring-offset-1" : ""}`}
                      title={isStudied ? "Estudou neste dia!" : ""}
                    >
                      {dateObj.getDate()}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section 3: Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Bar Chart - Weekly Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-slate-800">Estudo Semanal (Horas)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                        className="w-2 h-10 rounded-full shrink-0" 
                        style={{ backgroundColor: subject?.color || "#cbd5e1" }}
                      />
                      <div>
                        <p className="font-medium text-slate-800 text-sm line-clamp-1">
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
