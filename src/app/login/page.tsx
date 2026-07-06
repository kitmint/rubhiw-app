"use client";

import React, { useState } from "react";
import { authHelper } from "@/lib/authHelper";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");

        let finalEmail = username.trim();
        let finalPassword = password;

        const cleanPhone = finalEmail.replace(/[^0-9]/g, "");
        const isPhoneNumber = /^\d{10}$/.test(cleanPhone);

        if (isPhoneNumber) {
            finalEmail = `${cleanPhone}@rubhiw.com`;
            
            if (!finalPassword) {
                finalPassword = "password123";
            }
        }

        try {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: finalEmail,
                password: finalPassword,
            });

            if (authError) throw authError;

            const session = authData?.session;
            const userId = authData?.user?.id;

            if (session && userId) {
                authHelper.saveTokens(session.access_token, session.refresh_token);

                const { data: profiles, error: profileError } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", userId)
                    .single();

                if (profileError) {
                    console.error("Profile not found:", profileError);
                    router.push("/user/my-orders");
                    return;
                }

                if (profiles.role === "admin") {
                    router.push("/admin/todolist");
                } else {
                    router.push("/user/my-orders");
                }
            }
        } catch (error) {
            console.error("Login error:", error);
            setErrorMsg("ข้อมูลเข้าสู่ระบบไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง");
        } finally {
            setLoading(false);
        } 
    };

    return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex flex-col items-center justify-center p-4 text-black">
      <div className="w-full max-w-md bg-white border border-gray-100 shadow-xl rounded-3xl p-6 md:p-8">
        
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">🔒 เข้าสู่ระบบใช้งาน</h2>
          <p className="text-sm text-gray-400 mt-1">
            กรอกเบอร์โทรศัพท์เพื่อตรวจสอบสถานะออเดอร์
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl p-3.5 text-sm font-medium text-center">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              เบอร์โทรศัพท์
            </label>
            <input
              type="text"
              required
              placeholder="เช่น 0812345678"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              รหัสผ่าน
            </label>
            <input
              type="password"
              placeholder="ลูกค้าสามารถเว้นว่างไว้ได้เลยค่ะ"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-indigo-100 transition duration-150 disabled:opacity-50 text-sm"
          >
            {loading ? "⌛ กำลังตรวจสอบข้อมูล..." : "เข้าสู่ระบบ 🚀"}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-gray-50 pt-4">
          <button 
            onClick={() => router.push("/")}
            className="text-xs font-bold text-gray-400 hover:text-indigo-600 transition"
          >
            ← กลับไปหน้าแรกสุด
          </button>
        </div>

      </div>
    </div>
  );
}