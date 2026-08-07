import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Subject } from "@/types";

// ---------------------------------------------------------------------------
// Collection reference
// ---------------------------------------------------------------------------
const subjectsRef = collection(db, "subjects");

// ---------------------------------------------------------------------------
// getSubjects
// Busca todas as disciplinas de um plano específico no Firestore, filtrando por usuário.
// ---------------------------------------------------------------------------
export async function getSubjects(userId: string, planId: string): Promise<Subject[]> {
  const q = query(subjectsRef, where("userId", "==", userId), where("planId", "==", planId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Subject, "id">),
  }));
}

export async function getAllSubjects(userId: string): Promise<Subject[]> {
  const q = query(subjectsRef, where("userId", "==", userId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Subject, "id">),
  }));
}

export async function getSubjectById(subjectId: string): Promise<Subject | null> {
  const docRef = doc(db, "subjects", subjectId);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as Subject;
  }
  return null;
}

// ---------------------------------------------------------------------------
// addSubject
// Adiciona uma nova disciplina na coleção `subjects` e retorna o objeto
// completo com o ID gerado pelo Firestore.
// ---------------------------------------------------------------------------
export async function addSubject(
  subject: Omit<Subject, "id">
): Promise<Subject> {
  const docRef = await addDoc(subjectsRef, {
    ...subject,
    createdAt: serverTimestamp(),
  });

  return { id: docRef.id, ...subject };
}

// ---------------------------------------------------------------------------
// updateSubject
// ---------------------------------------------------------------------------
export async function updateSubject(
  subjectId: string,
  data: Partial<Subject>
): Promise<void> {
  const docRef = doc(db, "subjects", subjectId);
  await updateDoc(docRef, data);
}

// ---------------------------------------------------------------------------
// deleteSubject
// ---------------------------------------------------------------------------
export async function deleteSubject(subjectId: string): Promise<void> {
  const docRef = doc(db, "subjects", subjectId);
  await deleteDoc(docRef);
}
