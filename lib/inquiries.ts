import { collection, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface InquiryData {
    id?: string;
    name: string;
    phone: string;
    email?: string;
    message: string;
    createdAt?: Timestamp;
}

export function subscribeToAllInquiries(callback: (inquiries: InquiryData[]) => void): () => void {
    const q = query(collection(db, "contacts"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as InquiryData));
        callback(items);
    });
}
