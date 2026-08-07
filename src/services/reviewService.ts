import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Review } from "@/types";

// ---------------------------------------------------------------------------
// Collection reference
// ---------------------------------------------------------------------------
const reviewsRef = collection(db, "reviews");

// ---------------------------------------------------------------------------
// getReviews
// Busca todas as revisões de um usuário específico.
// ---------------------------------------------------------------------------
export async function getReviews(userId: string): Promise<Review[]> {
  const q = query(reviewsRef, where("userId", "==", userId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Review, "id">),
  }));
}

// ---------------------------------------------------------------------------
// updateReviewStatus
// Atualiza o status de uma revisão específica.
// ---------------------------------------------------------------------------
export async function updateReviewStatus(
  id: string,
  status: "completed" | "ignored"
): Promise<void> {
  const docRef = doc(db, "reviews", id);
  await updateDoc(docRef, { status });
}
