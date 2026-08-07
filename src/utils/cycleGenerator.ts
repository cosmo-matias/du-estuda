import type { PlanSubjectWithDetails } from "@/services/planSubjectService";

/**
 * Retorna o ciclo de estudos ordenado de forma intercalada (round-robin)
 * baseado nos pesos das disciplinas.
 */
export function generateStudyCycle(subjects: PlanSubjectWithDetails[]): PlanSubjectWithDetails[] {
  if (!subjects || subjects.length === 0) return [];

  const cycle: PlanSubjectWithDetails[] = [];
  
  // Clone para rastrear quantas vezes cada matéria ainda precisa ser alocada
  const remaining = subjects.map(s => ({
    subject: s,
    count: s.weight > 0 ? s.weight : 1, // garante ao menos 1 caso peso seja 0
  }));

  // Distribui as matérias de forma intercalada
  let added = true;
  while (added) {
    added = false;
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].count > 0) {
        cycle.push(remaining[i].subject);
        remaining[i].count--;
        added = true;
      }
    }
  }

  return cycle;
}
