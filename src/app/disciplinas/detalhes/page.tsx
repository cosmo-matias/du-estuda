"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { Play, Clock, Target, CheckCircle, ArrowLeft, Loader2, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/contexts/PlanContext";
import { getSubjectById } from "@/services/planService";
import { getSessionsByPlan } from "@/services/sessionService";
import { getTopicsByPlanAndSubject, addTopic, deleteTopic } from "@/services/topicService";
import type { Subject, StudySession, Topic } from "@/types";
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
  const { activePlan } = usePlan();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newTopic, setNewTopic] = useState("");
  const [addingTopic, setAddingTopic] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      if (!user || !id || !activePlan) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [fetchedSubject, fetchedSessions, fetchedTopics] = await Promise.all([
          getSubjectById(id),
          getSessionsByPlan(user.uid, activePlan.id),
          getTopicsByPlanAndSubject(activePlan.id, id),
        ]);

        if (!cancelled) {
          setSubject(fetchedSubject);
          setSessions(fetchedSessions.filter(s => s.subjectId === id));
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
  }, [user, id, activePlan]);

  const totalStudyTime = useMemo(() => {
    const totalSeconds = sessions.reduce((acc, s) => acc + s.durationInSeconds, 0);
    return formatDuration(totalSeconds);
  }, [sessions]);

  const progressPercent = useMemo(() => {
    if (topics.length === 0) return 0;
    const completed = topics.filter((t) => t.isCompleted).length;
    return Math.round((completed / topics.length) * 100);
  }, [topics]);

  const { totalQuestions, totalCorrect, accuracyPercent } = useMemo(() => {
    let qTotal = 0;
    let qCorrect = 0;
    sessions.forEach(s => {
      qTotal += s.questionsTotal || 0;
      qCorrect += s.questionsCorrect || 0;
    });
    
    let acc = 0;
    if (qTotal > 0) {
      acc = Math.round((qCorrect / qTotal) * 100);
    }
    
    return { totalQuestions: qTotal, totalCorrect: qCorrect, accuracyPercent: acc };
  }, [sessions]);

  const tableTotals = useMemo(() => {
    let qT = 0, qC = 0;
    topics.forEach(topic => {
      const topicSessions = sessions.filter(s => s.topicId === topic.id);
      topicSessions.forEach(s => {
        qT += s.questionsTotal || 0;
        qC += s.questionsCorrect || 0;
      });
    });
    const qW = qT - qC;
    const acc = qT > 0 ? Math.round((qC / qT) * 100) : 0;
    
    const completed = topics.filter(t => t.isCompleted).length;
    const progress = topics.length > 0 ? Math.round((completed / topics.length) * 100) : 0;

    return { totalQuestions: qT, totalCorrect: qC, totalWrong: qW, accuracy: acc, progress };
  }, [topics, sessions]);

  // Mock toggle topic completion
  function toggleTopic(topicId: string) {
    setTopics((prev) =>
      prev.map((t) => (t.id === topicId ? { ...t, isCompleted: !t.isCompleted } : t))
    );
  }

  async function handleAddTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!newTopic.trim() || !subject || !activePlan) return;

    try {
      setAddingTopic(true);
      const added = await addTopic({
        planId: activePlan.id,
        subjectId: subject.id,
        title: newTopic.trim(),
        isCompleted: false,
      });
      setTopics((prev) => [...prev, added]);
      setNewTopic("");
    } catch (err) {
      console.error("Erro ao adicionar tópico:", err);
    } finally {
      setAddingTopic(false);
    }
  }

  async function handleDeleteTopic(topicId: string) {
    if (!window.confirm("Tem certeza que deseja excluir este tópico?")) return;
    try {
      setTopics((prev) => prev.filter((t) => t.id !== topicId));
      await deleteTopic(topicId);
    } catch (err) {
      console.error("Erro ao excluir tópico:", err);
      alert("Ocorreu um erro ao excluir o tópico.");
    }
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

  if (!activePlan) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-lg text-slate-500">Nenhum plano selecionado.</p>
        <Button onClick={() => router.push("/planos")}>Ver Planos</Button>
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
            <div className="text-3xl font-bold text-slate-900 mb-2">{accuracyPercent}%</div>
            <div className="space-y-1">
              <p className="text-xs text-slate-600 font-medium">Total de Questões: {totalQuestions}</p>
              <p className="text-xs text-emerald-600 font-medium">Acertos: {totalCorrect}</p>
              <p className="text-xs text-red-500 font-medium">Erros: {totalQuestions - totalCorrect}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Progresso no Plano</CardTitle>
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

      <div className="flex flex-col gap-6">

        {/* Histórico de Registros */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg text-slate-800">Histórico de Registros</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {sessions.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-slate-500 border-t">
                Nenhuma sessão registrada.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-y border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-medium">Data</th>
                      <th className="px-4 py-3 font-medium">Categoria</th>
                      <th className="px-4 py-3 font-medium">Tempo</th>
                      <th className="px-4 py-3 font-medium text-center"><CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" strokeWidth={2.5} /></th>
                      <th className="px-4 py-3 font-medium text-center"><XCircle className="w-4 h-4 text-red-500 mx-auto" strokeWidth={2.5} /></th>
                      <th className="px-4 py-3 font-medium text-center">%</th>
                      <th className="px-4 py-3 font-medium">Tópico</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sessions.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(session => {
                      const qT = session.questionsTotal || 0;
                      const qC = session.questionsCorrect || 0;
                      const qW = qT - qC;
                      const acc = qT > 0 ? Math.round((qC / qT) * 100) : 0;
                      const topic = topics.find(t => t.id === session.topicId);

                      return (
                        <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                            {new Date(session.date).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-semibold uppercase tracking-wider whitespace-nowrap">
                              {session.category || "ESTUDO"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">
                            {formatDuration(session.durationInSeconds)}
                          </td>
                          <td className="px-4 py-3 text-center text-emerald-600 font-medium">{qC}</td>
                          <td className="px-4 py-3 text-center text-red-500 font-medium">{qW}</td>
                          <td className="px-4 py-3 text-center text-slate-700 font-semibold">{qT > 0 ? `${acc}%` : "-"}</td>
                          <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]" title={topic?.title}>
                            {topic ? topic.title : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Edital Verticalizado */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="text-lg text-slate-800 flex items-center justify-between">
              <span>Plano <span className="text-indigo-600">{activePlan.title}</span> Verticalizado</span>
              <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                {topics.length} tópicos
              </span>
            </CardTitle>
          </CardHeader>
          <div className="p-4 border-b border-slate-100 bg-white">
            <form onSubmit={handleAddTopic} className="flex gap-2 max-w-md">
              <input
                type="text"
                placeholder="Novo tópico..."
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={addingTopic}
              />
              <Button type="submit" disabled={addingTopic || !newTopic.trim()} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                {addingTopic ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar"}
              </Button>
            </form>
          </div>
          <CardContent className="p-0">
            {topics.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center gap-3">
                <div className="p-3 bg-slate-100 rounded-full">
                  <CheckCircle className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500">Nenhum tópico cadastrado.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-medium w-10">St</th>
                      <th className="px-4 py-3 font-medium">Tópico</th>
                      <th className="px-4 py-3 font-medium text-center"><Target className="w-4 h-4 text-slate-500 mx-auto" strokeWidth={2.5} /></th>
                      <th className="px-4 py-3 font-medium text-center"><CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" strokeWidth={2.5} /></th>
                      <th className="px-4 py-3 font-medium text-center"><XCircle className="w-4 h-4 text-red-500 mx-auto" strokeWidth={2.5} /></th>
                      <th className="px-4 py-3 font-medium text-center">%</th>
                      <th className="px-4 py-3 font-medium">Último Estudo</th>
                      <th className="px-4 py-3 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topics.map(topic => {
                      const topicSessions = sessions.filter(s => s.topicId === topic.id);
                      let qT = 0, qC = 0;
                      let lastDate = 0;
                      topicSessions.forEach(s => {
                        qT += s.questionsTotal || 0;
                        qC += s.questionsCorrect || 0;
                        const sTime = new Date(s.date).getTime();
                        if (sTime > lastDate) lastDate = sTime;
                      });
                      const qW = qT - qC;
                      const acc = qT > 0 ? Math.round((qC / qT) * 100) : 0;
                      const lastStudyDate = lastDate > 0 ? new Date(lastDate).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: '2-digit' }) : "-";

                      return (
                        <tr key={topic.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={topic.isCompleted}
                              onChange={() => toggleTopic(topic.id)}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <p className={`font-medium transition-colors ${topic.isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                              {topic.title}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-center text-slate-700 font-medium">{qT}</td>
                          <td className="px-4 py-3 text-center text-emerald-600 font-medium">{qC}</td>
                          <td className="px-4 py-3 text-center text-red-500 font-medium">{qW}</td>
                          <td className="px-4 py-3 text-center text-slate-700 font-semibold">{qT > 0 ? `${acc}%` : "-"}</td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{lastStudyDate}</td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 mr-2 h-8 px-2 font-semibold">
                              Adicionar
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteTopic(topic.id)}
                              className="text-slate-400 hover:text-red-500 hover:bg-red-50 h-8 w-8"
                              title="Excluir Tópico"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td colSpan={8} className="px-4 py-3">
                        <div className="flex justify-end items-center gap-6">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2">Total</span>
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 text-sm font-semibold text-slate-700 bg-white" title="Questões Resolvidas">
                              <Target className="w-4 h-4 text-slate-500" strokeWidth={2.5} /> {tableTotals.totalQuestions}
                            </span>
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-100 text-sm font-semibold text-emerald-700 bg-emerald-50" title="Acertos">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={2.5} /> {tableTotals.totalCorrect}
                            </span>
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-red-100 text-sm font-semibold text-red-700 bg-red-50" title="Erros">
                              <XCircle className="w-4 h-4 text-red-500" strokeWidth={2.5} /> {tableTotals.totalWrong}
                            </span>
                            <span className={`px-3 py-1 rounded-full border text-sm font-semibold ${tableTotals.accuracy >= 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                              {tableTotals.accuracy}%
                            </span>
                          </div>
                          <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Progresso</span>
                            <span className="px-3 py-1 rounded-full text-sm font-bold bg-indigo-600 text-white shadow-sm">
                              {tableTotals.progress}%
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
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
