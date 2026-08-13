"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
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
  const { user, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const handleSetActivePlan = useCallback((plan: StudyPlan | null) => {
    setActivePlan(plan);
    if (plan) {
      localStorage.setItem('@duestuda:activePlanId', plan.id);
    } else {
      localStorage.removeItem('@duestuda:activePlanId');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPlans() {
      if (authLoading) return;

      if (!user) {
        setPlans([]);
        setActivePlan(null);
        localStorage.removeItem('@duestuda:activePlanId');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const fetchedPlans = await getPlans(user.uid);
        if (!cancelled) {
          setPlans(fetchedPlans);
          if (fetchedPlans.length > 0) {
            const savedPlanId = localStorage.getItem('@duestuda:activePlanId');
            let planToSet = fetchedPlans[0];
            
            if (savedPlanId) {
              const matchedPlan = fetchedPlans.find(p => p.id === savedPlanId);
              if (matchedPlan) {
                planToSet = matchedPlan;
              }
            }
            
            setActivePlan(planToSet);
            localStorage.setItem('@duestuda:activePlanId', planToSet.id);
          } else {
            setActivePlan(null);
            localStorage.removeItem('@duestuda:activePlanId');
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
  }, [user, authLoading]);

  const contextValue = useMemo(() => ({
    plans,
    activePlan,
    setActivePlan: handleSetActivePlan,
    loading
  }), [plans, activePlan, handleSetActivePlan, loading]);

  return (
    <PlanContext.Provider value={contextValue}>
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
