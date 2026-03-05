import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { defaultMenu } from "./defaultMenu";

const MENU_COLLECTION = "menuData";
const MENU_DOC_ID = "current";

export async function getMenu() {
    const docRef = doc(db, MENU_COLLECTION, MENU_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        return snap.data();
    }
    return null;
}

export async function saveMenu(menuData: any) {
    const docRef = doc(db, MENU_COLLECTION, MENU_DOC_ID);
    await setDoc(docRef, menuData);
}

export function subscribeToMenu(callback: (menu: any) => void): () => void {
    const docRef = doc(db, MENU_COLLECTION, MENU_DOC_ID);
    return onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
            callback(snap.data());
        } else {
            // Save the default menu to firebase if it never existed
            saveMenu(defaultMenu).then(() => {
                callback(defaultMenu);
            });
        }
    });
}
