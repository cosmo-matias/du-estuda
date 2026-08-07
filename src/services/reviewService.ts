import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Review } from "@/types";

const reviewsRef = collection(db, "reviews");

export async function addReview(data: Omit<Review, "id">): Promise<Review> {
  const docRef = await addDoc(reviewsRef, data);
  return { id: docRef.id, ...data };
}

export async function getPendingReviewsByPlan(userId: string, planId: string): Promise<Review[]> {
  const q = query(
    reviewsRef,
    where("userId", "==", userId),
    where("planId", "==", planId),
    where("completed", "==", false)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<Review, "id">)
  }));
}

export async function completeReview(reviewId: string): Promise<void> {
  const docRef = doc(db, "reviews", reviewId);
  await updateDoc(docRef, { completed: true });
}
