"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BookOpen,
  FileText,
  Layers,
  CalendarDays,
  RefreshCcw,
  History,
  BarChart2,
  ClipboardList,
  Bell,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Navigation items
// ---------------------------------------------------------------------------
const navItems = [
  { label: "Home",         href: "/",             icon: Home },
  { label: "Planos",       href: "/planos",       icon: BookOpen },
  { label: "Edital",       href: "/edital",       icon: FileText },
  { label: "Disciplinas",  href: "/disciplinas",  icon: Layers },
  { label: "Planejamento", href: "/planejamento", icon: CalendarDays },
  { label: "Revisões",     href: "/revisoes",     icon: RefreshCcw },
  { label: "Histórico",    href: "/historico",    icon: History },
  { label: "Estatísticas", href: "/estatisticas", icon: BarChart2 },
  { label: "Simulados",    href: "/simulados",    icon: ClipboardList },
] as const;

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------
function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col bg-emerald-900 text-emerald-50 shrink-0">
      {/* Logo / Brand */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-emerald-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400">
          <BookOpen className="h-4 w-4 text-emerald-900" />
        </div>
        <span className="text-lg font-bold tracking-tight">DuEstuda</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map(({ label, href, icon: Icon }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-emerald-700 text-white"
                      : "text-emerald-200 hover:bg-emerald-800 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-emerald-800">
        <p className="text-xs text-emerald-400 text-center">
          © 2025 DuEstuda
        </p>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Topbar
// ---------------------------------------------------------------------------
interface TopbarProps {
  title?: string;
}

function Topbar({ title = "Dashboard" }: TopbarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6 shrink-0">
      {/* Left — page title */}
      <h1 className="text-base font-semibold text-slate-800">{title}</h1>

      {/* Right — actions */}
      <div className="flex items-center gap-3">
        <button
          aria-label="Notificações"
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <Bell className="h-5 w-5" />
          {/* Unread dot */}
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
        </button>

        <Avatar className="h-8 w-8 cursor-pointer">
          <AvatarFallback className="bg-emerald-700 text-white text-xs font-semibold">
            DU
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// DashboardLayout — public export
// ---------------------------------------------------------------------------
interface DashboardLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export function DashboardLayout({ children, pageTitle }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title={pageTitle} />

        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
