"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Product {
  id: number;
  size: string;
  name: string;
  price: number;
  hiew_fee: number;
  concert_name: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  selectedSize: string;
}

export default function AdminAddOrdersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  const [customerName, setCustomerName] = useState("");
  const [phoneContact, setPhoneContact] = useState(""); 
  const [shippingFee] = useState(50); // ค่าส่งเหมาๆ 50 บาท
  
  const [slipFile, setSlipFile] = useState<File | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [selectedSize, setSelectedSize] = useState<string>("Free size");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ดึงข้อมูลสินค้า
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, name, size, price, hiew_fee, concert_name")
          .eq("is_active", true);
          
        if (error) throw error;
        setProducts(data || []);

        if (data && data.length > 0) {
          setSelectedProductId(data[0].id.toString());
          updateSizeOptions(data[0].id.toString(), data);
        }
      } catch (err: unknown) {
        console.error("Error fetching products:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const updateSizeOptions = (productId: string, allProducts: Product[]) => {
    const prod = allProducts.find((p) => p.id.toString() === productId);
    if (prod && prod.size && prod.size.trim() !== "") {
      const sizeArray = prod.size.split(",").map((s: string) => s.trim());
      setSelectedSize(sizeArray[0] || "Free size");
    } else {
      setSelectedSize("Free size");
    }
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetId = e.target.value;
    setSelectedProductId(targetId);
    updateSizeOptions(targetId, products);
  };

  // เพิ่มสินค้าเข้าตะกร้า
  const addToCart = () => {
    const prod = products.find((p) => p.id.toString() === selectedProductId);
    if (!prod) return;

    const existingIndex = cart.findIndex(
      (item) => item.product.id === prod.id && item.selectedSize === selectedSize
    );

    if (existingIndex > -1) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += selectedQuantity;
      setCart(newCart);
    } else {
      setCart([...cart, { product: prod, quantity: selectedQuantity, selectedSize: selectedSize }]);
    }
    setSelectedQuantity(1); 
  };

  const decreaseFromCart = (index: number) => {
    const newCart = [...cart];
    if (newCart[index].quantity > 1) {
      newCart[index].quantity -= 1; // ลดทีละ 1 ชิ้นตามต้องการ
      setCart(newCart);
    } else {
      // ถ้าเหลือชิ้นสุดท้ายแล้วกดลบ ค่อยคัดชื่อแถวนั้นทิ้งไปเลยครับ
      const filteredCart = cart.filter((_, i) => i !== index);
      setCart(filteredCart);
    }
  };

  const uploadSlip = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error } = await supabase.storage
        .from('slips')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('slips')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('อัปโหลดไฟล์สลิปล้มเหลว:', err);
      return null;
    }
  };

  // คำนวณราคารวมทั้งหมด
  const itemsTotalPrice = cart.reduce((sum, item) => {
    const totalPerPiece = Number(item.product.price) + Number(item.product.hiew_fee);
    return sum + totalPerPiece * item.quantity;
  }, 0);

  const finalOrderTotal = itemsTotalPrice + (cart.length > 0 ? shippingFee : 0);

  // ฟังก์ชันจดออเดอร์ + ผูกบัญชีลูกค้าออโต้
  const handleSubmitOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (cart.length === 0) {
      setMessage({ type: "error", text: "กรุณาเลือกสินค้าเข้าตะกร้าอย่างน้อย 1 ชิ้นก่อนกดเปิดบิลนะคะ" });
      return;
    }
    if (!slipFile) {
      setMessage({ type: "error", text: "กรุณาอัปโหลดรูปภาพหลักฐานสลิปการโอนเงินด้วยค่ะ" });
      return;
    }

    const cleanPhone = phoneContact.trim().replace(/[^0-9]/g, ""); 
    if (cleanPhone.length < 9) {
      setMessage({ type: "error", text: "กรุณากรอกเบอร์โทรศัพท์ผู้ฝากหิ้วให้ถูกต้อง" });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const finalSlipUrl = await uploadSlip(slipFile);
      if (!finalSlipUrl) {
        throw new Error('ระบบอัปโหลดไฟล์หลักฐานขัดข้อง กรุณาลองใหม่อีกครั้ง');
      }

      const response = await fetch('/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneContact: cleanPhone,
          customerName: customerName,
          shippingFee: shippingFee,
          totalPrice: finalOrderTotal,
          slipUrl: finalSlipUrl,
          cart: cart
        })
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'ระบบจัดการคำสั่งซื้อหลังบ้านขัดข้อง');
      }

      setMessage({ 
        type: "success", 
        text: `🎉 บันทึกออเดอร์และผูกประวัติลูกค้าเรียบร้อยแล้วค่ะ!` 
      });
      
      // ล้างค่าฟอร์มหน้าจอ
      setCart([]);
      setCustomerName("");
      setPhoneContact("");
      setSlipFile(null);
      const fileInput = document.getElementById('order-slip-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage({ type: "error", text: `❌ เกิดข้อผิดพลาด: ${err.message}` });
      } else {
        setMessage({ type: "error", text: "❌ เกิดข้อผิดพลาดที่ไม่รู้จักในการสั่งซื้อ" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="text-center mt-10 text-gray-500 font-medium">⏳ กำลังเตรียมหน้าต่างจดออเดอร์...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 text-black">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-950">📝 ระบบแอดมิน - จดเปิดออเดอร์รับหิ้ว</h1>
          <p className="text-xs text-gray-400">คีย์ข้อมูลออเดอร์ให้ลูกค้า ระบบจะสร้างบัญชีสมาชิกผูกกับเบอร์โทรศัพท์ให้อัตโนมัติ</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl mb-6 font-bold text-sm text-center ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/*  ฟอร์มเลือกของและคีย์ข้อมูลลูกค้า */}
        <div className="lg:col-span-7 space-y-5">
          
          <div className="bg-white p-5 border border-gray-100 rounded-3xl shadow-xl">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-4">🛒 1. เลือกสินค้าฝากหิ้ว</h2>
            
            {products.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">ขณะนี้ไม่มีสินค้าที่เปิดรับหิ้วอยู่ในระบบ</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">เลือกรายการสินค้า</label>
                  <select 
                    className="w-full border border-gray-200 rounded-xl p-2.5 bg-gray-50 text-sm font-medium outline-none focus:border-indigo-500"
                    value={selectedProductId}
                    onChange={handleProductChange}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (งาน: {p.concert_name || "ทั่วไป"}) — ฿{Number(p.price) + Number(p.hiew_fee)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">เลือกไซส์สินค้า</label>
                  <select 
                    className="w-full border border-gray-200 rounded-xl p-2.5 bg-gray-50 text-sm font-medium outline-none focus:border-indigo-500"
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                  >
                    {(() => {
                      const prod = products.find((p) => p.id.toString() === selectedProductId);
                      if (prod && prod.size && prod.size.trim() !== "") {
                        const sizeArray = prod.size.split(",").map((s) => s.trim());
                        return sizeArray.map((size) => (
                          <option key={size} value={size}>{size}</option>
                        ));
                      } else {
                        return <option value="Free size">Free size</option>;
                      } 
                    })()}
                  </select>
                </div>

                <div className="flex gap-3">
                  <div className="w-1/3">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">จำนวนชิ้น</label>
                    <input 
                      type="number" 
                      min="1"
                      className="w-full border border-gray-200 rounded-xl p-2 bg-gray-50 text-sm font-bold text-center outline-none"
                      value={selectedQuantity}
                      onChange={(e) => setSelectedQuantity(Math.max(1, Number(e.target.value)))}
                    />
                  </div>
                  <div className="w-2/3 flex items-end">
                    <button 
                      type="button"
                      onClick={addToCart}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm transition"
                    >
                      ➕ เพิ่มเข้าบิลชั่วคราว
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmitOrder} className="bg-white p-5 border border-gray-100 rounded-3xl shadow-xl space-y-4">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-2">📋 2. ข้อมูลลูกค้า</h2>
            
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">ชื่อ-นามสกุล ลูกค้า </label>
              <input 
                type="text" 
                placeholder="username"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-indigo-500 font-medium"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">เบอร์โทรศัพท์ลูกค้า (ใช้ล็อกอินระบบ) *</label>
              <input 
                type="text" 
                required
                placeholder="กรอกเฉพาะตัวเลข เช่น 0891234567"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-indigo-500 font-mono font-medium"
                value={phoneContact}
                onChange={(e) => setPhoneContact(e.target.value)}
              />
            </div>

            {/* รูปภาพสลิปโอนเงิน */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">อัปโหลดหลักฐานสลิปโอนเงินเงิน *</label>
              <input 
                id="order-slip-input"
                type="file" 
                accept="image/*"
                required
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setSlipFile(e.target.files[0]);
                  }
                }} 
                className="w-full p-2 border border-gray-200 rounded-xl mt-1 text-xs bg-gray-50 font-medium text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" 
              />
            </div>

            <div className="hidden">
              <button type="submit" id="real-submit-btn">Submit</button>
            </div>
          </form>
        </div>

        {/* สรุปราคารวมและปุ่มกดยืนยันบิล */}
        <div className="lg:col-span-5">
          <div className="bg-gray-50 p-5 border border-gray-200 rounded-3xl sticky top-6 shadow-sm">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-4">📝 ใบสรุปรายการออเดอร์</h2>

            {cart.length === 0 ? (
              <p className="text-xs text-gray-400 py-8 text-center font-medium">ยังไม่มีสินค้าในบิล เลือกรายการหิ้วด้านซ้ายได้เลยค่ะ</p>
            ) : (
              <div className="divide-y divide-gray-200 max-h-60 overflow-y-auto pr-1 mb-4">
                {cart.map((item, index) => (
                  <div key={index} className="py-3 flex justify-between items-start text-xs">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-bold text-gray-800 truncate">{item.product.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold mt-0.5">ไซส์: {item.selectedSize}</p>
                      <p className="text-[11px] text-gray-500 font-semibold mt-1">
                        ฿{Number(item.product.price) + Number(item.product.hiew_fee)} x {item.quantity}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className="font-black text-gray-900">
                        ฿{((Number(item.product.price) + Number(item.product.hiew_fee)) * item.quantity).toLocaleString()}
                      </span>
                      
                      <button 
                        type="button"
                        onClick={() => decreaseFromCart(index)}
                        className="bg-red-50 hover:bg-red-100 text-red-500 font-bold text-xs w-5 h-5 rounded-md flex items-center justify-center transition"
                        title="ลดจำนวนลง 1 ชิ้น"
                      >
                        -
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-gray-200 pt-4 space-y-2 text-xs font-semibold">
              <div className="flex justify-between text-gray-500">
                <span>รวมค่าสินค้า + ค่าหิ้ว</span>
                <span>฿{itemsTotalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>ค่าจัดส่งพัสดุ (เหมา)</span>
                <span>฿{cart.length > 0 ? shippingFee : 0}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-gray-900 pt-2 border-t border-dashed border-gray-200">
                <span>ยอดรวมโอนสุทธิ</span>
                <span className="text-base text-indigo-600">฿{finalOrderTotal.toLocaleString()}</span>
              </div>
              
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => document.getElementById("real-submit-btn")?.click()}
                className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition shadow-md disabled:bg-gray-400 text-xs"
              >
                {isSubmitting ? "⏳ กำลังอัปโหลดสลิปและเปิดบิล..." : "🚀 ยืนยันบันทึกออเดอร์เปิดบิล"}
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}