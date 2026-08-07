"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { Play, Clock, Target, CheckCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getSubjectById } from "@/services/planService";
import { getSessionsBySubject } from "@/services/sessionService";
import { getTopicsBySubject } from "@/services/topicService";
import type { Subject, StudySession, Topic } from "@/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Link from "next/link";

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h}h ${m}min`;
}

function SubjectDashboardContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const router = useRouter();
  const { user } = useAuth();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      if (!user || !id) return;
      try {
        setLoading(true);
        const [fetchedSubject, fetchedSessions, fetchedTopics] = await Promise.all([
          getSubjectById(id),
          getSessionsBySubject(user.uid, id),
          getTopicsBySubject(id),
        ]);

        if (!cancelled) {
          setSubject(fetchedSubject);
          setSessions(fetchedSessions);
          setTopics(fetchedTopics);
        }
      } catch (err) {
        console.error("Erro ao buscar dados da disciplina:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, [user, id]);

  const totalStudyTime = useMemo(() => {
    const totalSeconds = sessions.reduce((acc, s) => acc + s.durationInSeconds, 0);
    return formatDuration(totalSeconds);
  }, [sessions]);

  const progressPercent = useMemo(() => {
    if (topics.length === 0) return 0;
    const completed = topics.filter((t) => t.isCompleted).length;
    return Math.round((completed / topics.length) * 100);
  }, [topics]);

  const chartData = useMemo(() => {
    const grouped: Record<string, number> = {};
    sessions.forEach((s) => {
      const dateStr = new Date(s.date).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' });
      grouped[dateStr] = (grouped[dateStr] || 0) + s.durationInSeconds;
    });

    return Object.entries(grouped)
      .map(([date, seconds]) => ({
        date,
        minutes: Math.round(seconds / 60),
      }))
      .sort((a, b) => a.date.localeCompare(b.date)); // Simple string sort for demonstration
  }, [sessions]);

  // Mock toggle topic completion
  function toggleTopic(topicId: string) {
    setTopics((prev) =>
      prev.map((t) => (t.id === topicId ? { ...t, isCompleted: !t.isCompleted } : t))
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-lg text-slate-500">Disciplina não encontrada.</p>
        <Button onClick={() => router.push("/disciplinas")}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full w-1.5"
          style={{ backgroundColor: subject.color || "#4f46e5" }}
        />
        <div className="flex items-center gap-4 pl-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/disciplinas")} className="text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{subject.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">Dashboard Analítico</p>
          </div>
        </div>
        <Link
          href={`/cronometro?subjectId=${subject.id}`}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-11 px-6 shadow-sm"
        >
          <Play className="h-4 w-4 fill-current" />
          Adicionar Estudo
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Tempo de Estudo</CardTitle>
            <Clock className="h-5 w-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{totalStudyTime}</div>
            <p className="text-xs text-muted-foreground mt-1">Acumulado nesta disciplina</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Desempenho</CardTitle>
            <Target className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">85%</div>
            <p className="text-xs text-emerald-600 font-medium mt-1">102 acertos / 18 erros (Mock)</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Progresso no Edital</CardTitle>
            <CheckCircle className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{progressPercent}%</div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-blue-500 transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 1 & 3: Historico and Charts (takes 2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Evolução no Tempo */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg text-slate-800">Evolução do Tempo (Minutos)</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-sm text-slate-400 border-2 border-dashed rounded-lg">
                  Sem dados suficientes para exibir o gráfico.
                </div>
              ) : (
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                      <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="minutes" fill={subject.color || "#6366f1"} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Histórico de Registros */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg text-slate-800">Histórico de Sessões</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {sessions.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-sm text-slate-500 border-t">
                  Nenhuma sessão registrada.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                  {sessions.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(session => (
                    <div key={session.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-slate-800">
                          {new Date(session.date).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md w-fit font-medium">
                          {session.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-right">
                        <div>
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-0.5">Tempo</p>
                          <p className="text-sm font-semibold text-slate-700">{formatDuration(session.durationInSeconds)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-0.5">Acertos</p>
                          <p className="text-sm font-semibold text-emerald-600">0/0</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Section 2: Edital Verticalizado */}
        <div className="lg:col-span-1">
          <Card className="shadow-sm border-slate-200 h-full flex flex-col">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
              <CardTitle className="text-lg text-slate-800 flex items-center justify-between">
                Edital Verticalizado
                <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                  {topics.length} tópicos
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto max-h-[calc(100vh-200px)]">
              {topics.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center gap-3">
                  <div className="p-3 bg-slate-100 rounded-full">
                    <CheckCircle className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500">Nenhum tópico cadastrado.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {topics.map(topic => (
                    <div key={topic.id} className="p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={topic.isCompleted}
                        onChange={() => toggleTopic(topic.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                      />
                      <div className="flex-1">
                        <p className={`text-sm font-medium transition-colors ${topic.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                          {topic.title}
                        </p>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div
                            className={`h-full transition-all ${topic.isCompleted ? 'bg-emerald-400 w-full' : 'bg-indigo-400 w-[15%]'}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function SubjectDashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    }>
      <SubjectDashboardContent />
    </Suspense>
  );
}
