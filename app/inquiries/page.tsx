"use client";

import { useState, useEffect } from "react";
import { subscribeToAllInquiries, InquiryData } from "@/lib/inquiries";
import { FaEnvelope, FaUser, FaPhone, FaAt } from "react-icons/fa";
import AdminNavbar from "@/components/AdminNavbar";
import StoreStatusToggle from "@/components/StoreStatusToggle";

export default function InquiriesPage() {
    const [inquiries, setInquiries] = useState<InquiryData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = subscribeToAllInquiries((data) => {
            setInquiries(data);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    return (
        <main className="min-h-screen bg-gray-50">
            {/* Header matches to layout */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FaEnvelope className="text-red-600 text-xl" />
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">Chopstick Admin</h1>
                            <p className="text-xs text-gray-400">Inquiry Management</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <StoreStatusToggle />
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">{inquiries.length} total</p>
                        </div>
                    </div>
                </div>
            </header>

            <AdminNavbar />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <p className="text-gray-500 font-medium">Loading inquiries...</p>
                    </div>
                ) : inquiries.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm mt-4">
                        <FaEnvelope className="text-5xl text-gray-300 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-700 mb-2">No inquiries yet</h2>
                        <p className="text-gray-500">When customers submit contact requests, they will show up here.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 mt-6">
                        {inquiries.map((inq) => (
                            <div key={inq.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                <div className="flex flex-wrap items-start justify-between gap-4 mb-3 border-b border-gray-100 pb-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <FaUser className="text-gray-400" />
                                            <span className="font-bold text-gray-900">{inq.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <FaPhone className="text-gray-400" />
                                            <span className="text-sm text-gray-600">{inq.phone}</span>
                                        </div>
                                        {inq.email && (
                                            <div className="flex items-center gap-2">
                                                <FaAt className="text-gray-400" />
                                                <span className="text-sm text-gray-600">{inq.email}</span>
                                            </div>
                                        )}
                                    </div>
                                    {inq.createdAt && (
                                        <span className="text-xs text-gray-400 whitespace-nowrap bg-gray-50 px-2 py-1 rounded border border-gray-200">
                                            {new Date(inq.createdAt.seconds * 1000).toLocaleString("en-IN", {
                                                dateStyle: "medium", timeStyle: "short"
                                            })}
                                        </span>
                                    )}
                                </div>
                                <div className="mt-3">
                                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{inq.message}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
