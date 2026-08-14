import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PlanSubject, Subject } from "@/types";

const planSubjectsRef = collection(db, "plan_subjects");

export interface PlanSubjectWithDetails extends PlanSubject {
  subjectTitle: string;
  subjectColor: string;
}

export async function addSubjectToPlan(data: Omit<PlanSubject, "id">): Promise<PlanSubject> {
  const docRef = await addDoc(planSubjectsRef, data);
  return { id: docRef.id, ...data };
}

export async function getSubjectsByPlan(planId: string): Promise<PlanSubjectWithDetails[]> {
  const q = query(planSubjectsRef, where("planId", "==", planId));
  const snapshot = await getDocs(q);
  
  const planSubjects = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<PlanSubject, "id">),
  }));

  // Fetch subjects to enrich data
  const result: PlanSubjectWithDetails[] = [];
  for (const ps of planSubjects) {
    const subjectDocRef = doc(db, "subjects", ps.subjectId);
    const subjectSnapshot = await getDoc(subjectDocRef);
    if (subjectSnapshot.exists()) {
      const subjectData = subjectSnapshot.data() as Subject;
      result.push({
        ...ps,
        subjectTitle: subjectData.title,
        subjectColor: subjectData.color,
      });
    } else {
      result.push({
        ...ps,
        subjectTitle: "Disciplina (Metadados Ausentes)",
        subjectColor: "#94a3b8", // slate-400
      });
    }
  }

  return result;
}

export async function removeSubjectFromPlan(planSubjectId: string): Promise<void> {
  const docRef = doc(db, "plan_subjects", planSubjectId);
  await deleteDoc(docRef);
}
