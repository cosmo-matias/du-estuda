"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Home,
  BookOpen,
  Layers,
  CalendarDays,
  RefreshCcw,
  History,
  BarChart2,
  Timer,
  Bell,
  LogOut,
  Loader2,
  Folder,
  Library,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/contexts/PlanContext";
import { signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------------------------------------------------------------------------
// Navigation items
// ---------------------------------------------------------------------------
const navItems = [
  { label: "Home",         href: "/",             icon: Home },
  { label: "Cronômetro",   href: "/cronometro",   icon: Timer },
  { label: "Planos",       href: "/planos",       icon: Folder },
  { label: "Disciplinas",  href: "/disciplinas",  icon: Library },
  { label: "Planejamento", href: "/planejamento", icon: CalendarDays },
  { label: "Revisões",     href: "/revisoes",     icon: RefreshCcw },
  { label: "Histórico",    href: "/historico",    icon: History },
  { label: "Estatísticas", href: "/estatisticas", icon: BarChart2 },
] as const;

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------
function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col bg-slate-950 text-slate-50 shrink-0">
      {/* Logo / Brand */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-900">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
          <BookOpen className="h-4 w-4 text-white" />
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
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
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
      <div className="px-4 py-4 border-t border-slate-900">
        <p className="text-xs text-slate-500 text-center">
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
  user: User;
}

function Topbar({ title = "Dashboard", user }: TopbarProps) {
  const { plans, activePlan, setActivePlan, loading: planLoading } = usePlan();

  async function handleLogout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  }

  // Pega as iniciais do nome para o fallback
  const initials = user.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2)
    : "US";

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6 shrink-0">
      {/* Left — page title & plan selector */}
      <div className="flex items-center gap-4">
        <h1 className="text-base font-semibold text-slate-800">{title}</h1>
        
        <div className="h-4 w-px bg-slate-300 hidden sm:block" />
        
        <div className="hidden sm:block">
          <Select 
            value={activePlan?.id || ""} 
            onValueChange={(val) => {
              const selected = plans.find((p) => p.id === val);
              if (selected) setActivePlan(selected);
            }}
            disabled={planLoading || plans.length === 0}
          >
            <SelectTrigger className="w-[200px] h-8 text-xs bg-slate-50 border-slate-200 focus:ring-0">
              <SelectValue placeholder={planLoading ? "Carregando..." : "Nenhum plano"} />
            </SelectTrigger>
            <SelectContent>
              {plans.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-4">
        <button
          aria-label="Notificações"
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <Bell className="h-5 w-5" />
          {/* Unread dot */}
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-white" />
        </button>

        <div className="h-6 w-px bg-slate-200" />

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700 hidden sm:inline-block">
            {user.displayName || "Usuário"}
          </span>
          <Avatar className="h-8 w-8 border border-slate-200">
            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "Avatar"} />
            <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <button 
            onClick={handleLogout}
            className="text-slate-400 hover:text-red-500 transition-colors p-1"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
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
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Guard routing logic
  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      router.replace("/login");
    }
  }, [user, loading, pathname, router]);

  // Se for a rota de login, não exibe Sidebar nem Topbar
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // Show loading spinner while checking auth status or during redirect
  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title={pageTitle} user={user} />

        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
