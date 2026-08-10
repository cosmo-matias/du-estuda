import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ReviewItem } from "@/types";

const reviewsRef = collection(db, "reviews");

export async function addReview(data: Omit<ReviewItem, "id">): Promise<ReviewItem> {
  const docRef = await addDoc(reviewsRef, data);
  return { id: docRef.id, ...data };
}

export async function getReviewsByPlan(userId: string, planId: string): Promise<ReviewItem[]> {
  const q = query(
    reviewsRef,
    where("userId", "==", userId),
    where("planId", "==", planId)
  );
  
  const snapshot = await getDocs(q);
  const now = new Date();
  
  return snapshot.docs.map(doc => {
    const data = doc.data() as Omit<ReviewItem, "id">;
    let status = data.status;
    
    // Calcula dinamicamente se está atrasada
    if (status === 'scheduled') {
      const scheduledDate = new Date(data.scheduledDate);
      if (scheduledDate.setHours(0,0,0,0) < now.setHours(0,0,0,0)) {
        status = 'delayed';
      }
    }
    
    return {
      id: doc.id,
      ...data,
      status
    };
  });
}

export async function completeReview(reviewId: string): Promise<void> {
  const docRef = doc(db, "reviews", reviewId);
  await updateDoc(docRef, { 
    status: 'completed',
    completedDate: new Date().toISOString()
  });
}

export async function ignoreReview(reviewId: string): Promise<void> {
  const docRef = doc(db, "reviews", reviewId);
  await updateDoc(docRef, { status: 'ignored' });
}

export async function deleteReview(reviewId: string): Promise<void> {
  const docRef = doc(db, "reviews", reviewId);
  await deleteDoc(docRef);
}
