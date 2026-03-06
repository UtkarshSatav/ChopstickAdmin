"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { subscribeToAllOrders, updateOrderStatus, deleteAllOrders, Order, OrderStatus } from "@/lib/orders";
import { FaCheckCircle, FaTimesCircle, FaClock, FaUtensils, FaPhone, FaUser, FaMapMarkerAlt, FaBell, FaBellSlash, FaTrashAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import AdminNavbar from "@/components/AdminNavbar";
import StoreStatusToggle from "@/components/StoreStatusToggle";

type FilterTab = "placed" | "accepted" | "out_for_delivery" | "rejected" | "delivered";

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case "accepted":
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                    <FaCheckCircle /> Preparing
                </span>
            );
        case "out_for_delivery":
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                    <FaCheckCircle /> Out for Delivery
                </span>
            );
        case "delivered":
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                    <FaCheckCircle /> Delivered
                </span>
            );
        case "rejected":
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                    <FaTimesCircle /> Rejected
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold animate-pulse">
                    <FaClock /> Pending
                </span>
            );
    }
}

function AdminOrderCard({ order, onUpdateStatus, isRinging }: { order: Order; onUpdateStatus: (id: string, status: OrderStatus) => void; isRinging: boolean }) {
    const [updating, setUpdating] = useState(false);
    const createdAt = order.createdAt
        ? new Date(order.createdAt.seconds * 1000).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
        })
        : "Just now";

    const handleStatusUpdate = async (status: OrderStatus) => {
        if (!order.id) return;
        setUpdating(true);
        try {
            await onUpdateStatus(order.id, status);
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all duration-[2000ms] ${isRinging ? "border-red-500 ring-4 ring-red-400 shadow-2xl shadow-red-200 animate-pulse" : "border-gray-100"
            }`}>
            {/* Ringing banner */}
            {isRinging && (
                <div className="bg-red-500 px-5 py-3 flex items-center gap-3 border-b border-red-600 text-white">
                    <div className="bg-white p-1.5 rounded-full animate-bounce">
                        <FaBell className="text-red-600 text-sm" />
                    </div>
                    <span className="text-white text-sm font-black uppercase tracking-widest animate-[pulse_1s_infinite]">Urgent: New Order!</span>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b border-gray-100">
                <div>
                    <p className="text-xs font-mono text-gray-500">#{order.id?.slice(-8).toUpperCase()}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{createdAt}</p>
                </div>
                <StatusBadge status={order.status} />
            </div>

            {/* Customer Info */}
            <div className="px-5 py-3 border-b border-gray-100 space-y-1.5">
                <div className="flex items-center gap-2 text-sm">
                    <FaUser className="text-gray-400 text-xs" />
                    <span className="font-medium text-accent">{order.customerName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <FaPhone className="text-gray-400 text-xs" />
                    <a href={`tel:${order.customerPhone}`} className="text-blue-600 hover:underline">{order.customerPhone}</a>
                </div>
                {order.address && (
                    <div className="flex items-start gap-2 text-sm">
                        <FaMapMarkerAlt className="text-gray-400 text-xs mt-0.5" />
                        <span className="text-gray-600">
                            {order.address.flatNo}, {order.address.area}
                            {order.address.landmark && ` (${order.address.landmark})`}
                        </span>
                    </div>
                )}
            </div>

            {/* Items */}
            <div className="px-5 py-3 space-y-2">
                {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400 text-xs">×{item.quantity}</span>
                            <span className="text-accent">{item.name}</span>
                        </div>
                        <span className="text-gray-500 text-xs">₹{item.price * item.quantity}</span>
                    </div>
                ))}
            </div>

            {/* Total + Actions */}
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs text-gray-400">Total</p>
                        {order.address.distance && (
                            <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <FaMapMarkerAlt size={8} /> {order.address.distance} km
                            </span>
                        )}
                    </div>
                    <p className="text-xl font-bold text-accent">₹{order.total}</p>
                    {order.deliveryCharge > 0 && (
                        <p className="text-[10px] text-gray-400 mt-0.5">(Inc. ₹{order.deliveryCharge} delivery)</p>
                    )}
                </div>

                {order.status === "placed" && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleStatusUpdate("accepted")}
                            disabled={updating}
                            className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                            <FaCheckCircle /> Accept
                        </button>
                        <button
                            onClick={() => handleStatusUpdate("rejected")}
                            disabled={updating}
                            className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                            <FaTimesCircle /> Reject
                        </button>
                    </div>
                )}
                {order.status === "accepted" && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleStatusUpdate("out_for_delivery")}
                            disabled={updating}
                            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                            <FaCheckCircle /> Out for Delivery
                        </button>
                    </div>
                )}
                {order.status === "out_for_delivery" && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleStatusUpdate("delivered")}
                            disabled={updating}
                            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                            <FaCheckCircle /> Mark Delivered
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<FilterTab>("placed");

    useEffect(() => {
        const unsub = subscribeToAllOrders((allOrders) => {
            setOrders(allOrders);
            setLoading(false);

            // Section 9 - Scroll admin dashboard to new order immediately
            if (allOrders.some(o => o.status === "placed")) {
                setTimeout(() => {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                }, 100);
            }
        });
        return () => unsub();
    }, []);

    const handleClearAll = async () => {
        if (confirm("Are you sure you want to erase ALL orders permanently? This cannot be undone.")) {
            await deleteAllOrders();
        }
    };

    const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
        await updateOrderStatus(orderId, status);
    };

    const filteredOrders = orders.filter((o) => o.status === activeTab);

    const counts = {
        all: orders.length,
        placed: orders.filter((o) => o.status === "placed").length,
        accepted: orders.filter((o) => o.status === "accepted").length,
        out_for_delivery: orders.filter((o) => o.status === "out_for_delivery").length,
        rejected: orders.filter((o) => o.status === "rejected").length,
        delivered: orders.filter((o) => o.status === "delivered").length,
    };

    const tabs: { key: FilterTab; label: string; color: string }[] = [
        { key: "placed", label: "Pending", color: "bg-yellow-100 text-yellow-700" },
        { key: "accepted", label: "Preparing", color: "bg-green-100 text-green-700" },
        { key: "out_for_delivery", label: "Out for Delivery", color: "bg-indigo-100 text-indigo-700" },
        { key: "rejected", label: "Rejected", color: "bg-red-100 text-red-700" },
    ];

    return (
        <main className="min-h-screen bg-gray-50">
            {/* Admin Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FaUtensils className="text-primary text-xl" />
                        <div>
                            <h1 className="text-lg font-bold text-accent">Chopstick Admin</h1>
                            <p className="text-xs text-gray-400">Order Management</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleClearAll}
                            className="p-2 rounded-full text-red-400 bg-red-50 hover:bg-red-100 hover:text-red-600 transition-colors"
                            title="Fresh Database: Erase all order history"
                        >
                            <FaTrashAlt size={16} />
                        </button>
                        <div className="text-right">
                            <p className="text-sm font-medium text-accent">{counts.placed} pending</p>
                            <p className="text-xs text-gray-400">{counts.all} total orders</p>
                        </div>
                    </div>
                </div>
            </header>

            <AdminNavbar />

            {/* Filter Tabs */}
            <div className="bg-white border-b border-gray-200 sticky top-[76px] z-30">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex gap-2 overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${activeTab === tab.key
                                ? `${tab.color} ring-2 ring-offset-1 ring-gray-300`
                                : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                                }`}
                        >
                            {tab.label} ({counts[tab.key]})
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders List */}
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="max-w-2xl mx-auto space-y-4">
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full"></div>
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="text-center py-20">
                            <FaUtensils className="text-4xl text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-400 text-lg">No {activeTab} orders</p>
                        </div>
                    ) : (
                        filteredOrders.map((order) => (
                            <AdminOrderCard
                                key={order.id}
                                order={order}
                                onUpdateStatus={handleUpdateStatus}
                                isRinging={order.status === "placed"}
                            />
                        ))
                    )}
                </div>
            </div>
        </main>
    );
}
