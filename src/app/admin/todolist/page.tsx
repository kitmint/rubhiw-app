"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Image from 'next/image';

interface TodoItem {
  product_id: number;
  product_name: string;
  artist_band?: string;
  selected_size: string;
  total_qty: number;
  picked_qty: number;
  price: number;
  image_url: string | null;
  booth_location: string | null;
}

interface DBOrderItem {
  product_id: number;
  selected_size?: string | null;
  quantity?: number;
  products?: {
    name?: string;
    artist_band?: string;
    price?: number;
    image_url?: string | null;
    booth_location?: string;
  } | null;
}

interface DBPickedItem {
  product_id: number | string;
  selected_size: string;
  picked_quantity?: number;
}

export default function AdminSummaryTodoListPage() {
  const [todoList, setTodoList] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ฟังก์ชันคำนวณและสรุปยอดของต้องหิ้ว 
  const fetchTodoSummary = async () => {
    try {
      // ดึงรายการออเดอร์ค้างหิ้ว
      const { data: orderItems, error: orderError } = await supabase
        .from("order_items")
        .select(`
          product_id,
          quantity,
          selected_size,
          orders!inner ( status ),
          products!inner ( 
            name,
            artist_band,
            price,
            image_url,  
            booth_location
          )
        `)
        .in("orders.status", ["pending", "buying", "waiting_pack", "shipped", "out_of_stock", "refunded", "cancelled"]); 

      if (orderError) throw orderError;

      const { data: pickedData, error: pickedError } = await supabase
        .from("picked_items")
        .select("*");

      if (pickedError) throw pickedError;

      const summaryMap: { [key: string]: TodoItem } = {};

      if (orderItems) {
        const safeOrderItems = orderItems as unknown as DBOrderItem[];
        safeOrderItems.forEach((item: DBOrderItem) => {
          const pId = Number(item.product_id);
          const prodName = item.products?.name || "สินค้าไม่ระบุชื่อ";
          const artistBand = item.products?.artist_band || "";
          const size = item.selected_size || "N/A";
          const qty = Number(item.quantity || 0);
          const price = Number(item.products?.price || 0);
          const imgUrl = item.products?.image_url || null;
          const booth = item.products?.booth_location || "ไม่ระบุบูธ";

          // สร้างรหัสคีย์จัดกลุ่มแยกตามรหัสสินค้าและไซส์
          const groupKey = `${pId}-${size}`;

          if (summaryMap[groupKey]) {
            summaryMap[groupKey].total_qty += qty;
          } else {
            summaryMap[groupKey] = {
              product_id: pId,
              product_name: prodName,
              artist_band: artistBand,
              selected_size: size,
              total_qty: qty,
              picked_qty: 0,
              price: price,
              image_url: imgUrl,
              booth_location: booth
            };
          }
        });
      }

      // สรุปยอด
      if (pickedData) {
        pickedData.forEach((pItem: DBPickedItem) => {
          const groupKey = `${pItem.product_id}-${pItem.selected_size}`;
          if (summaryMap[groupKey]) {
            summaryMap[groupKey].picked_qty = Number(pItem.picked_quantity || 0);
          }
        });
      }

      const finalArray = Object.values(summaryMap);
      
      finalArray.sort((a, b) => {
        const boothA = a.booth_location || "";
        const boothB = b.booth_location || "";
        return boothA.localeCompare(boothB, 'th');
      });

      setTodoList(finalArray);
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`โหลดโพยหิ้วล้มเหลว: ${err.message}`);
      } else {
        alert("โหลดโพยหิ้วล้มเหลว: เกิดข้อผิดพลาดไม่ทราบสาเหตุ");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTodoSummary();
  }, []);

  // ปุ่มรีเฟรช
  const handleManualRefresh = () => {
    setLoading(true);
    fetchTodoSummary();
  };

  // ฟังก์ชันอัปเดตสถานะหยิบสินค้า
  const togglePickItem = async (item: TodoItem, isCheckingAll: boolean) => {
    const groupKey = `${item.product_id}-${item.selected_size}`;
    setActionLoading(groupKey);

    const targetPickedQty = isCheckingAll ? item.total_qty : 0;

    try {
      const { error } = await supabase
        .from("picked_items")
        .upsert({
          product_id: item.product_id,
          selected_size: item.selected_size,
          picked_quantity: targetPickedQty,
          updated_at: new Date().toISOString()
        }, { onConflict: 'product_id,selected_size' });

      if (error) throw error;

      setTodoList(prev => prev.map(oldItem => 
        (oldItem.product_id === item.product_id && oldItem.selected_size === item.selected_size)
          ? { ...oldItem, picked_qty: targetPickedQty }
          : oldItem
      ));

    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`อัปเดตสถานะหยิบสินค้าขัดข้อง: ${err.message}`);
      } else {
        alert("อัปเดตสถานะหยิบสินค้าขัดข้อง: เกิดข้อผิดพลาดไม่ทราบสาเหตุ");
      }
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-medium">⌛ กำลังคำนวณโพยรวมยอดของต้องหิ้วพร้อมระบบเช็คพัสดุ...</div>;
  }

  // คำนวณยอดสินค้าทั้งหมดที่ต้องหยิบ
  const remainingTotalItems = todoList.reduce((sum, item) => {
    const remain = item.total_qty - item.picked_qty;
    return sum + (remain > 0 ? remain : 0);
  }, 0);

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-4 md:p-8 text-black">
      <div className="max-w-4xl mx-auto">
        
        {/* ส่วนหัวหน้าจอ: บนมือถือสลับปุ่มและยอดรวมให้กระชับ ไม่ดันกันตกขอบ */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">📝 โพยตรวจเช็คของต้องหิ้ว (Interactive Checklist)</h1>
            <p className="text-[11px] sm:text-sm text-gray-500 mt-0.5">กดติ๊กของใส่ตะกร้าได้ หากมีออเดอร์ใหม่ไหลเข้ามาเพิ่ม ระบบจะแจ้งเตือนให้หยิบเพิ่มทันทีค่ะ</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none bg-amber-50 border border-amber-200 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-center">
              <span className="text-[10px] sm:text-xs text-amber-700 block font-bold">ยอดค้างหยิบตอนนี้</span>
              <span className="text-base sm:text-lg font-black text-amber-900">{remainingTotalItems} ชิ้น</span>
            </div>
            <button 
              onClick={handleManualRefresh}
              className="px-3 py-2 sm:px-4 sm:py-3 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition whitespace-nowrap"
            >
              🔄 อัปเดตออเดอร์
            </button>
          </div>
        </div>

        {todoList.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-3xl p-8 sm:p-12 text-center text-gray-400 font-medium shadow-xs text-xs sm:text-sm">
            ☀️ ไม่มีสินค้าค้างหิ้วแล้วค่ะ แอดมินพักผ่อนได้เลย
          </div>
        ) : (
          <>
            {/* 📱 1. โหมดการ์ดพกพา (แสดงเฉพาะบนมือถือ ซ่อนเมื่อจอใหญ่ md:hidden) */}
            <div className="block md:hidden space-y-2.5">
              {todoList.map((item) => {
                const groupKey = `${item.product_id}-${item.selected_size}`;
                const remainToPick = item.total_qty - item.picked_qty;
                const isFullyPicked = remainToPick <= 0;

                return (
                  <div 
                    key={groupKey}
                    className={`bg-white border border-gray-100 shadow-xs rounded-xl p-3 flex items-center gap-3 transition ${
                      isFullyPicked ? "bg-emerald-50/30 opacity-60" : ""
                    }`}
                  >
                    {/* ปุ่มติ๊กถูกขนาดใหญ่สำหรับนิ้วกดในจอมือถือ */}
                    <div className="flex-shrink-0">
                      <button
                        type="button"
                        disabled={actionLoading === groupKey}
                        onClick={() => togglePickItem(item, !isFullyPicked)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center border text-lg font-black shadow-xs transition ${
                          isFullyPicked
                            ? "bg-emerald-500 border-emerald-600 text-white"
                            : "bg-white border-gray-300 text-transparent"
                        }`}
                      >
                        {actionLoading === groupKey ? "⏳" : "✓"}
                      </button>
                    </div>

                    {/* รูปภาพสินค้า */}
                    <div className="w-14 h-14 bg-gray-100 rounded-xl border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {item.image_url && item.image_url.trim() !== "" ? (
                        <Image 
                          src={item.image_url} 
                          alt={item.product_name || "Product Image"}
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg">📦</span>
                      )}
                    </div>                    

                    {/* รายละเอียดสินค้าและบูธ */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded text-[9px] font-black border border-slate-200 whitespace-nowrap">
                          {item.booth_location}
                        </span>
                        {item.selected_size !== "N/A" && (
                          <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-bold border border-indigo-100 whitespace-nowrap">
                            ไซส์ {item.selected_size}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 font-mono ml-auto">฿{item.price.toLocaleString()}</span>
                      </div>

                      <h3 className={`font-bold text-gray-900 text-xs sm:text-sm truncate ${isFullyPicked ? "line-through text-gray-400" : ""}`}>
                        {item.artist_band ? `${item.artist_band} - ` : ""}{item.product_name}
                      </h3>

                      {/* สถานะจำนวนค้างหยิบ */}
                      <div className="flex items-center gap-1">
                        {isFullyPicked ? (
                          <span className="text-[10px] text-emerald-700 font-black">🎉 เก็บของครบเรียบร้อยแล้ว</span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] bg-rose-50 border border-rose-100 text-rose-600 font-black px-2 py-0.5 rounded-md whitespace-nowrap">
                              🛒 ต้องหิ้วอีก {remainToPick} ชิ้น
                            </span>
                            <span className="text-[9px] text-gray-400">
                              (หยิบแล้ว {item.picked_qty}/{item.total_qty})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 💻 2. โหมดตารางมาตรฐาน (ซ่อนบนมือถือ โผล่เฉพาะจอคอม md:block) */}
            <div className="hidden md:block bg-white border border-gray-100 shadow-md rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <th className="py-3 px-4 text-center w-16">เช็คลงถัง</th>
                      <th className="py-3 px-5">📍 บูธ</th>
                      <th className="py-3 px-5">🖼️ สินค้า</th>
                      <th className="py-3 px-5 text-center">ไซส์</th>
                      <th className="py-3 px-5 text-center">สถานะการเก็บของ</th>
                      <th className="py-3 px-5 text-right">ราคา</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm font-medium">
                    {todoList.map((item) => {
                      const groupKey = `${item.product_id}-${item.selected_size}`;
                      const remainToPick = item.total_qty - item.picked_qty;
                      const isFullyPicked = remainToPick <= 0;

                      return (
                        <tr 
                          key={groupKey} 
                          className={`transition duration-150 ${
                            isFullyPicked ? "bg-emerald-50/40 opacity-60" : "hover:bg-slate-50/80"
                          }`}
                        >
                          <td className="py-4 px-4 text-center">
                            <button
                              type="button"
                              disabled={actionLoading === groupKey}
                              onClick={() => togglePickItem(item, !isFullyPicked)}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center border text-base font-black shadow-sm transition ${
                                isFullyPicked
                                  ? "bg-emerald-500 border-emerald-600 text-white"
                                  : "bg-white border-gray-300 hover:border-indigo-500 text-transparent"
                              }`}
                            >
                              {actionLoading === groupKey ? "⏳" : "✓"}
                            </button>
                          </td>
                          <td className="py-4 px-5">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-black tracking-wide uppercase border border-slate-200">
                              {item.booth_location}
                            </span>
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-14 h-14 bg-gray-100 rounded-xl border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                {item.image_url && item.image_url.trim() !== "" ? (
                                  <Image 
                                    src={item.image_url} 
                                    alt="Product Image"
                                    width={56}
                                    height={56}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-lg">📦</span>
                                )}
                              </div>
                              <span className={`font-bold block max-w-[180px] md:max-w-[280px] truncate ${
                                isFullyPicked ? "line-through text-gray-400" : "text-gray-900"
                              }`}>
                                {item.product_name}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-5 text-center">
                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                              item.selected_size === "N/A" 
                                ? "bg-gray-100 text-gray-400" 
                                : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                            }`}>
                              {item.selected_size}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-center">
                            {isFullyPicked ? (
                              <span className="text-xs bg-emerald-100 border border-emerald-200 text-emerald-800 font-black px-2.5 py-1 rounded-full">
                                🎉 ครบเรียบร้อย
                              </span>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 justify-center">
                                {item.picked_qty > 0 && (
                                  <span className="text-xs font-bold text-gray-400">
                                    (หยิบแล้ว {item.picked_qty})
                                  </span>
                                )}
                                <span className="text-sm bg-rose-50 border border-rose-200 text-rose-600 font-black px-2.5 py-1 rounded-xl whitespace-nowrap">
                                  🛒 ต้องหิ้วอีก {remainToPick} ชิ้น
                                </span>
                                <span className="text-[11px] text-gray-400 whitespace-nowrap">
                                  / ทั้งหมด {item.total_qty}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-5 text-right text-gray-500 font-mono">
                            ฿{item.price.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
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