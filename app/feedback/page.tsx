"use client";

import { useState, useEffect } from "react";
import { subscribeToAllFeedback, FeedbackData } from "@/lib/feedback";
import { FaStar, FaCommentDots } from "react-icons/fa";
import AdminNavbar from "@/components/AdminNavbar";

export default function FeedbackPage() {
    const [feedbacks, setFeedbacks] = useState<FeedbackData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = subscribeToAllFeedback((data) => {
            setFeedbacks(data);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    return (
        <main className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FaStar className="text-yellow-500 text-xl" />
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">Chopstick Admin</h1>
                            <p className="text-xs text-gray-500">Feedback Management</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{feedbacks.length} total</p>
                    </div>
                </div>
            </header>

            <AdminNavbar />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <p className="text-gray-500 font-medium">Loading feedback...</p>
                    </div>
                ) : feedbacks.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm mt-4">
                        <FaCommentDots className="text-5xl text-gray-300 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-700 mb-2">No feedback yet</h2>
                        <p className="text-gray-500">When customers submit feedback, it will show up here.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 mt-6">
                        {feedbacks.map((fb) => (
                            <div key={fb.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <FaStar
                                                key={star}
                                                className={`text-lg ${star <= fb.rating ? "text-yellow-500" : "text-gray-200"}`}
                                            />
                                        ))}
                                    </div>
                                    {fb.createdAt && (
                                        <p className="text-xs text-gray-400">
                                            {new Date(fb.createdAt.seconds * 1000).toLocaleString("en-IN")}
                                        </p>
                                    )}
                                </div>
                                <div className="text-sm text-gray-500 mb-2">
                                    <span className="font-mono text-gray-400">Order ID: #{fb.orderId.slice(-8).toUpperCase()}</span>
                                </div>
                                {fb.comment && (
                                    <div className="bg-gray-50 p-4 rounded-lg mt-2">
                                        <p className="text-gray-700 text-sm">"{fb.comment}"</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
