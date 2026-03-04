"use client";

import { useState, useEffect } from "react";
import { FaLock } from "react-icons/fa";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (typeof window !== "undefined") {
            const auth = localStorage.getItem("chopstick-admin-auth");
            if (auth === "true") {
                setIsAuthenticated(true);
            }
        }
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // A simple hardcoded password protection for the dashboard
        if (password === "admin123") {
            setIsAuthenticated(true);
            localStorage.setItem("chopstick-admin-auth", "true");
            setError("");
        } else {
            setError("Incorrect password");
        }
    };

    if (!mounted) return null;

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
                        <FaLock />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Access</h1>
                    <p className="text-gray-500 mb-8">Enter password to access Chopstick admin portal.</p>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium"
                                required
                            />
                        </div>
                        {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
                        <button
                            type="submit"
                            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors cursor-pointer shadow-md"
                        >
                            Login
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
