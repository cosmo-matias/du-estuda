import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
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
