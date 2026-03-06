"use client";

import { useEffect, useRef } from "react";
import { subscribeToAllOrders } from "@/lib/orders";

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

export default function AudioNotification() {
    const alertsEnabled = useRef(false);
    const audioUnlocked = useRef(false);
    const alertedOrders = useRef<Set<string>>(new Set());
    const pendingCount = useRef(0);
    const workerRef = useRef<Worker | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        // Section 7 - Browser Notifications (Tab Minimized Alert)
        if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }

        // Section 2 - Audio Unlock (Autoplay Fix)
        const handleInteraction = () => {
            if (!audioUnlocked.current) {
                const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                if (!audioCtxRef.current) {
                    audioCtxRef.current = new AudioCtx();
                }
                const ctx = audioCtxRef.current;

                // Silent interaction fragment to force browser to allow sound
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                gain.gain.value = 0;
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.1);

                const unlockAndPlay = () => {
                    alertsEnabled.current = true;
                    audioUnlocked.current = true;
                    if (pendingCount.current > 0) {
                        workerRef.current?.postMessage('start');
                    }
                };

                if (ctx.state === "suspended") {
                    ctx.resume().then(unlockAndPlay).catch(() => { });
                } else {
                    unlockAndPlay();
                }
            }
        };

        document.addEventListener("click", handleInteraction);
        document.addEventListener("touchstart", handleInteraction);

        // Section 7 - Initialize Anti-Throttling Web Worker
        // Browsers severely throttle setInterval in background tabs (to 1x per minute).
        // Web Workers are generally exempt or less severely throttled.
        const workerCode = `
            let timer = null;
            self.onmessage = function(e) {
                if (e.data === 'start') {
                    if (!timer) {
                        // Ring every 3 seconds
                        timer = setInterval(() => self.postMessage('tick'), 3000);
                        self.postMessage('tick'); // Immediate first tick
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
            if (!ctx) return;

            // Defeat auto-suspend by forcibly resuming audio context on every tick
            if (ctx.state === "suspended") {
                await ctx.resume().catch(() => { });
            }
            if (ctx.state === "running") {
                createBellSound(ctx);
            }
        };

        return () => {
            document.removeEventListener("click", handleInteraction);
            document.removeEventListener("touchstart", handleInteraction);
            worker.terminate();
        };
    }, []);

    // Section 3 - Continuous Bell Engine
    const startBell = () => {
        if (!alertsEnabled.current) return;
        workerRef.current?.postMessage('start');
    };

    const stopBell = () => {
        workerRef.current?.postMessage('stop');
    };

    useEffect(() => {
        // Section 4, 5, 8 - Realtime Listener, Refresh Recovery & Multiple Orders
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

            // Remove handled orders from Set
            const pendingIds = new Set(pendingOrders.map(o => o.id));
            alertedOrders.current.forEach(id => {
                if (!pendingIds.has(id)) {
                    alertedOrders.current.delete(id);
                }
            });

            // Continue while > 0 pending
            if (pendingOrders.length > 0) {
                startBell();
            } else {
                stopBell();
            }
        });

        // Section 6 - Internet Reconnect Fallback
        const handleOnline = () => {
            if (alertedOrders.current.size > 0 && alertsEnabled.current) startBell();
        };
        window.addEventListener("online", handleOnline);

        return () => {
            unsub();
            window.removeEventListener("online", handleOnline);
            stopBell();
        };
    }, []);

    return null;
}
