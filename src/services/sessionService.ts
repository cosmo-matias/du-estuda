import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { StudySession } from "@/types";

// ---------------------------------------------------------------------------
// Collection reference
// ---------------------------------------------------------------------------
const sessionsRef = collection(db, "studySessions");

// ---------------------------------------------------------------------------
// addStudySession
// Persiste uma sessão de estudo no Firestore.
// Retorna o objeto completo com o ID gerado.
// ---------------------------------------------------------------------------
export async function addStudySession(
  session: Omit<StudySession, "id">
): Promise<StudySession> {
  const docRef = await addDoc(sessionsRef, {
    ...session,
    // Normalise date to ISO string before persisting
    date: session.date instanceof Date
      ? session.date.toISOString()
      : session.date,
    createdAt: serverTimestamp(),
  });

  return { id: docRef.id, ...session };
}
