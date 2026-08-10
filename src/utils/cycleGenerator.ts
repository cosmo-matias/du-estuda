import { nanoid } from "nanoid";
import type { StudyCycleConfig, CycleBlock } from "@/types";
import type { PlanSubjectWithDetails } from "@/services/planSubjectService";

// ---------------------------------------------------------------------------
// Legacy round-robin generator (still used by the page when no custom config
// has been saved yet — keeps backward compatibility).
// ---------------------------------------------------------------------------
export function generateStudyCycle(
  subjects: PlanSubjectWithDetails[]
): PlanSubjectWithDetails[] {
  if (!subjects || subjects.length === 0) return [];

  const cycle: PlanSubjectWithDetails[] = [];

  const remaining = subjects.map((s) => ({
    subject: s,
    count: s.weight > 0 ? s.weight : 1,
  }));

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

// ---------------------------------------------------------------------------
// Full weighted block generator — called by the wizard on "Concluir".
//
// Algorithm:
//  1. Compute each subject's proportion = weight / totalWeight.
//  2. Compute totalMinutes = weeklyHours * 60.
//  3. Compute minutesForSubject = totalMinutes * proportion.
//  4. Split each subject's time into blocks of size clamped to
//     [minBlockMinutes, maxBlockMinutes].
//  5. Interleave blocks from different subjects using a round-robin pass so
//     the same subject never appears consecutively (when avoidable).
// ---------------------------------------------------------------------------
export interface WeightedCycleInput {
  planId: string;
  weeklyHours: number;
  minBlockMinutes: number;
  maxBlockMinutes: number;
  /** subjectId → weight mapping */
  subjectWeights: { subjectId: string; weight: number }[];
  /** Rich subject info so we can attach color / title to blocks */
  subjects: PlanSubjectWithDetails[];
}

export function generateWeightedCycle(
  input: WeightedCycleInput
): CycleBlock[] {
  const {
    weeklyHours,
    minBlockMinutes,
    maxBlockMinutes,
    subjectWeights,
    subjects,
  } = input;

  if (!subjects.length || !subjectWeights.length) return [];

  const totalMinutes = weeklyHours * 60;
  const totalWeight = subjectWeights.reduce((sum, sw) => sum + sw.weight, 0);

  if (totalWeight === 0) return [];

  // Build per-subject block queues
  const queues: CycleBlock[][] = [];

  for (const sw of subjectWeights) {
    if (sw.weight <= 0) continue;

    const proportion = sw.weight / totalWeight;
    const minutesForSubject = totalMinutes * proportion;

    // Determine ideal block size (prefer closer to max)
    const idealBlock = Math.min(
      maxBlockMinutes,
      Math.max(minBlockMinutes, Math.round(minutesForSubject / Math.ceil(minutesForSubject / maxBlockMinutes)))
    );

    let remaining = Math.round(minutesForSubject);
    const blocks: CycleBlock[] = [];

    while (remaining >= minBlockMinutes) {
      const blockDuration = Math.min(idealBlock, remaining);
      if (blockDuration < minBlockMinutes) break;
      blocks.push({
        id: nanoid(10),
        subjectId: sw.subjectId,
        durationMinutes: blockDuration,
        completed: false,
      });
      remaining -= blockDuration;
    }

    if (blocks.length > 0) queues.push(blocks);
  }

  // Interleave queues (round-robin) to avoid consecutive same-subject blocks
  const interleaved: CycleBlock[] = [];
  let hasMore = true;

  while (hasMore) {
    hasMore = false;
    for (const queue of queues) {
      if (queue.length > 0) {
        interleaved.push(queue.shift()!);
        if (queue.length > 0) hasMore = true;
      }
    }
  }

  return interleaved;
}

// ---------------------------------------------------------------------------
// Helper — total study hours from a cycle sequence.
// ---------------------------------------------------------------------------
export function cycleToHours(blocks: CycleBlock[]): number {
  const totalMinutes = blocks.reduce((sum, b) => sum + b.durationMinutes, 0);
  return Math.round((totalMinutes / 60) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Helper — build a StudyCycleConfig ready to persist to Firestore.
// ---------------------------------------------------------------------------
export function buildCycleConfig(
  input: WeightedCycleInput,
  selectedDays: number[]
): Omit<StudyCycleConfig, "updatedAt"> {
  const cycleSequence = generateWeightedCycle(input);

  return {
    planId: input.planId,
    weeklyHours: input.weeklyHours,
    selectedDays,
    minBlockMinutes: input.minBlockMinutes,
    maxBlockMinutes: input.maxBlockMinutes,
    subjectWeights: input.subjectWeights,
    cycleSequence,
  };
}
