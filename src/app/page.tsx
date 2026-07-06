"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col items-center justify-center p-6 text-black">
      <div className="max-w-2xl w-full text-center space-y-8 bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-gray-100">
        
        {/* หัวข้อระบบ */}
        <div className="space-y-3">
          <div className="inline-block bg-purple-100 text-purple-700 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
            🎉 Welcome to RubHiw by kitmintii
          </div>
          {/* <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            เช็คสถานะออเดอร์และเลขพัสดุของตัวเอง
          </h1> */}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
          {/* page my-orders */}
          <Link 
            href="/login" 
            className="group p-6 bg-white border border-gray-100 rounded-3xl shadow-md hover:shadow-lg transition flex flex-col items-center text-center"
          >
            <span className="text-3xl block group-hover:scale-110 transition-transform">📝</span>
            <h3 className="text-lg font-bold text-gray-800 group-hover:text-white mt-3">ออเดอร์ของฉัน</h3>
            <p className="text-sm text-gray-500 group-hover:text-indigo-100 mt-1">
              เช็คสถานะออเดอร์และเลขพัสดุของตัวเอง
            </p>
          </Link>

          

        </div>

        {/* ท้ายเว็บ */}
        <div className="text-xs text-gray-400 pt-4 border-t border-gray-100">
          ติดต่อสอบถาม/ฝากหิ้ว lineID : @653cgfqv
        </div>

      </div>
    </div>
  );
}