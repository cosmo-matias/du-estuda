import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { StudyPlan } from "@/types";

const plansRef = collection(db, "studyPlans");

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

export async function addPlan(plan: Omit<StudyPlan, "id">): Promise<StudyPlan> {
  const payload = stripUndefined({
    ...plan,
  });
  const docRef = await addDoc(plansRef, payload);
  return { id: docRef.id, ...plan };
}

export async function getPlans(userId: string): Promise<StudyPlan[]> {
  const q = query(plansRef, where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<StudyPlan, "id">),
  }));
}

export async function getPlanById(planId: string): Promise<StudyPlan | null> {
  const docRef = doc(db, "studyPlans", planId);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as StudyPlan;
  }
  return null;
}

export async function updatePlan(planId: string, data: Partial<StudyPlan>): Promise<void> {
  const docRef = doc(db, "studyPlans", planId);
  await updateDoc(docRef, stripUndefined(data));
}

export async function deletePlan(planId: string): Promise<void> {
  const docRef = doc(db, "studyPlans", planId);
  await deleteDoc(docRef);
}
