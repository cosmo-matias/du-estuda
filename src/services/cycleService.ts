import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { StudyCycleConfig } from "@/types";

const cycleConfigsRef = collection(db, "studyCycleConfigs");

// ---------------------------------------------------------------------------
// Save (upsert) a cycle configuration for a plan.
// If a config for the planId already exists it will be overwritten;
// otherwise a new document is created.
// ---------------------------------------------------------------------------
export async function saveCycleConfig(
  config: Omit<StudyCycleConfig, "updatedAt">
): Promise<StudyCycleConfig & { id: string }> {
  const payload = { ...config, updatedAt: serverTimestamp() };

  // Check whether a config already exists for this plan
  const q = query(cycleConfigsRef, where("planId", "==", config.planId));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    // Update the existing document
    const existingDoc = snapshot.docs[0];
    await updateDoc(existingDoc.ref, payload);
    return { id: existingDoc.id, ...payload };
  }

  // Create a new document
  const docRef = await addDoc(cycleConfigsRef, payload);
  return { id: docRef.id, ...payload };
}

// ---------------------------------------------------------------------------
// Retrieve the cycle configuration for a given planId.
// Returns null if no config has been saved yet.
// ---------------------------------------------------------------------------
export async function getCycleConfig(
  planId: string
): Promise<(StudyCycleConfig & { id: string }) | null> {
  const q = query(cycleConfigsRef, where("planId", "==", planId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const d = snapshot.docs[0];
  return { id: d.id, ...(d.data() as StudyCycleConfig) };
}

// ---------------------------------------------------------------------------
// Delete the cycle configuration for a given planId.
// ---------------------------------------------------------------------------
export async function deleteCycleConfig(planId: string): Promise<void> {
  const q = query(cycleConfigsRef, where("planId", "==", planId));
  const snapshot = await getDocs(q);
  for (const d of snapshot.docs) {
    await deleteDoc(doc(db, "studyCycleConfigs", d.id));
  }
}
