"use client";

import { useState, useEffect } from "react";
import { FaStore, FaStoreSlash, FaCircle } from "react-icons/fa";
import { subscribeToRestaurantStatus, setRestaurantStatus } from "@/lib/status";

export default function StoreStatusToggle() {
    const [isOpen, setIsOpen] = useState(true);

    useEffect(() => {
        const unsub = subscribeToRestaurantStatus((status) => {
            setIsOpen(status.isOpen);
        });
        return () => unsub();
    }, []);

    const toggleStatus = async () => {
        const nextState = !isOpen;
        if (confirm(`Are you sure you want to ${nextState ? "OPEN" : "CLOSE"} the restaurant for new orders?`)) {
            try {
                await setRestaurantStatus(nextState);
            } catch (e: any) {
                console.error("Firestore Update Error:", e);
                alert(`Failed to update restaurant status: ${e.message || "Unknown error"}`);
            }
        }
    };

    return (
        <button
            onClick={toggleStatus}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold transition-all cursor-pointer shadow-sm border ${isOpen
                ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                }`}
        >
            <FaCircle className={`text-[8px] ${isOpen ? "text-green-500 animate-pulse" : "text-red-500"}`} />
            {isOpen ? (
                <><FaStore className="text-sm" /> STORE OPEN</>
            ) : (
                <><FaStoreSlash className="text-sm" /> STORE CLOSED</>
            )}
        </button>
    );
}
