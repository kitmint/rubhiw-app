"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminNavbar() {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    { name: "📝 โพยรวมยอดของต้องหิ้ว", path: "/admin/todolist" },
    { name: "🛍️ จดออเดอร์เปิดบิล", path: "/admin/add-orders" },
    { name: "📋 รายการบิลทั้งหมด", path: "/admin/orders" }, 
    { name: "📦 รายการสินค้าทั้งหมด", path: "/admin/products" },
  ];

  const handleLogout = async () => {
    const confirmLogout = window.confirm("คุณต้องการออกจากระบบใช่หรือไม่?");
    if (confirmLogout) {
      await supabase.auth.signOut();
      router.push("/login");
    }
  };

  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40 text-black">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          
          {/* ส่วนหัวแบรนด์ */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/admin/todolist")}>
            <span className="text-xl">🏃‍♂️</span>
            <span className="font-black text-lg bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              RUBHIW ADMIN
            </span>
          </div>

          {/* ปุ่มรายการหน้าต่าง ๆ */}
          <div className="hidden md:flex items-center gap-1 font-medium text-sm">
            {menuItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`px-4 py-2 rounded-xl transition duration-150 ${
                    isActive
                      ? "bg-indigo-50 text-indigo-600 font-bold border border-indigo-100/50"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  {item.name}
                </button>
              );
            })}
          </div>

          {/* ปุ่มออกจากระบบ */}
          <div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 border border-red-100 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition duration-150"
            >
              🚪 ออกจากระบบ
            </button>
          </div>

        </div>

        {/* แถบเมนูด้านล่างสำหรับเปิดบนโทรศัพท์มือถือ (Mobile Responsive Tabs) */}
        <div className="flex md:hidden border-t border-gray-50 py-2 justify-around text-xs font-bold bg-white">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`flex flex-col items-center gap-1 p-1 transition ${
                  isActive ? "text-indigo-600" : "text-gray-400"
                }`}
              >
                <span>{item.name.split(" ")[1]}</span> {/* เอาเฉพาะข้อความหลังอีโมจิ */}
              </button>
            );
          })}
        </div>

      </div>
    </nav>
  );
}