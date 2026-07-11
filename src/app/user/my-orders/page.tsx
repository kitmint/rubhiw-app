"use client";

import React, { useEffect, useState } from "react";
import { authHelper } from "@/lib/authHelper";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

interface OrderItem {
    id: number;
    quantity: number;
    selected_size: string;
    products: {
        name: string;
        image_url: string | null;
    } | null;
}

interface Order {
    id: number;
    status: string;
    tracking_number: string | null;
    created_at: string;
    contact: string;
    order_items: OrderItem[];
}

export default function MyOrdersPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    const getStatusBadge = (status: string) => {
    const styles: { [key: string]: string } = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    buying: "bg-sky-100 text-sky-800 border-sky-200",
    waiting_pack: "bg-indigo-100 text-indigo-800 border-indigo-200",
    shipped: "bg-emerald-100 text-emerald-800 border-emerald-200",
    out_of_stock: "bg-rose-100 text-rose-800 border-rose-200",
    refunded: "bg-slate-100 text-slate-700 border-slate-300 bg-opacity-50",
    cancelled: "bg-gray-100 text-gray-800 border-gray-200",
    };

    const labels: { [key: string]: string } = {
        pending: "⏳ รอตรวจสอบ",
        buying: "🛍️ กำลังหิ้ว",
        waiting_pack: "📦 หิ้วได้ (รอแพ็ค)",
        shipped: "🚚 จัดส่งแล้ว",
        out_of_stock: "❌ ของหมด (รอคืนเงิน)",
        refunded: "💰 คืนเงินเรียบร้อย",
        cancelled: "🚫 ยกเลิกออเดอร์",
    };

    const currentStyle = styles[status] || "bg-slate-100 text-slate-800 border-slate-200";
    const currentLabel = labels[status] || status;

    return (
        <span className={`inline-block whitespace-nowrap text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full border ${currentStyle}`}>
        {currentLabel}
        </span>
    );
    };

    useEffect(() => {
        const fetchOrders = async () => {
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

                const userPhone = user.email ? user.email.split("@")[0] : "";

                if (!userPhone) {
                    console.error("ไม่พบข้อมูลเบอร์โทรศัพท์ในระบบล็อกอิน");
                    setLoading(false);
                    return;
                }

                //ดึงข้อมูลออเดอร์ของผู้ใช้จาก Supabase โดยใช้เบอร์โทรศัพท์เป็นตัวกรอง
                const { data, error } = await supabase
                    .from("orders")
                    .select(`
                        id,
                        status,
                        tracking_number,
                        created_at,
                        contact,
                        order_items (
                            id,
                            quantity,
                            selected_size,
                            products (
                                name,
                                image_url
                            )
                        )
                    `)
                    .eq("contact", userPhone)
                    .order("created_at", { ascending: false });

                if (error) throw error;
                setOrders(data as unknown as Order[] || []);
            } catch (error) {
                console.error("Error fetching orders:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        authHelper.clearTokens();
        router.push("/login");
    }

    if (loading) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-gray-500 text-sm font-medium">กำลังโหลดรายการออเดอร์ของคุณ...</div>;
    }

    return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-4 md:p-8 text-black flex flex-col items-center">
      <div className="max-w-3xl w-full space-y-4 sm:space-y-6">
          
        {/* ส่วนหัวหน้าจอ */}
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-base sm:text-lg font-black text-gray-900">🎒 รายการออเดอร์ฝากหิ้วของฉัน</h1>
            <p className="text-[11px] sm:text-xs text-gray-400">เช็กสถานะบิลและเลขพัสดุจัดส่ง</p>
          </div>
          <button onClick={handleLogout} className="text-[11px] sm:text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold px-3 py-2 rounded-xl transition whitespace-nowrap">
            ออกจากระบบ
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center text-gray-400 text-xs sm:text-sm font-medium shadow-sm border border-gray-100">
            ไม่พบประวัติรายการสั่งซื้อของคุณในระบบในตอนนี้
          </div>
        ) : (
          <>
            {/* 📱 1. โหมดการ์ดสำหรับหน้าจอมือถือ (ซ่อนบนจอคอม md:hidden) */}
            <div className="block md:hidden space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3.5">
                  {/* แสดงรายการสินค้าข้างในบิล */}
                  <div className="space-y-2">
                    {order.order_items && order.order_items.length > 0 ? (
                      order.order_items.map((item: OrderItem) => (
                        <div key={item.id} className="flex items-center gap-3 bg-gray-50/60 p-2 rounded-xl border border-gray-100/50">
                          {/* รูปภาพสินค้า */}
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center border border-gray-200/50">
                            {item.products?.image_url && item.products.image_url.trim() !== "" ? (
                              <Image 
                                src={item.products.image_url} 
                                alt={item.products.name || "Product"} 
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] text-gray-400 font-bold">ไม่มีรูป</span>
                            )}
                          </div>

                          {/* รายละเอียดสินค้า */}
                          <div className="flex flex-col text-xs min-w-0 flex-1">
                            <span className="font-bold text-gray-900 truncate">
                              {item.products?.name || "สินค้าไม่ระบุชื่อ"}
                            </span>
                            <span className="text-gray-500 font-medium mt-0.5">
                              จำนวน: <span className="text-indigo-600 font-bold">{item.quantity}</span> ชิ้น 
                              {item.selected_size && item.selected_size !== "N/A" && (
                                <> | ขนาด: <span className="text-slate-700 font-bold">{item.selected_size}</span></>
                              )}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-2 text-gray-400 text-xs font-bold py-1">
                        📦 <span>บิลว่างเปล่า (ไม่มีรายการสินค้า)</span>
                      </div>
                    )}
                  </div>

                  {/* แผงสถานะและเลขพัสดุด้านล่างการ์ด (แยกฝั่งซ้าย-ขวา) */}
                  <div className="flex items-center justify-between pt-3 border-t border-dashed border-gray-100">
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1">สถานะออเดอร์</p>
                      <div className="flex-shrink-0">
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1">เลขพัสดุ TRACKING</p>
                      {order.tracking_number ? (
                        <span className="inline-block bg-slate-100 px-2 py-0.5 rounded text-xs font-mono font-bold text-gray-700 border border-slate-200/60 tracking-wider whitespace-nowrap">
                          {order.tracking_number}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium">📭 ยังไม่มีเลขพัสดุ</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 💻 2. โหมดตารางมาตรฐานสำหรับจอคอมพิวเตอร์ (ซ่อนบนมือถือ md:block) */}
            <div className="hidden md:block bg-white rounded-3xl shadow-md border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-100 text-xs font-bold uppercase text-gray-500">
                      <th className="p-4">สินค้า</th>
                      <th className="p-4">สถานะ</th>
                      <th className="p-4">เลขพัสดุ tracking</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/50 transition items-start">
                        <td className="p-4">
                          <div className="space-y-3">
                            {order.order_items && order.order_items.length > 0 ? (
                              order.order_items.map((item: OrderItem) => (
                                <div key={item.id} className="flex items-center gap-3 bg-gray-50/60 p-2 rounded-xl border border-gray-100/50">
                                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center border border-gray-200/50">
                                    {item.products?.image_url && item.products.image_url.trim() !== "" ? (
                                      <Image 
                                        src={item.products.image_url} 
                                        alt={item.products.name || "Product"} 
                                        width={48}
                                        height={48}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <span className="text-[10px] text-gray-400 font-bold">ไม่มีรูป</span>
                                    )}
                                  </div>
                                  <div className="flex flex-col text-xs">
                                    <span className="font-bold text-gray-900 line-clamp-1 max-w-[200px] md:max-w-[300px]">
                                      {item.products?.name || "สินค้าไม่ระบุชื่อ"}
                                    </span>
                                    <span className="text-gray-500 font-medium mt-0.5">
                                      จำนวน: <span className="text-indigo-600 font-bold">{item.quantity}</span> ชิ้น 
                                      {item.selected_size && item.selected_size !== "N/A" && (
                                        <> | ขนาด: <span className="text-slate-700 font-bold">{item.selected_size}</span></>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="flex items-center gap-2 text-gray-400 text-xs font-bold py-2">
                                📦 <span>บิลว่างเปล่า (ไม่มีรายการสินค้า)</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 align-center pt-5">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="p-4 font-mono text-gray-600 text-xs font-bold align-center pt-5">
                          {order.tracking_number ? (
                            <span className="bg-slate-100 px-2 py-1 rounded-md border border-slate-200/60 tracking-wider whitespace-nowrap">
                              {order.tracking_number}
                            </span>
                          ) : (
                            <span className="text-gray-400 font-sans font-medium">📭 ยังไม่มีเลขพัสดุ</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}