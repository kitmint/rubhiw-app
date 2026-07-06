"use client";

import React, { useEffect, useState } from "react";
import { authHelper } from "@/lib/authHelper";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdminNavbar from "@/components/AdminNavbar";


export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [authenticated, setAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAdminRole = async () => {
            try {
                const token = authHelper.getAccessToken();
                if (!token) {
                    router.push("/login");
                    return;
                }

                const { data: { user }, error: userError } = await supabase.auth.getUser(token);

                if (!user) {
                    router.push("/login");
                    return;
                }

                const { data: profile, error } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", user.id)
                    .single();
                
                if (error || profile?.role !== "admin") {
                    console.warn("User is not an admin or profile not found:", error);
                    router.push("/");
                    return;
                }

                setAuthenticated(true);
            } catch (error) {
                console.error("Error checking admin role:", error);
                router.push("/login");
            } finally {
                setLoading(false);
            }
        };

        checkAdminRole();
    }, [router]);
    
    if (loading) {
        return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center text-black">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-medium text-gray-500">Checking admin status...</p>
            </div>
        </div>
        );
    }

    return authenticated ? (
        <>
            <AdminNavbar />
            <main className="py-8">
                {children}
            </main>
        </>
    ) : null;
}