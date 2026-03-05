"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaUtensils, FaStar, FaEnvelope } from "react-icons/fa";

export default function AdminNavbar() {
    const pathname = usePathname();

    const links = [
        { href: "/orders", label: "Orders", icon: FaUtensils },
        { href: "/menu", label: "Menu", icon: FaStar },
        { href: "/feedback", label: "Feedback", icon: FaStar },
        { href: "/inquiries", label: "Inquiries", icon: FaEnvelope },
    ];

    return (
        <div className="bg-white border-b border-gray-200">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex">
                <nav className="flex gap-6 overflow-x-auto no-scrollbar">
                    {links.map((link) => {
                        const isActive = pathname === link.href;
                        const Icon = link.icon;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-2 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${isActive ? "border-red-600 text-red-600" : "border-transparent text-gray-500 hover:text-gray-900"
                                    }`}
                            >
                                <Icon className="text-base" />
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}
