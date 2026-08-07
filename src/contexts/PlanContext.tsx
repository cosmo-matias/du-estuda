"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getPlans } from "@/services/studyPlanService";
import type { StudyPlan } from "@/types";

interface PlanContextType {
  plans: StudyPlan[];
  activePlan: StudyPlan | null;
  setActivePlan: (plan: StudyPlan | null) => void;
  loading: boolean;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export function PlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadPlans() {
      if (!user) {
        setPlans([]);
        setActivePlan(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const fetchedPlans = await getPlans(user.uid);
        if (!cancelled) {
          setPlans(fetchedPlans);
          if (fetchedPlans.length > 0 && !activePlan) {
            setActivePlan(fetchedPlans[0]);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar os planos:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPlans();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <PlanContext.Provider value={{ plans, activePlan, setActivePlan, loading }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const context = useContext(PlanContext);
  if (context === undefined) {
    throw new Error("usePlan must be used within a PlanProvider");
  }
  return context;
}
