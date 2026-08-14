import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = { projectId: "duestuda-95a83" };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  let docs = await getDocs(collection(db, "subjects"));
  for (const d of docs.docs) {
    if (d.id === "AKD9clab7IIg5U9LgsDC") console.log("FOUND IN subjects!");
  }
  let psDocs = await getDocs(collection(db, "plan_subjects"));
  for (const d of psDocs.docs) {
    if (d.id === "AKD9clab7IIg5U9LgsDC") console.log("FOUND IN plan_subjects!");
  }
  console.log("Done");
}
check();
