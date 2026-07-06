"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
  status: "pending" | "preparing" | "shipped" | "cancelled";
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
      setOrders(ordersData as any[] || []);

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
    } catch (err: any) {
      alert(`ดึงข้อมูลล้มเหลว: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
    } catch (err: any) {
      alert(`ไม่สามารถอัปเดตข้อมูลได้: ${err.message}`);
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
        finalSavedItems = insertedData as any[] || [];
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
    } catch (err: any) {
      alert(`จัดการรายการสินค้าขัดข้อง: ${err.message}`);
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

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-medium">⌛ กำลังโหลดรายการออเดอร์หิ้วสักครู่นะคะ...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-black">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">📋 บิลฝากหิ้วทั้งหมด (Admin TodoList)</h1>
            <p className="text-sm text-gray-500">จัดการเปลี่ยนสถานะ แปะข้อมูลจัดส่ง และเพิ่ม/ลดของในบิลลูกค้า</p>
          </div>
          <button 
            onClick={handleManualRefresh}
            className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-semibold shadow-sm transition"
          >
            🔄 รีเฟรชข้อมูล
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center text-gray-400 font-medium shadow-sm">
            📭 ยังไม่มีออเดอร์ฝากหิ้วเข้ามาในระบบเลยค่ะ
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white border border-gray-100 shadow-md rounded-2xl p-5 hover:shadow-lg transition">
                
                <div className="flex flex-wrap justify-between items-start gap-2 border-b border-gray-100 pb-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-gray-100 font-bold px-2 py-0.5 rounded text-gray-500">บิล #{order.id}</span>
                      <h3 className="font-bold text-gray-900 text-base">👤 คุณ{order.customer_name}</h3>
                    </div>
                    <p className="text-xs text-gray-400 font-medium mt-1">📱 ติดต่อ: {order.contact || "➖"} | วันที่สั่ง: {new Date(order.created_at).toLocaleDateString('th-TH')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(order.status)}
                    <div className="flex gap-1">
                      <button
                        onClick={() => openItemEditModal(order)}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-xs font-bold transition border border-amber-200/40"
                      >
                        📦 จัดการสินค้าในบิล
                      </button>
                      <button
                        onClick={() => openEditModal(order)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold transition"
                      >
                        ✏️ แก้ไขบิล
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">🛍️ รายการสินค้าฝากหิ้ว</p>
                  <ul className="space-y-1 bg-gray-50 rounded-xl p-3 text-sm font-medium">
                    {order.order_items.length === 0 ? (
                      <li className="text-gray-400 text-xs text-center py-1">🚫 ไม่มีรายการสินค้าในบิลนี้ (กดปุ่มสีส้มเพื่อเพิ่มสินค้า)</li>
                    ) : (
                      order.order_items.map((item) => (
                        <li key={item.id} className="flex justify-between text-gray-700">
                          <span>• {item.products?.name} {item.selected_size !== "N/A" && `(ไซส์: ${item.selected_size})`}</span>
                          <span className="text-gray-900 font-bold">x {item.quantity}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium border-t border-gray-50 pt-3 text-gray-600">
                  <div>
                    <span className="text-gray-400 block">💰 ยอดรวมจัดสุทธิ:</span>
                    <span className="text-sm font-black text-gray-900">฿{(order.total_price).toLocaleString()}</span> 
                    <span className="text-gray-400 text-[10px] ml-1">(รวมค่าส่ง ฿{order.shipping_fee})</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">📍 ที่อยู่จัดส่งลูกค้า:</span>
                    <span className="text-gray-900 line-clamp-1">{order.address || "❌ ยังไม่มีที่อยู่ (รอแก้ไขเพิ่มเติม)"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">📦 เลข Tracking พัสดุ:</span>
                    <span className="text-gray-900 font-mono tracking-wider font-bold">{order.tracking_number || "➖ ยังไม่มีเลขพัสดุ"}</span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>

      {/* 🛑 MODAL ที่ 1: หน้าต่างแก้ไขข้อมูลบิลทั่วไป */}
      {editingOrderId !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-black text-gray-900 mb-4">✏️ แก้ไขข้อมูลออเดอร์หิ้ว บิล #{editingOrderId}</h2>
            <form onSubmit={handleUpdateOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">📌 ปรับปรุงสถานะบิล</label>
                <select
                  value={editStatus}
                  onChange={(e: any) => setEditStatus(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none font-medium"
                >
                  <option value="pending">⏳ รอโอนเงิน/รอตรวจสอบ</option>
                  <option value="buying">🛍️ กำลังหิ้ว</option>
                  <option value="waiting_pack">📦 หิ้วได้ (รอแพ็ค)</option>
                  <option value="shipped">🚚 จัดส่งแล้ว</option>
                  <option value="out_of_stock">❌ ของหมด (รอคืนเงิน)</option>
                  <option value="refunded">💰 คืนเงินเรียบร้อย</option>
                  <option value="cancelled">🚫 ยกเลิกออเดอร์</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">📍 ที่อยู่ปลายทางลูกค้า</label>
                <textarea
                  rows={3}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none font-medium resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">📦 เลขพัสดุ Tracking Number</label>
                <input
                  type="text"
                  value={editTracking}
                  onChange={(e) => setEditTracking(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none font-mono font-bold tracking-wider"
                />
              </div>
              <div className="flex gap-2 pt-2 text-sm">
                <button type="button" onClick={() => setEditingOrderId(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl">ยกเลิก</button>
                <button type="submit" disabled={actionLoading} className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-md disabled:opacity-50">
                  {actionLoading ? "⌛ บันทึก..." : "💾 บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 🛑 MODAL ที่ 2: ศูนย์จัดการสินค้าในบิล (ยัดของเพิ่มชิ้นใหม่ / เพิ่มลดชิ้นเดิม / กดลบรายการออกเมื่อเหลือ 0) */}
      {itemEditingOrder !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-black">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-black text-gray-900 mb-1">🛍️ ศูนย์จัดการสินค้าในบิล #{itemEditingOrder.id}</h2>
            <p className="text-xs text-gray-400 mb-4">บิลของ คุณ{itemEditingOrder.customer_name} สามารถเพิ่มของใหม่ หรือปรับลดชิ้นเดิมได้เลยค่ะ</p>
            
            {/* 📥 ส่วนเติมสินค้าชิ้นใหม่เข้าไปในบิลตรงๆ */}
            <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100/70 space-y-3 mb-4">
              <p className="text-xs font-black text-indigo-950">➕ เพิ่มสินค้าชิ้นใหม่เข้าบิลนี้</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-0.5">เลือกสินค้า</label>
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
                  <label className="block text-[10px] font-bold text-gray-400 mb-0.5">ไซส์</label>
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
              <div className="flex gap-2 items-center pt-1">
                <div className="flex items-center gap-1.5 w-1/3">
                  <span className="text-xs font-medium text-gray-500">จำนวน:</span>
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
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 rounded-lg text-xs shadow-sm transition"
                >
                  🚀 ยัดสินค้าชิ้นนี้เพิ่มเข้าบิล
                </button>
              </div>
            </div>

            {/* ส่วนแสดงรายการสินค้าปัจจุบันที่มีอยู่ในใบฝากหิ้ว */}
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">🛍️ รายการสินค้าในบิลชั่วคราว</p>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {tempOrderItems.length === 0 ? (
                <p className="text-xs text-center text-gray-400 py-8 font-medium">⚠️ ไม่มีรายการสินค้าในบิล (บิลจะว่างเปล่าเมื่อบันทึก)</p>
              ) : (
                tempOrderItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-xs font-bold text-gray-800 truncate">{item.products?.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold">ไซส์: {item.selected_size} | ฿{item.products?.price.toLocaleString()}/ชิ้น</p>
                    </div>
                    
                    {/* ปุ่ม เพิ่ม/ลด จำนวนสินค้า */}
                    <div className="flex items-center gap-2">
                      <button 
                        type="button" 
                        onClick={() => handleQtyChange(item.id, -1)} 
                        className="w-7 h-7 bg-white hover:bg-red-50 text-gray-600 hover:text-red-500 border border-gray-200 font-black text-xs rounded-lg flex items-center justify-center shadow-sm active:scale-95 transition"
                      >
                        -
                      </button>
                      <span className="w-5 text-center text-xs font-black text-gray-900">{item.quantity}</span>
                      <button 
                        type="button" 
                        onClick={() => handleQtyChange(item.id, 1)} 
                        className="w-7 h-7 bg-white hover:bg-green-50 text-gray-600 hover:text-green-500 border border-gray-200 font-black text-xs rounded-lg flex items-center justify-center shadow-sm active:scale-95 transition"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ปุ่มปิด หรือ ปุ่มยืนยันเซฟบันทึกบิลฉบับแก้ไข */}
            <div className="flex gap-2 pt-2 border-t border-gray-100 text-sm mt-4">
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
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50"
              >
                {actionLoading ? "⏳ กำลังเซฟข้อมูล..." : "💾 บันทึกยอดบิลฉบับใหม่"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}