"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { subscribeToAllOrders, updateOrderStatus, Order, OrderStatus } from "@/lib/orders";
import { FaCheckCircle, FaTimesCircle, FaClock, FaUtensils, FaPhone, FaUser, FaMapMarkerAlt, FaBell, FaBellSlash } from "react-icons/fa";

type FilterTab = "all" | "placed" | "accepted" | "rejected";

// ─── Loud Bell Sound via Web Audio API ───
function createBellSound(audioCtx: AudioContext) {
    // Play a double-strike for urgency
    playBellStrike(audioCtx, audioCtx.currentTime);
    playBellStrike(audioCtx, audioCtx.currentTime + 0.25);
}

function playBellStrike(audioCtx: AudioContext, startTime: number) {
    const freqs = [830, 1245, 1660, 2490]; // fundamental + harmonics
    const gains = [1.0, 0.7, 0.5, 0.3];
    const durations = [1.2, 0.9, 0.7, 0.5];

    freqs.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        osc.type = i === 0 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(freq, startTime);

        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(gains[i], startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + durations[i]);

        // Boost with compressor for max loudness
        const compressor = audioCtx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-10, startTime);
        compressor.knee.setValueAtTime(5, startTime);
        compressor.ratio.setValueAtTime(4, startTime);

        osc.connect(gainNode).connect(compressor).connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + durations[i]);
    });
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case "accepted":
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                    <FaCheckCircle /> Accepted
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
        <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all duration-300 ${isRinging ? "border-yellow-400 ring-2 ring-yellow-300 shadow-lg shadow-yellow-100" : "border-gray-100"
            }`}>
            {/* Ringing banner */}
            {isRinging && (
                <div className="bg-yellow-50 px-5 py-2 flex items-center gap-2 border-b border-yellow-200">
                    <FaBell className="text-yellow-600 animate-bounce text-sm" />
                    <span className="text-yellow-700 text-xs font-bold animate-pulse">🔔 New order incoming!</span>
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
                    <p className="text-xs text-gray-400">Total</p>
                    <p className="text-xl font-bold text-accent">₹{order.total}</p>
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
            </div>
        </div>
    );
}

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<FilterTab>("all");
    const [ringingOrderIds, setRingingOrderIds] = useState<Set<string>>(new Set());
    const [soundEnabled, setSoundEnabled] = useState(true);

    const knownOrderIdsRef = useRef<Set<string>>(new Set());
    const audioCtxRef = useRef<AudioContext | null>(null);
    const bellIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
    const bellTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
    const isFirstLoadRef = useRef(true);

    // Initialize AudioContext on first user interaction
    const ensureAudioCtx = useCallback(() => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioCtxRef.current.state === "suspended") {
            audioCtxRef.current.resume();
        }
        return audioCtxRef.current;
    }, []);

    // Start ringing for an order
    const startRinging = useCallback((orderId: string) => {
        if (!soundEnabled) return;

        const ctx = ensureAudioCtx();

        // Play bell immediately
        createBellSound(ctx);

        // Repeat every 2 seconds
        const interval = setInterval(() => {
            createBellSound(ctx);
        }, 1500);
        bellIntervalsRef.current.set(orderId, interval);

        // Auto-stop after 15 seconds
        const timeout = setTimeout(() => {
            stopRinging(orderId);
        }, 15000);
        bellTimeoutsRef.current.set(orderId, timeout);

        setRingingOrderIds((prev) => new Set(prev).add(orderId));
    }, [soundEnabled, ensureAudioCtx]);

    // Stop ringing for an order
    const stopRinging = useCallback((orderId: string) => {
        const interval = bellIntervalsRef.current.get(orderId);
        if (interval) {
            clearInterval(interval);
            bellIntervalsRef.current.delete(orderId);
        }
        const timeout = bellTimeoutsRef.current.get(orderId);
        if (timeout) {
            clearTimeout(timeout);
            bellTimeoutsRef.current.delete(orderId);
        }
        setRingingOrderIds((prev) => {
            const next = new Set(prev);
            next.delete(orderId);
            return next;
        });
    }, []);

    useEffect(() => {
        const unsub = subscribeToAllOrders((allOrders) => {
            // Detect new orders with status "placed"
            if (!isFirstLoadRef.current) {
                allOrders.forEach((order) => {
                    if (order.id && order.status === "placed" && !knownOrderIdsRef.current.has(order.id)) {
                        startRinging(order.id);
                    }
                    // Stop ringing if order was accepted/rejected
                    if (order.id && order.status !== "placed" && ringingOrderIds.has(order.id)) {
                        stopRinging(order.id);
                    }
                });
            }

            // Update known order IDs
            knownOrderIdsRef.current = new Set(allOrders.map((o) => o.id!));
            isFirstLoadRef.current = false;

            setOrders(allOrders);
            setLoading(false);
        });

        return () => {
            unsub();
            // Clean up all intervals/timeouts
            bellIntervalsRef.current.forEach((interval) => clearInterval(interval));
            bellTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
        };
    }, [startRinging, stopRinging]);

    const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
        stopRinging(orderId);
        await updateOrderStatus(orderId, status);
    };

    const filteredOrders = activeTab === "all"
        ? orders
        : orders.filter((o) => o.status === activeTab);

    const counts = {
        all: orders.length,
        placed: orders.filter((o) => o.status === "placed").length,
        accepted: orders.filter((o) => o.status === "accepted").length,
        rejected: orders.filter((o) => o.status === "rejected").length,
    };

    const tabs: { key: FilterTab; label: string; color: string }[] = [
        { key: "all", label: "All", color: "bg-gray-100 text-gray-700" },
        { key: "placed", label: "Pending", color: "bg-yellow-100 text-yellow-700" },
        { key: "accepted", label: "Accepted", color: "bg-green-100 text-green-700" },
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
                        {/* Sound toggle */}
                        <button
                            onClick={() => {
                                ensureAudioCtx();
                                setSoundEnabled((prev) => !prev);
                            }}
                            className={`p-2 rounded-full transition-colors cursor-pointer ${soundEnabled ? "text-yellow-600 bg-yellow-50 hover:bg-yellow-100" : "text-gray-400 bg-gray-100 hover:bg-gray-200"
                                }`}
                            title={soundEnabled ? "Sound On — click to mute" : "Sound Off — click to unmute"}
                        >
                            {soundEnabled ? <FaBell size={16} /> : <FaBellSlash size={16} />}
                        </button>
                        <div className="text-right">
                            <p className="text-sm font-medium text-accent">{counts.placed} pending</p>
                            <p className="text-xs text-gray-400">{counts.all} total orders</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Filter Tabs */}
            <div className="bg-white border-b border-gray-200 sticky top-[64px] z-30">
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
                            <p className="text-gray-400 text-lg">No {activeTab === "all" ? "" : activeTab} orders</p>
                        </div>
                    ) : (
                        filteredOrders.map((order) => (
                            <AdminOrderCard
                                key={order.id}
                                order={order}
                                onUpdateStatus={handleUpdateStatus}
                                isRinging={ringingOrderIds.has(order.id!)}
                            />
                        ))
                    )}
                </div>
            </div>
        </main>
    );
}
