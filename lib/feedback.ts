import { collection, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface FeedbackData {
    id?: string;
    orderId: string;
    rating: number;
    comment: string;
    createdAt?: Timestamp;
}

export function subscribeToAllFeedback(callback: (feedback: FeedbackData[]) => void): () => void {
    const q = query(collection(db, "feedback"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as FeedbackData));
        callback(items);
    });
}
