import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

const SETTINGS_COLLECTION = "settings";
const RESTAURANT_DOC_ID = "restaurant";

export interface RestaurantStatus {
    isOpen: boolean;
    lastUpdated?: any;
}

export async function getRestaurantStatus(): Promise<RestaurantStatus> {
    const docRef = doc(db, SETTINGS_COLLECTION, RESTAURANT_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        return snap.data() as RestaurantStatus;
    }
    // Default to open if not set
    return { isOpen: true };
}

export async function setRestaurantStatus(isOpen: boolean) {
    const docRef = doc(db, SETTINGS_COLLECTION, RESTAURANT_DOC_ID);
    await setDoc(docRef, { isOpen, lastUpdated: new Date().toISOString() });
}

export function subscribeToRestaurantStatus(callback: (status: RestaurantStatus) => void): () => void {
    const docRef = doc(db, SETTINGS_COLLECTION, RESTAURANT_DOC_ID);
    return onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
            callback(snap.data() as RestaurantStatus);
        } else {
            callback({ isOpen: true });
        }
    });
}
