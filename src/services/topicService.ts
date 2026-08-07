import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Topic } from "@/types";

// ---------------------------------------------------------------------------
// Collection reference
// ---------------------------------------------------------------------------
const topicsRef = collection(db, "topics");

// ---------------------------------------------------------------------------
// getTopicsBySubject
// Busca todos os tópicos de uma disciplina específica no Firestore.
// ---------------------------------------------------------------------------
export async function getTopicsBySubject(subjectId: string): Promise<Topic[]> {
  const q = query(topicsRef, where("subjectId", "==", subjectId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Topic, "id">),
  }));
}

// ---------------------------------------------------------------------------
// addTopic
// Adiciona um novo tópico na coleção `topics` e retorna o objeto
// completo com o ID gerado pelo Firestore.
// ---------------------------------------------------------------------------
export async function addTopic(topic: Omit<Topic, "id">): Promise<Topic> {
  const docRef = await addDoc(topicsRef, {
    ...topic,
    createdAt: serverTimestamp(),
  });

  return { id: docRef.id, ...topic };
}

// ---------------------------------------------------------------------------
// deleteTopic
// ---------------------------------------------------------------------------
export async function deleteTopic(topicId: string): Promise<void> {
  const docRef = doc(db, "topics", topicId);
  await deleteDoc(docRef);
}
