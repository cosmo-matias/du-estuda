"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Target, TrendingUp, Check, X } from "lucide-react";
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

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------
const HABIT_TRACKER_MOCK = [
  true, true, false, true, true, true, true, 
  true, false, true, true, true, true, true,
];

const WEEKLY_HOURS_MOCK = [
  { day: "Seg", hours: 4.5 },
  { day: "Ter", hours: 3.0 },
  { day: "Qua", hours: 5.2 },
  { day: "Qui", hours: 4.8 },
  { day: "Sex", hours: 2.5 },
  { day: "Sáb", hours: 6.0 },
  { day: "Dom", hours: 1.5 },
];

const DAILY_SUBJECTS_MOCK = [
  { name: "Dir. Constitucional", value: 120 },
  { name: "Matemática", value: 90 },
  { name: "Português", value: 45 },
];

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------
export default function DashboardPage() {
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
            <div className="text-2xl font-bold text-slate-900">57h 05min</div>
            <p className="text-xs text-muted-foreground mt-1">
              +12% em relação à semana passada
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
            <div className="text-2xl font-bold text-slate-900">12%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tópicos concluídos do plano atual
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
              🔥 Você está há 5 dias sem falhar!
            </p>
            
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {HABIT_TRACKER_MOCK.map((status, idx) => (
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
            <CardTitle className="text-lg text-slate-800">Estudo Semanal</CardTitle>
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
            <CardTitle className="text-lg text-slate-800">Estudos do Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={DAILY_SUBJECTS_MOCK}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {DAILY_SUBJECTS_MOCK.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
              {DAILY_SUBJECTS_MOCK.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} 
                  />
                  <span className="text-xs text-slate-600">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
