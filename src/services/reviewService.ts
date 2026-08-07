import {
  collection,
  query,
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
// Busca todas as revisões (sem filtro de usuário no momento).
// ---------------------------------------------------------------------------
export async function getReviews(): Promise<Review[]> {
  const q = query(reviewsRef);
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
