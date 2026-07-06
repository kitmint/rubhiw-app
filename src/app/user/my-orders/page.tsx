"use client";

import React, { useEffect, useState } from "react";
import { authHelper } from "@/lib/authHelper";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function MyOrdersPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    // const [newPassword, setNewPassword] = useState("");
    // const [passMsg, setPassMsg] = useState("");

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
        pending: "⏳ รอโอนเงิน/รอตรวจสอบ",
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
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${currentStyle}`}>
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
                setOrders(data || []);
            } catch (error) {
                console.error("Error fetching orders:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [router]);

            // const handleChangePassword = async (e: React.FormEvent) => {
            //     e.preventDefault();
            //     setPassMsg("");
            //     if (newPassword.length < 6) {
            //         setPassMsg("Password must be at least 6 characters long.");
            //         return;
            //     }

            //     const { error } = await supabase.auth.updateUser({ password: newPassword });
            //     if (error) {
            //         setPassMsg(`Error changing password: ${error.message}`);
            //     } else {
            //         setPassMsg("Password changed successfully.");
            //         setNewPassword("");
            //     }
            // };
            
            
            const handleLogout = async () => {
                await supabase.auth.signOut();
                authHelper.clearTokens();
                router.push("/login");
            }

            if (loading) {
                return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-gray-500 text-sm font-medium">กำลังโหลดรายการออเดอร์ของคุณ...</div>;
            }

            return (
                <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-black flex flex-col items-center">
                <div className="max-w-3xl w-full space-y-6">
                    
                    <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <div>
                        <h1 className="text-lg font-black text-gray-900">🎒 รายการออเดอร์ฝากหิ้วของฉัน</h1>
                        <p className="text-xs text-gray-400">เช็กสถานะบิลและเลขพัสดุจัดส่ง</p>
                    </div>
                    <button onClick={handleLogout} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold px-3 py-2 rounded-xl transition">
                        ออกจากระบบ
                    </button>
                    </div>

                    <div className="bg-white rounded-3xl shadow-md border border-gray-100 overflow-hidden">
                    {orders.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm font-medium">ไม่พบประวัติรายการสั่งซื้อของคุณในระบบในตอนนี้</div>
                    ) : (
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
                                
                                {/* 🛍️ คอลัมน์แสดงสินค้าทั้งหมดที่สั่งในบิลนี้ */}
                                <td className="p-4">
                                <div className="space-y-3">
                                    {order.order_items && order.order_items.length > 0 ? (
                                    order.order_items.map((item: any) => (
                                        <div key={item.id} className="flex items-center gap-3 bg-gray-50/60 p-2 rounded-xl border border-gray-100/50">
                                        
                                        {/* รูปภาพสินค้าตัวอย่าง */}
                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center border border-gray-200/50">
                                            {item.products?.image_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img 
                                                src={item.products.image_url} 
                                                alt={item.products.name} 
                                                className="w-full h-full object-cover"
                                            />
                                            ) : (
                                            <span className="text-[10px] text-gray-400 font-bold">ไม่มีรูป</span>
                                            )}
                                        </div>

                                        {/* รายละเอียดชื่อสินค้า ขนาด และจำนวน */}
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

                                {/* คอลัมน์สถานะบิล */}
                                <td className="p-4 align-center pt-5">
                                {getStatusBadge(order.status)}
                                </td>

                                {/* คอลัมน์เลขพัสดุจัดส่ง */}
                                <td className="p-4 font-mono text-gray-600 text-xs font-bold align-center pt-5">
                                {order.tracking_number ? (
                                    <span className="bg-slate-100 px-2 py-1 rounded-md border border-slate-200/60 tracking-wider">
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
                    )}
                    </div>

                    {/* <div className="bg-white p-6 rounded-3xl shadow-md border border-gray-100 max-w-md">
                    <h3 className="text-sm font-black text-gray-900 mb-1">🔐 ตั้งรหัสผ่านใหม่ส่วนตัว</h3>
                    <p className="text-xs text-gray-400 mb-4">เปลี่ยนรหัสชั่วคราวที่แอดมินตั้งให้ เพื่อความปลอดภัยส่วนตัวของคุณได้ตรงนี้เลยครับ</p>
                    
                    {passMsg && <div className="mb-3 text-xs font-bold text-indigo-600">{passMsg}</div>}
                    
                    <form onSubmit={handleChangePassword} className="flex gap-2">
                        <input type="password" required placeholder="กรอกรหัสผ่านใหม่" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs flex-1 focus:outline-none" />
                        <button type="submit" className="bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition">บันทึกรหัสใหม่</button>
                    </form>
                    </div> */}

                </div>
                </div>
            );
            }