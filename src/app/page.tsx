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
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            ระบบรับหิ้วของคอนเสิร์ต
          </h1>
          {/* <p className="text-gray-500 font-medium max-w-md mx-auto">
            จัดการออเดอร์อย่างเป็นระบบ สรุปยอดหิ้วหน้าบูธได้รวดเร็ว และเช็กสถานะพัสดุได้ง่ายดาย
          </p> */}
        </div>

        {/* ปุ่มเลือกทางเข้า (Portal Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          
          {/* การ์ดฝั่งลูกค้า */}
          <Link 
            href="/login" 
            className="group p-6 bg-gray-50 hover:bg-indigo-600 border border-gray-200 hover:border-indigo-600 rounded-2xl text-left transition-all duration-300 shadow-sm hover:shadow-indigo-100"
          >
            <span className="text-3xl block group-hover:scale-110 transition-transform">🎒</span>
            <h3 className="text-lg font-bold text-gray-800 group-hover:text-white mt-3">ฝั่งสำหรับลูกค้า</h3>
            <p className="text-sm text-gray-500 group-hover:text-indigo-100 mt-1">
              เช็คสินค้าฝากหิ้ว และล็อกอินเข้าดูสถานะออเดอร์/เลขพัสดุของตัวเอง
            </p>
          </Link>

          {/* การ์ดฝั่งแอดมิน */}
          <Link 
            href="/login" 
            className="group p-6 bg-gray-50 hover:bg-purple-600 border border-gray-200 hover:border-purple-600 rounded-2xl text-left transition-all duration-300 shadow-sm hover:shadow-purple-100"
          >
            <span className="text-3xl block group-hover:scale-110 transition-transform">⚙️</span>
            <h3 className="text-lg font-bold text-gray-800 group-hover:text-white mt-3">ระบบจัดการแอดมิน</h3>
            <p className="text-sm text-gray-500 group-hover:text-purple-100 mt-1">
              เพิ่มสินค้า ปรับสถานะ และดูยอดรวมของที่ต้องหิ้วทั้งหมด
            </p>
          </Link>

        </div>

        {/* ท้ายเว็บ */}
        <div className="text-xs text-gray-400 pt-4 border-t border-gray-100">
          ติดต่อได้ที่ lineID : @653cgfqv
        </div>

      </div>
    </div>
  );
}