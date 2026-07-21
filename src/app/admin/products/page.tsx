'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

interface Product {
  is_active: boolean;
  id: number;
  name: string;
  size: string;
  price: number;
  hiew_fee: number;
  image_url: string;
  concert_name: string;
  artist_band: string;
  booth_location: string;
}

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // ดึงรายการสินค้าทั้งหมด
  const fetchProducts = async () => {
    console.log('Fetching products...');
  
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true })
      .order('price', { ascending: true });

    if (error) {
      setMessage(`❌ ไม่สามารถดึงข้อมูลได้: ${error.message}`);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };
  console.log('Products state after fetch:', products);

  useEffect(() => {
    (async () => {
        await fetchProducts();
    })();
  }, []);

  const uploadNewImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error } = await supabase.storage
        .from('products')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('อัปโหลดรูปภาพใหม่ล้มเหลว:', err);
      return null;
    }
  };

  // (Update)
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setEditLoading(true);
    setMessage('');

    try {
      let finalImageUrl = editingProduct.image_url;

      if (editImageFile) {
        const uploadedUrl = await uploadNewImage(editImageFile);
        if (uploadedUrl) finalImageUrl = uploadedUrl;
      }

      const { error } = await supabase
        .from('products')
        .update({
          name: editingProduct.name,
          size: editingProduct.size.trim(),
          price: Number(editingProduct.price),
          hiew_fee: Number(editingProduct.hiew_fee),
          image_url: finalImageUrl,
          concert_name: editingProduct.concert_name,
          artist_band: editingProduct.artist_band,
          booth_location: editingProduct.booth_location,
        })
        .eq('id', editingProduct.id);

      if (error) throw error;

      setMessage('🎉 แก้ไขข้อมูลสินค้าสำเร็จ!');
      setIsEditModalOpen(false);
      setEditImageFile(null);
      fetchProducts();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage(`❌ เกิดข้อผิดพลาดในการแก้ไข: ${err.message}`);
      } else {
        setMessage("❌ เกิดข้อผิดพลาดในการแก้ไขที่ไม่รู้จัก");
      }
    } finally {
      setEditLoading(false);
    }
  };

  // ฟังก์ชันเปลี่ยนสถานะสินค้า (เปิด/ปิดรับหิ้ว)
  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
  const nextStatus = !currentStatus;
  const actionText = nextStatus ? "เปิดรับหิ้วสินค้าชิ้นนี้อีกครั้ง" : "ปิดรับหิ้วสินค้าชิ้นนี้ (สินค้าจะไม่โชว์ในฟอร์มจดออเดอร์)";
  
  if (!confirm(`คุณแน่ใจใช่ไหมที่จะ ${actionText}?`)) return;

  try {
    const { error } = await supabase
      .from('products')
      .update({ is_active: nextStatus })
      .eq('id', id);

    if (error) throw error;

    setMessage(`🎉 เปลี่ยนสถานะสินค้าเรียบร้อยแล้ว!`);
    fetchProducts(); // โหลดตารางใหม่
  } catch (err: unknown) {
    if (err instanceof Error) {
      setMessage(`❌ เปลี่ยนสถานะไม่สำเร็จ: ${err.message}`);
    } else {
      setMessage("❌ เปลี่ยนสถานะไม่สำเร็จ: ข้อผิดพลาดที่ไม่รู้จัก");
    }
  }
};

  // เปิดหน้าต่างแก้ไขสินค้าและตั้งค่า state ของสินค้า
  const openEditModal = (product: Product) => {
    setEditingProduct({ ...product });
    setIsEditModalOpen(true);
  };

  if (loading) return <div className="text-center mt-10 text-gray-500 font-medium">⏳ กำลังโหลดรายการคลังสินค้า...</div>;

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-4 md:p-6 text-black">
      {/* 📋 หัวข้อและปุ่มเพิ่มสินค้า: ปรับให้รองรับจอเล็กไม่ล้นขอบ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-950">📦 คลังสินค้าเปิดรับหิ้ว</h1>
          <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">ตรวจสอบ แก้ไขราคา หรือลบรายการสินค้าที่หมดคิวหิ้ว</p>
        </div>
        <button 
          onClick={() => router.push('/admin/add-product')}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition text-center whitespace-nowrap"
        >
          ➕ เพิ่มสินค้าชิ้นใหม่
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-xl mb-4 sm:mb-6 text-center text-xs sm:text-sm font-bold ${message.includes('สำเร็จ') ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {message}
        </div>
      )}

      {/* 📊 ก้อนแสดงสินค้าคลัง */}
      {products.length === 0 ? (
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8 sm:p-12 text-center text-gray-400 font-medium text-xs sm:text-sm">
          ไม่มีสินค้าอยู่ในระบบคลังขณะนี้
        </div>
      ) : (
        <>
          {/* 📱 1. แสดงผลโหมด "การ์ด" (โผล่เฉพาะบนมือถือ ซ่อนเมื่อจอใหญ่ขึ้น md:hidden) */}
          <div className="block md:hidden space-y-3">
            {products.map((product) => (
              <div key={product.id} className="bg-white border border-gray-100 shadow-sm rounded-2xl p-3.5 flex gap-3 relative">
                {/* ฝั่งซ้าย: รูปสินค้า */}
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100">
                  {product.image_url && product.image_url.trim() !== "" ? (
                    <Image 
                      src={product.image_url} 
                      alt={product.name} 
                      width={64}
                      height={64}
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[9px] text-gray-400 font-bold">No Pic</div>
                  )}
                </div>

                {/* ฝั่งขวา: รายละเอียดสินค้า */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-gray-900 text-sm truncate">{product.name}</h3>
                  </div>
                  
                  <p className="text-[10px] text-gray-400 font-medium leading-tight">
                    {product.concert_name || 'ทั่วไป'} ({product.artist_band || 'ไม่ระบุ'})
                  </p>
                  
                  <p className="text-[10px] text-indigo-600 font-bold">
                    ไซส์: <span className="text-gray-700 font-medium">{product.size}</span>
                  </p>

                  <p className="text-[10px] text-gray-400">
                    📍 บูธ: <span className="text-gray-700 font-semibold">{product.booth_location || '—'}</span>
                  </p>

                  {/* ราคาและราคาเงินรวม */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-1 border-t border-gray-50 mt-1">
                    <span className="text-[10px] text-gray-500">฿{product.price}+{product.hiew_fee}</span>
                    <span className="text-xs font-black text-blue-600">สุทธิ: ฿{Number(product.price) + Number(product.hiew_fee)}</span>
                  </div>

                  {/* ปุ่มจัดการ: เรียงคู่ล่างการ์ดกดง่าย */}
                  <div className="flex gap-1.5 pt-2">
                    <button 
                      onClick={() => openEditModal(product)}
                      className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-1.5 rounded-lg transition text-[10px] text-center"
                    >
                      ✏️ แก้ไขข้อมูล
                    </button>
                    <button 
                      onClick={() => handleToggleStatus(product.id, product.is_active)}
                      className={`flex-1 font-bold py-1.5 rounded-lg transition text-[10px] text-center ${product.is_active ? 'bg-blue-50 hover:bg-blue-100 text-blue-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                    >
                      {product.is_active ? '⏸️ ปิดรับหิ้ว' : '▶️ เปิดรับหิ้ว'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 💻 2. แสดงผลโหมด "ตารางมาตรฐาน" (ซ่อนบนมือถือ โผล่เฉพาะจอคอม md:block) */}
          <div className="hidden md:block bg-white border border-gray-100 shadow-xl rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-100 text-gray-500 font-bold uppercase">
                    <th className="p-4">รูปภาพ</th>
                    <th className="p-4">รายละเอียดสินค้า</th>
                    <th className="p-4">ราคา (ป้าย + ค่าหิ้ว)</th>
                    <th className="p-4">สถานที่ตั้งบูธ</th>
                    <th className="p-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-medium">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4">
                        {product.image_url && product.image_url.trim() !== "" ? (
                          <Image 
                            src={product.image_url} 
                            alt={product.name} 
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-xl object-cover border border-gray-100 shadow-sm" 
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 font-bold">No Pic</div>
                        )}
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-gray-900 text-sm">{product.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">งานคอน: {product.concert_name || 'ทั่วไป'} ({product.artist_band || 'ไม่ระบุศิลปิน'})</p>
                        <p className="text-[11px] text-indigo-600 font-bold mt-1">ไซส์: {product.size}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-gray-800">฿{product.price} + ฿{product.hiew_fee}</p>
                        <p className="text-[10px] font-bold text-blue-600 mt-0.5">สุทธิ: ฿{Number(product.price) + Number(product.hiew_fee)}</p>
                      </td>
                      <td className="p-4 text-gray-500 max-w-[150px] truncate">{product.booth_location || '—'}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => openEditModal(product)}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold px-3 py-1.5 rounded-xl transition text-[11px]"
                          >
                            ✏️ แก้ไข
                          </button>
                          <button 
                            onClick={() => handleToggleStatus(product.id, product.is_active)}
                            className={`font-bold px-3 py-1.5 rounded-xl transition text-[11px] ${product.is_active ? 'bg-blue-50 hover:bg-blue-100 text-blue-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                          >
                            {product.is_active ? '⏸️ ปิดรับ' : '▶️ เปิดรับ'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 🛠️ [Edit Modal] ป๊อปอัพฟอร์มแก้ไขข้อมูลสินค้า */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-100 max-h-[85vh] overflow-y-auto">
            
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base sm:text-lg font-black text-gray-900 truncate pr-4">✏️ แก้ไข ({editingProduct.name})</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 text-base font-bold hover:text-gray-600 flex-shrink-0">✕</button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-3.5 text-[10px] sm:text-xs font-bold text-gray-500 uppercase">
              <div>
                <label className="block mb-1">ชื่อสินค้า *</label>
                <input type="text" required value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-black outline-none focus:border-indigo-500" />
              </div>

              <div>
                <label className="block mb-1 text-indigo-600">📐 ขนาดไซส์ของรายการนี้ </label>
                <input type="text" required value={editingProduct.size} onChange={(e) => setEditingProduct({...editingProduct, size: e.target.value})} className="w-full p-2 bg-slate-100 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-black outline-none focus:border-indigo-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">ราคาป้ายเฉพาะไซส์นี้ *</label>
                  <input type="number" required value={editingProduct.price} onChange={(e) => setEditingProduct({...editingProduct, price: Number(e.target.value)})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-black outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block mb-1">ค่าหิ้วต่อชิ้น *</label>
                  <input type="number" required value={editingProduct.hiew_fee} onChange={(e) => setEditingProduct({...editingProduct, hiew_fee: Number(e.target.value)})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-black outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div>
                <label className="block mb-1">รูปถ่ายสินค้าใหม่ (ปล่อยว่างถ้าใช้รูปเดิม)</label>
                <input type="file" accept="image/*" onChange={(e) => { if (e.target.files && e.target.files.length > 0) setEditImageFile(e.target.files[0]); }} className="w-full p-1.5 border border-gray-200 rounded-xl mt-1 text-[11px] bg-gray-50 text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-indigo-50 file:text-indigo-700 cursor-pointer" />
              </div>

              <div>
                <label className="block mb-1">ชื่อคอนเสิร์ต</label>
                <input type="text" value={editingProduct.concert_name || ''} onChange={(e) => setEditingProduct({...editingProduct, concert_name: e.target.value})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-black outline-none focus:border-indigo-500" />
              </div>

              <div>
                <label className="block mb-1">วง / ศิลปิน</label>
                <input type="text" value={editingProduct.artist_band || ''} onChange={(e) => setEditingProduct({...editingProduct, artist_band: e.target.value})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-black outline-none focus:border-indigo-500" />
              </div>

              <div>
                <label className="block mb-1">สถานที่ตั้งบูธ</label>
                <input type="text" value={editingProduct.booth_location || ''} onChange={(e) => setEditingProduct({...editingProduct, booth_location: e.target.value})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-black outline-none focus:border-indigo-500" />
              </div>

              <div className="flex gap-2.5 pt-2 text-xs">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-2.5 rounded-xl transition">ยกเลิก</button>
                <button type="submit" disabled={editLoading} className="w-2/3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl shadow-md transition disabled:bg-gray-400">
                  {editLoading ? '⌛ อัปเดต...' : '💾 บันทึกการแก้ไข'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}