import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { StudySession } from "@/types";

// ---------------------------------------------------------------------------
// Collection reference
// ---------------------------------------------------------------------------
const sessionsRef = collection(db, "studySessions");

// ---------------------------------------------------------------------------
// stripUndefined
// Firestore rejects documents that contain explicit `undefined` values.
// This helper removes all keys whose value is undefined before persisting.
// ---------------------------------------------------------------------------
function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

// ---------------------------------------------------------------------------
// addStudySession
// Persiste uma sessão de estudo no Firestore.
// Retorna o objeto completo com o ID gerado.
// ---------------------------------------------------------------------------
export async function addStudySession(
  session: Omit<StudySession, "id">
): Promise<StudySession> {
  const payload = stripUndefined({
    ...session,
    // Normalise date to ISO string before persisting
    date: session.date instanceof Date
      ? session.date.toISOString()
      : session.date,
    createdAt: serverTimestamp(),
  });

  const docRef = await addDoc(sessionsRef, payload);

  return { id: docRef.id, ...session };
}

// ---------------------------------------------------------------------------
// getAllStudySessions
// Busca todas as sessões de estudo (sem filtro de usuário no momento).
// ---------------------------------------------------------------------------
export async function getAllStudySessions(): Promise<StudySession[]> {
  const q = query(sessionsRef);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<StudySession, "id">),
  }));
}
