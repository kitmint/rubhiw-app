"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";


interface OrderItem {
  id: number;
  quantity: number;
  selected_size: string;
  product_id: number;
  products: {
    name: string;
    price: number;
  };
}

interface Order {
  id: number;
  customer_name: string;
  contact: string | null;
  total_price: number;
  shipping_fee: number;
  status: "pending" | "buying" | "waiting_pack" | "shipped" | "out_of_stock" | "refunded" | "cancelled";
  slip_url: string | null;
  address: string | null;
  tracking_number: string | null;
  created_at: string;
  user_id: string | null;
  order_items: OrderItem[];
}

interface BaseProduct {
  id: number;
  name: string;
  price: number;
  size: string;
}

export default function AdminTodoListPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<BaseProduct[]>([]);
  const [loading, setLoading] = useState(true); 

  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState<Order["status"]>("pending");
  const [editAddress, setEditAddress] = useState("");
  const [editTracking, setEditTracking] = useState("");

  const [itemEditingOrder, setItemEditingOrder] = useState<Order | null>(null);
  const [tempOrderItems, setTempOrderItems] = useState<OrderItem[]>([]);
  const [viewingReceiptOrder, setViewingReceiptOrder] = useState<Order | null>(null);

  const [newSelectedProdId, setNewSelectedProdId] = useState<string>("");
  const [newSelectedSize, setNewSelectedSize] = useState<string>("Free size");
  const [newQuantity, setNewQuantity] = useState<number>(1);

  const [actionLoading, setActionLoading] = useState(false);

  // ฟังก์ชันดึงข้อมูลออเดอร์และสินค้าในระบบ
  const fetchData = async () => {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id,
          customer_name,
          contact,
          total_price,
          shipping_fee,
          status,
          slip_url,
          address,
          tracking_number,
          created_at,
          user_id,
          order_items (
            id,
            quantity,
            selected_size,
            product_id,
            products (
              name,
              price
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;
      setOrders((ordersData as unknown as Order[]) || []);

      // ดึงรายชื่อสินค้า
      const { data: prodsData, error: prodsError } = await supabase
        .from("products")
        .select("id, name, price, size");

      if (prodsError) throw prodsError;
      setProducts(prodsData || []);
      
      // ตั้งค่าฟอร์มเลือกสินค้าตัวแรกเป็นดีฟอลต์
      if (prodsData && prodsData.length > 0) {
        setNewSelectedProdId(prodsData[0].id.toString());
        if (prodsData[0].size) {
          setNewSelectedSize(prodsData[0].size.split(",")[0].trim());
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`ดึงข้อมูลล้มเหลว: ${err.message}`);
      } else {
        alert("ดึงข้อมูลล้มเหลว: เกิดข้อผิดพลาดที่ไม่รู้จัก");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initFetch = async () => {
      await fetchData();
    };
    
    initFetch();
  }, []);

  const handleManualRefresh = () => {
    setLoading(true);
    fetchData();
  };

  // หน้าต่างแก้ไขข้อมูลบิลทั่วไป (สถานะ / ที่อยู่ / Tracking)
  const openEditModal = (order: Order) => {
    setEditingOrderId(order.id);
    setEditStatus(order.status);
    setEditAddress(order.address || "");
    setEditTracking(order.tracking_number || "");
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingOrderId === null) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: editStatus,
          address: editAddress.trim() || null,
          tracking_number: editTracking.trim() || null,
        })
        .eq("id", editingOrderId);

      if (error) throw error;

      setOrders(prev => prev.map(order => 
        order.id === editingOrderId 
          ? { ...order, status: editStatus, address: editAddress, tracking_number: editTracking }
          : order
      ));
      
      setEditingOrderId(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`ไม่สามารถอัปเดตข้อมูลได้: ${err.message}`);
      } else {
        alert("ไม่สามารถอัปเดตข้อมูลได้: เกิดข้อผิดพลาดที่ไม่รู้จัก");
      }
    } finally {
      setActionLoading(false);
    }
  };

  // หน้าต่างจัดการรายการสินค้าในบิล (เพิ่ม/ลด/ลบสินค้า)
  const openItemEditModal = (order: Order) => {
    setItemEditingOrder(order);
    setTempOrderItems(JSON.parse(JSON.stringify(order.order_items)));
    setNewQuantity(1);
  };

  const handleNewProductChange = (pIdStr: string) => {
    setNewSelectedProdId(pIdStr);
    const prod = products.find(p => p.id.toString() === pIdStr);
    if (prod && prod.size && prod.size.trim() !== "") {
      setNewSelectedSize(prod.size.split(",")[0].trim());
    } else {
      setNewSelectedSize("Free size");
    }
  };

  const handleAddNewItemToTemp = () => {
    const prod = products.find(p => p.id.toString() === newSelectedProdId);
    if (!prod) return;

    // ตรวจสอบว่าในโพยแก้ไขชั่วคราว มีสินค้ารหัสนี้ไซส์นี้อยู่แล้วหรือยัง
    const existingIndex = tempOrderItems.findIndex(
      item => item.product_id === prod.id && item.selected_size === newSelectedSize
    );

    if (existingIndex > -1) {
      const updated = [...tempOrderItems];
      updated[existingIndex].quantity += newQuantity;
      setTempOrderItems(updated);
    } else {
      setTempOrderItems([
        ...tempOrderItems,
        {
          id: (Date.now() * -1), 
          quantity: newQuantity,
          selected_size: newSelectedSize,
          product_id: prod.id,
          products: {
            name: prod.name,
            price: prod.price
          }
        }
      ]);
    }
    setNewQuantity(1);
  };

  const handleQtyChange = (itemId: number, delta: number) => {
    setTempOrderItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, quantity: item.quantity + delta };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleSaveItemsUpdate = async () => {
    if (!itemEditingOrder) return;
    setActionLoading(true);

    try {
      const { error: deleteError } = await supabase
        .from("order_items")
        .delete()
        .eq("order_id", itemEditingOrder.id);

      if (deleteError) throw deleteError;

      let finalSavedItems: OrderItem[] = [];

      if (tempOrderItems.length > 0) {
        const itemsToInsert = tempOrderItems.map(item => ({
          order_id: itemEditingOrder.id,
          product_id: item.product_id,
          quantity: item.quantity,
          selected_size: item.selected_size
        }));

        const { data: insertedData, error: insertError } = await supabase
          .from("order_items")
          .insert(itemsToInsert)
          .select(`
            id, quantity, selected_size, product_id,
            products ( name, price )
          `);

        if (insertError) throw insertError;
        finalSavedItems = insertedData as unknown as OrderItem[] || [];
      }

      const newItemsTotal = tempOrderItems.reduce((sum, item) => {
        return sum + (Number(item.products?.price || 0) * item.quantity);
      }, 0);
      const newFinalTotal = newItemsTotal + Number(itemEditingOrder.shipping_fee);

      const { error: orderError } = await supabase
        .from("orders")
        .update({ total_price: newFinalTotal })
        .eq("id", itemEditingOrder.id);

      if (orderError) throw orderError;

      setOrders(prev => prev.map(order => 
        order.id === itemEditingOrder.id 
          ? { ...order, total_price: newFinalTotal, order_items: finalSavedItems }
          : order
      ));

      setItemEditingOrder(null);
      alert("🎉 บันทึกการจัดการเพิ่ม/ลดรายการสินค้า และอัปเดตยอดเงินรวมเรียบร้อยแล้วค่ะ");
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`จัดการรายการสินค้าขัดข้อง: ${err.message}`);
      } else {
        alert("จัดการรายการสินค้าขัดข้อง: เกิดข้อผิดพลาดที่ไม่รู้จัก");
      }
    } finally {
      setActionLoading(false);
    }
  };

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
      <span 
        className={`
          inline-flex items-center gap-1 
          whitespace-nowrap rounded-full border font-bold
          /* 📱 บนจอมือถือเล็ก: ลดขนาดฟอนต์และ padding ลง */
          text-[10px] px-2 py-0.5
          /* 💻 บนจอคอม/แท็บเล็ต (sm ขึ้นไป): ปรับกลับเป็นขนาดเดิมของคุณ */
          sm:text-xs sm:px-2.5 sm:py-1 
          ${currentStyle}
        `}
      >
        {currentLabel}
      </span>
    );
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-medium text-sm sm:text-base">⌛ กำลังโหลดรายการออเดอร์หิ้วสักครู่นะคะ...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-4 md:p-8 text-black">
      <div className="max-w-6xl mx-auto">
        
        {/* หัวข้อเว็บ: บนมือถือจัดปุ่มรีเฟรชลงมาด้านล่าง หรือดันชิดขอบให้ไม่บังกัน */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">📋 บิลฝากหิ้วทั้งหมด (Admin TodoList)</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">จัดการเปลี่ยนสถานะ แปะข้อมูลจัดส่ง และเพิ่ม/ลดของในบิลลูกค้า</p>
          </div>
          <button 
            onClick={handleManualRefresh}
            className="w-full sm:w-auto px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition text-center"
          >
            🔄 รีเฟรชข้อมูล
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-3xl p-8 sm:p-12 text-center text-gray-400 font-medium shadow-sm text-xs sm:text-sm">
            📭 ยังไม่มีออเดอร์ฝากหิ้วเข้ามาในระบบเลยค่ะ
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 sm:p-5 hover:shadow-md transition">
                
                {/* ส่วนหัวการ์ดออเดอร์: แยกกลุ่มบนมือถือไม่ให้กระดอนล้น */}
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 border-b border-gray-100 pb-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] bg-gray-100 font-bold px-1.5 py-0.5 rounded text-gray-500 whitespace-nowrap">บิล #{order.id}</span>
                      <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">👤 คุณ{order.customer_name}</h3>
                    </div>
                    <p className="text-[11px] text-gray-400 font-medium mt-1">
                      📱 ติดต่อ: {order.contact || "➖"} <span className="mx-1">|</span> วันที่สั่ง: {new Date(order.created_at).toLocaleDateString('th-TH')}
                    </p>
                  </div>
                  
                  {/* ปุ่มจัดการบิล: เพิ่มปุ่ม 🧾 ดูใบเสร็จ ปรับเป็น Grid 3 คอลัมน์บนมือถือ */}
                  <div className="flex flex-row items-center justify-between lg:justify-end gap-2 w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-50">
                    <div className="flex-shrink-0">{getStatusBadge(order.status)}</div>
                    <div className="grid grid-cols-3 gap-1 flex-1 lg:flex lg:flex-row lg:gap-1.5 max-w-[340px] lg:max-w-none ml-auto">
                      <button
                        onClick={() => setViewingReceiptOrder(order)}
                        className="w-full lg:w-auto px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[10px] sm:text-xs font-bold transition border border-emerald-200/40 text-center whitespace-nowrap"
                      >
                        🧾 ดูใบเสร็จ
                      </button>
                      <button
                        onClick={() => openItemEditModal(order)}
                        className="w-full lg:w-auto px-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-[10px] sm:text-xs font-bold transition border border-amber-200/40 text-center whitespace-nowrap"
                      >
                        📦 จัดการสินค้า
                      </button>
                      <button
                        onClick={() => openEditModal(order)}
                        className="w-full lg:w-auto px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[10px] sm:text-xs font-bold transition border border-indigo-100/40 text-center whitespace-nowrap"
                      >
                        ✏️ แก้ไขบิล
                      </button>
                    </div>
                  </div>
                </div>

                {/* รายการสินค้าฝากหิ้วภายในบิล */}
                <div className="mb-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">🛍️ รายการสินค้าฝากหิ้ว</p>
                  <ul className="space-y-1.5 bg-gray-50 rounded-xl p-3 text-xs sm:text-sm font-medium">
                    {order.order_items.length === 0 ? (
                      <li className="text-gray-400 text-[11px] text-center py-1">🚫 ไม่มีรายการสินค้าในบิลนี้ (กดปุ่มจัดการสินค้าเพื่อเพิ่ม)</li>
                    ) : (
                      order.order_items.map((item) => (
                        <li key={item.id} className="flex justify-between items-start text-gray-700 gap-4">
                          <span className="break-words min-w-0">• {item.products?.name} {item.selected_size !== "N/A" && `(ไซส์: ${item.selected_size})`}</span>
                          <span className="text-gray-900 font-bold whitespace-nowrap flex-shrink-0">x {item.quantity}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>

                {/* แผงข้อมูลสรุปท้ายบิล: ปรับจาก 3 คอลัมน์คอม เป็น 1 คอลัมน์บนมือถือ เพื่อเพิ่มพื้นที่หายใจ */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] sm:text-xs font-medium border-t border-gray-50 pt-3 text-gray-600">
                  <div className="bg-slate-50/50 p-2 rounded-lg sm:bg-transparent sm:p-0">
                    <span className="text-gray-400 block mb-0.5">💰 ยอดรวมจัดสุทธิ:</span>
                    <span className="text-xs sm:text-sm font-black text-gray-900">฿{(order.total_price).toLocaleString()}</span> 
                    <span className="text-gray-400 text-[9px] sm:text-[10px] ml-1 block sm:inline">(รวมค่าส่ง ฿{order.shipping_fee})</span>
                  </div>
                  <div className="bg-slate-50/50 p-2 rounded-lg sm:bg-transparent sm:p-0">
                    <span className="text-gray-400 block mb-0.5">📍 ที่อยู่จัดส่งลูกค้า:</span>
                    <span className="text-gray-900 block line-clamp-2 sm:line-clamp-1">{order.address || "❌ ยังไม่มีที่อยู่ (รอแก้ไขเพิ่ม)"}</span>
                  </div>
                  <div className="bg-slate-50/50 p-2 rounded-lg sm:bg-transparent sm:p-0">
                    <span className="text-gray-400 block mb-0.5">📦 เลข Tracking พัสดุ:</span>
                    <span className="text-gray-900 font-mono tracking-wider font-bold block truncate">{order.tracking_number || "➖ ยังไม่มีเลขพัสดุ"}</span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>

      {/* 🧾 MODAL สำหรับดูใบเสร็จ & ตรวจสอบสลิปโอนเงิน (เพิ่มใหม่) */}
      {viewingReceiptOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 text-black">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            
            {/* หัวข้อ Modal */}
            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded">
                  บิล #${viewingReceiptOrder.id}
                </span>
                <h2 className="text-base sm:text-lg font-black text-gray-900 mt-1">
                  🧾 สรุปออเดอร์ & หลักฐานโอนเงิน
                </h2>
                <p className="text-[11px] text-gray-400">
                  สั่งเมื่อ: {new Date(viewingReceiptOrder.created_at).toLocaleString('th-TH')}
                </p>
              </div>
              <button 
                onClick={() => setViewingReceiptOrder(null)} 
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold flex items-center justify-center text-sm transition"
              >
                ✕
              </button>
            </div>

            {/* 📸 หลักฐานสลิปการโอนเงิน */}
            <div className="space-y-2">
              <p className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                💳 หลักฐานการชำระเงิน (สลิปโอนเงิน)
              </p>

              {viewingReceiptOrder.slip_url && viewingReceiptOrder.slip_url.trim() !== "" ? (
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2 text-center space-y-2">
                  <div className="relative w-full h-72 rounded-xl overflow-hidden bg-gray-100 border border-gray-200/60 flex items-center justify-center">
                    <Image
                      src={viewingReceiptOrder.slip_url}
                      alt="สลิปการโอนเงิน"
                      fill
                      sizes="(max-width: 768px) 100vw, 400px"
                      className="object-contain p-2"
                      priority
                    />
                  </div>
                  <a 
                    href={viewingReceiptOrder.slip_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-block text-[11px] bg-white border border-gray-200 hover:bg-gray-50 text-indigo-600 font-bold px-3 py-1.5 rounded-xl transition shadow-2xs"
                  >
                    🔍 กดเปิดดูรูปสลิปขนาดใหญ่
                  </a>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 text-center">
                  <span className="text-xl block mb-1">⚠️</span>
                  <p className="text-xs font-bold text-amber-900">ไม่พบรูปสลิปการโอนเงินในบิลนี้</p>
                  <p className="text-[10px] text-amber-700 mt-0.5">ลูกค้าอาจจะยังไม่ได้อัปโหลดสลิป หรือทำรายการไม่สมบูรณ์</p>
                </div>
              )}
            </div>

            {/* ข้อมูลลูกค้า & สถานะ */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-bold">ชื่อลูกค้า:</span>
                <span className="font-bold text-gray-900">👤 คุณ{viewingReceiptOrder.customer_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-bold">เบอร์/ช่องทางติดต่อ:</span>
                <span className="font-mono font-bold text-gray-800">📱 {viewingReceiptOrder.contact || "➖"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-bold">สถานะบิล:</span>
                <div>{getStatusBadge(viewingReceiptOrder.status)}</div>
              </div>
            </div>

            {/* รายการสินค้าที่สั่ง */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">🛍️ สินค้าในบิลนี้</p>
              <div className="bg-gray-50 rounded-2xl p-3 divide-y divide-gray-100 space-y-2 text-xs">
                {viewingReceiptOrder.order_items?.map((item: OrderItem) => (
                  <div key={item.id} className="pt-2 first:pt-0 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-gray-800">{item.products?.name || "สินค้าฝากหิ้ว"}</p>
                      <p className="text-[10px] text-gray-400">ไซส์: {item.selected_size}</p>
                    </div>
                    <span className="font-bold text-gray-900">x {item.quantity} ชิ้น</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ยอดเงินรวม */}
            <div className="border-t border-dashed border-gray-200 pt-3 space-y-1 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>ค่าจัดส่ง:</span>
                <span>฿{viewingReceiptOrder.shipping_fee || 0}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-gray-900 pt-1">
                <span>ยอดรวมสุทธิ:</span>
                <span className="text-indigo-600 text-base">฿{Number(viewingReceiptOrder.total_price || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* ที่อยู่จัดส่ง */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs space-y-1">
              <p className="font-bold text-gray-700">📍 ที่อยู่จัดส่ง:</p>
              <p className="text-gray-600 text-[11px] leading-relaxed">{viewingReceiptOrder.address || "❌ ยังไม่ได้กรอกที่อยู่"}</p>
            </div>

            <button 
              onClick={() => setViewingReceiptOrder(null)} 
              className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl text-xs transition shadow-xs mt-2"
            >
              ปิดหน้าต่างใบเสร็จ
            </button>

          </div>
        </div>
      )}

      {/* 🛑 MODAL ที่ 1: หน้าต่างแก้ไขข้อมูลบิลทั่วไป */}
      {editingOrderId !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-base sm:text-lg font-black text-gray-900 mb-4">✏️ แก้ไขข้อมูลออเดอร์ บิล #{editingOrderId}</h2>
            <form onSubmit={handleUpdateOrder} className="space-y-4">
              <div>
                <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">📌 ปรับปรุงสถานะบิล</label>
                <select
                  value={editStatus}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditStatus(e.target.value as Order["status"])}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs sm:text-sm outline-none font-medium text-black"
                >
                  <option value="pending">⏳ รอตรวจสอบ</option>
                  <option value="buying">🛍️ กำลังหิ้ว</option>
                  <option value="waiting_pack">📦 หิ้วได้ (รอแพ็ค)</option>
                  <option value="shipped">🚚 จัดส่งแล้ว</option>
                  <option value="out_of_stock">❌ ของหมด (รอคืนเงิน)</option>
                  <option value="refunded">💰 คืนเงินเรียบร้อย</option>
                  <option value="cancelled">🚫 ยกเลิกออเดอร์</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">📍 ที่อยู่ปลายทางลูกค้า</label>
                <textarea
                  rows={3}
                  value={editAddress}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditAddress(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs sm:text-sm outline-none font-medium resize-none text-black"
                />
              </div>
              <div>
                <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">📦 เลขพัสดุ Tracking Number</label>
                <input
                  type="text"
                  value={editTracking}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTracking(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs sm:text-sm outline-none font-mono font-bold tracking-wider text-black"
                />
              </div>
              <div className="flex gap-2 pt-2 text-xs sm:text-sm">
                <button type="button" onClick={() => setEditingOrderId(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl">ยกเลิก</button>
                <button type="submit" disabled={actionLoading} className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-sm disabled:opacity-50">
                  {actionLoading ? "⌛ บันทึก..." : "💾 บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 🛑 MODAL ที่ 2: ศูนย์จัดการสินค้าในบิล */}
      {itemEditingOrder !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 z-50 text-black">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl max-h-[95vh] overflow-y-auto">
            <h2 className="text-base sm:text-lg font-black text-gray-900 mb-1">🛍️ ศูนย์จัดการสินค้าในบิล #{itemEditingOrder.id}</h2>
            <p className="text-[11px] text-gray-400 mb-4">บิลของ คุณ{itemEditingOrder.customer_name} เพิ่มของใหม่ หรือปรับลดชิ้นเดิมได้เลยค่ะ</p>
            
            {/* กล่องเพิ่มสินค้าชิ้นใหม่บนมือถือสลับเป็น 1 คอลัมน์อัตโนมัติ */}
            <div className="bg-indigo-50/60 p-3 rounded-2xl border border-indigo-100/70 space-y-3 mb-4">
              <p className="text-[11px] font-black text-indigo-950">➕ เพิ่มสินค้าชิ้นใหม่เข้าบิลนี้</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] sm:text-[10px] font-bold text-gray-400 mb-0.5">เลือกสินค้า</label>
                  <select 
                    value={newSelectedProdId} 
                    onChange={(e) => handleNewProductChange(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-xs font-medium outline-none text-black"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (฿{p.price})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] sm:text-[10px] font-bold text-gray-400 mb-0.5">ไซส์</label>
                  <select 
                    value={newSelectedSize} 
                    onChange={(e) => setNewSelectedSize(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-xs font-medium outline-none text-black"
                  >
                    {(() => {
                      const prod = products.find(p => p.id.toString() === newSelectedProdId);
                      if (prod && prod.size && prod.size.trim() !== "") {
                        return prod.size.split(",").map(s => <option key={s.trim()} value={s.trim()}>{s.trim()}</option>);
                      }
                      return <option value="Free size">Free size</option>;
                    })()}
                  </select>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center pt-1">
                <div className="flex items-center gap-1.5 w-full sm:w-1/3">
                  <span className="text-xs font-medium text-gray-500 whitespace-nowrap">จำนวน:</span>
                  <input 
                    type="number" 
                    min="1" 
                    value={newQuantity} 
                    onChange={(e) => setNewQuantity(Math.max(1, Number(e.target.value)))} 
                    className="w-full border border-gray-200 bg-white rounded-lg p-1 text-xs text-center font-bold text-black" 
                  />
                </div>
                <button 
                  type="button" 
                  onClick={handleAddNewItemToTemp} 
                  className="w-full sm:flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 rounded-lg text-xs shadow-xs transition text-center"
                >
                  🚀 ยัดสินค้าชิ้นนี้เพิ่มเข้าบิล
                </button>
              </div>
            </div>

            {/* รายการสินค้าชั่วคราวใน Modal */}
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">🛍️ รายการสินค้าในบิลชั่วคราว</p>
            <div className="space-y-2 max-h-44 sm:max-h-52 overflow-y-auto pr-1">
              {tempOrderItems.length === 0 ? (
                <p className="text-xs text-center text-gray-400 py-6 font-medium">⚠️ ไม่มีรายการสินค้าในบิล (บิลจะว่างเปล่าเมื่อบันทึก)</p>
              ) : (
                tempOrderItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2 sm:p-2.5 rounded-xl border border-gray-100 gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 truncate">{item.products?.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold">ไซส์: {item.selected_size} | ฿{item.products?.price.toLocaleString()}</p>
                    </div>
                    
                    {/* ปุ่มเพิ่ม/ลดไอเทมใน Modal */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button 
                        type="button" 
                        onClick={() => handleQtyChange(item.id, -1)} 
                        className="w-6 h-6 bg-white hover:bg-red-50 text-gray-600 hover:text-red-500 border border-gray-200 font-black text-xs rounded-lg flex items-center justify-center active:scale-95 transition"
                      >
                        -
                      </button>
                      <span className="w-4 text-center text-xs font-black text-gray-900">{item.quantity}</span>
                      <button 
                        type="button" 
                        onClick={() => handleQtyChange(item.id, 1)} 
                        className="w-6 h-6 bg-white hover:bg-green-50 text-gray-600 hover:text-green-500 border border-gray-200 font-black text-xs rounded-lg flex items-center justify-center active:scale-95 transition"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ปุ่มกดบันทึกของ Modal ยึดโครงล่างสวยๆ */}
            <div className="flex gap-2 pt-2 border-t border-gray-100 text-xs sm:text-sm mt-4">
              <button 
                type="button" 
                onClick={() => setItemEditingOrder(null)} 
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition"
              >
                ปิดหน้าต่าง
              </button>
              <button 
                type="button" 
                disabled={actionLoading} 
                onClick={handleSaveItemsUpdate} 
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {actionLoading ? "⏳ กำลังเซฟ..." : "💾 บันทึกยอดบิลใหม่"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}