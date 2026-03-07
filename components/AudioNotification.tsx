"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeToAllOrders } from "@/lib/orders";
import { motion, AnimatePresence } from "framer-motion";
import { FaVolumeUp, FaBell, FaShieldAlt } from "react-icons/fa";

// ─── Loud Bell Sound via Web Audio API ───
function createBellSound(audioCtx: AudioContext) {
    playBellStrike(audioCtx, audioCtx.currentTime);
    playBellStrike(audioCtx, audioCtx.currentTime + 0.25);
}

function playBellStrike(audioCtx: AudioContext, startTime: number) {
    const freqs = [830, 1245, 1660, 2490];
    const gains = [1.0, 0.7, 0.5, 0.3];
    const durations = [1.2, 0.9, 0.7, 0.5];

    freqs.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        osc.type = i === 0 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(freq, startTime);

        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(gains[i], startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + durations[i]);

        const compressor = audioCtx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-10, startTime);
        compressor.knee.setValueAtTime(5, startTime);
        compressor.ratio.setValueAtTime(4, startTime);

        osc.connect(gainNode).connect(compressor).connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + durations[i]);
    });
}

// Silent tick to keep AudioContext active
function playSilentTick(audioCtx: AudioContext) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    gain.gain.value = 0.0001; // Extremely low gain, practically silent
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

export default function AudioNotification() {
    const [showOverlay, setShowOverlay] = useState(true);
    const [audioInitialized, setAudioInitialized] = useState(false);
    
    const alertsEnabled = useRef(false);
    const alertedOrders = useRef<Set<string>>(new Set());
    const pendingCount = useRef(0);
    const workerRef = useRef<Worker | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const wakeLockRef = useRef<any>(null);

    // Request Wake Lock to prevent system sleep
    const requestWakeLock = async () => {
        if ('wakeLock' in navigator) {
            try {
                wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
                console.log('Wake Lock is active');
                
                wakeLockRef.current.addEventListener('release', () => {
                    console.log('Wake Lock was released');
                });
            } catch (err: any) {
                console.error(`${err.name}, ${err.message}`);
            }
        }
    };

    const handleEnableAudio = async () => {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!audioCtxRef.current) {
            audioCtxRef.current = new AudioCtx();
        }
        const ctx = audioCtxRef.current;

        // Unlock audio context
        if (ctx.state === "suspended") {
            await ctx.resume().catch(() => { });
        }

        // Test sound and initialize
        playSilentTick(ctx);
        
        alertsEnabled.current = true;
        setAudioInitialized(true);
        setShowOverlay(false);

        // Start Wake Lock
        requestWakeLock();

        // If there are already pending orders, start the bell
        if (pendingCount.current > 0) {
            workerRef.current?.postMessage('start');
        }
    };

    useEffect(() => {
        // Section 7 - Initialize Anti-Throttling Web Worker
        const workerCode = `
            let timer = null;
            self.onmessage = function(e) {
                if (e.data === 'start') {
                    if (!timer) {
                        // Heartbeat/Ring every 3 seconds
                        timer = setInterval(() => self.postMessage('tick'), 3000);
                        self.postMessage('tick');
                    }
                } else if (e.data === 'stop') {
                    clearInterval(timer);
                    timer = null;
                }
            };
        `;
        const blob = new Blob([workerCode], { type: "application/javascript" });
        const worker = new Worker(URL.createObjectURL(blob));
        workerRef.current = worker;

        worker.onmessage = async () => {
            const ctx = audioCtxRef.current;
            if (!ctx || !alertsEnabled.current) return;

            if (ctx.state === "suspended") {
                await ctx.resume().catch(() => { });
            }

            if (pendingCount.current > 0) {
                // Actually ring
                createBellSound(ctx);
            } else {
                // Keep alive silent tick
                playSilentTick(ctx);
            }
        };

        // Re-request wake lock when page becomes visible
        const handleVisibilityChange = () => {
            if (wakeLockRef.current !== null && document.visibilityState === 'visible') {
                requestWakeLock();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Request browser notification permission
        if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }

        return () => {
            worker.terminate();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (wakeLockRef.current) {
                wakeLockRef.current.release().catch(() => {});
            }
        };
    }, []);

    const startBell = () => {
        if (!alertsEnabled.current) return;
        workerRef.current?.postMessage('start');
    };

    const stopBell = () => {
        // We actually want the worker to keep running for keep-alive, 
        // but we'll control the sound based on pendingCount.
        // However, if we want to save some CPU we could stop it if NO orders and NO keep-alive needed.
        // User said "every 3 seconds calls out so it does not sleep", so we keep it running.
        if (pendingCount.current === 0) {
            // Keep it starting if we want the 3s keep-alive
            workerRef.current?.postMessage('start');
        }
    };

    useEffect(() => {
        const unsub = subscribeToAllOrders((allOrders) => {
            const pendingOrders = allOrders.filter(o => o.status === "placed");
            pendingCount.current = pendingOrders.length;

            pendingOrders.forEach(order => {
                if (order.id && !alertedOrders.current.has(order.id)) {
                    alertedOrders.current.add(order.id);

                    if ("Notification" in window && Notification.permission === "granted") {
                        new Notification("New Order Received", {
                            body: `A new order has arrived from ${order.customerName}.`,
                            icon: "/favicon.ico"
                        });
                    }
                }
            });

            const pendingIds = new Set(pendingOrders.map(o => o.id));
            alertedOrders.current.forEach(id => {
                if (!pendingIds.has(id)) {
                    alertedOrders.current.delete(id);
                }
            });

            // Start worker for both ringing and keep-alive
            if (audioInitialized) {
                startBell();
            }
        });

        return () => {
            unsub();
        };
    }, [audioInitialized]);

    return (
        <>
            <AnimatePresence>
                {showOverlay && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-gray-100"
                        >
                            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl animate-pulse">
                                <FaVolumeUp />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">Enable Order Alerts</h2>
                            <p className="text-gray-500 mb-8 leading-relaxed">
                                To ensure you never miss an order, we need to enable audio and prevent your device from sleeping.
                            </p>
                            <button
                                onClick={handleEnableAudio}
                                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-3 text-lg cursor-pointer"
                            >
                                <FaBell className="text-xl" />
                                Enable Audio & Status
                            </button>
                            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
                                <FaShieldAlt />
                                <span>Ensures 100% notification reliability</span>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Audio Status Indicator for Admin */}
            {audioInitialized && (
                <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold shadow-sm border border-green-200">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                    Audio & Wake Lock Active
                </div>
            )}
        </>
    );
}

