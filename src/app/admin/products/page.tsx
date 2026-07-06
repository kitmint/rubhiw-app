'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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
      .order('created_at', { ascending: false });
      

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
          size: editingProduct.size,
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
      fetchProducts(); // โหลดรายการสินค้าใหม่ทันที
    } catch (err: any) {
      setMessage(`❌ เกิดข้อผิดพลาดในการแก้ไข: ${err.message}`);
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
  } catch (err: any) {
    setMessage(`❌ เปลี่ยนสถานะไม่สำเร็จ: ${err.message}`);
  }
};

  // เปิดหน้าต่างแก้ไขสินค้าและตั้งค่า state ของสินค้า
  const openEditModal = (product: Product) => {
    setEditingProduct({ ...product });
    setIsEditModalOpen(true);
  };

  if (loading) return <div className="text-center mt-10 text-gray-500 font-medium">⏳ กำลังโหลดรายการคลังสินค้า...</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 text-black">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-950">📦 คลังสินค้าเปิดรับหิ้ว</h1>
          <p className="text-xs text-gray-400">ตรวจสอบ แก้ไขราคา หรือลบรายการสินค้าที่หมดคิวหิ้ว</p>
        </div>
        <button 
          onClick={() => router.push('/admin/add-product')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition"
        >
          ➕ เพิ่มสินค้าชิ้นใหม่
        </button>
      </div>

      {message && (
        <div className={`p-3.5 rounded-2xl mb-6 text-center text-sm font-bold ${message.includes('สำเร็จ') ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {message}
        </div>
      )}

      {/* 📊 ตารางแสดงแคตตาล็อกสินค้า */}
      <div className="bg-white border border-gray-100 shadow-xl rounded-3xl overflow-hidden">
        {products.length === 0 ? (
          <p className="text-sm text-gray-400 py-12 text-center font-medium">ไม่มีสินค้าอยู่ในระบบคลังขณะนี้</p>
        ) : (
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
                      {product.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded-xl object-cover border border-gray-100 shadow-sm" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 font-bold">No Pic</div>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-gray-900 text-sm">{product.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">งานคอน: {product.concert_name || 'ทั่วไป'} ({product.artist_band || 'ไม่ระบุศิลปิน'})</p>
                      <p className="text-[11px] text-indigo-600 font-bold mt-1">ไซส์เปิดรับ: {product.size}</p>
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
                          className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold px-3 py-1.5 rounded-xl transition text-[11px]"
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
        )}
      </div>


      {/* 🛠️ [Edit Modal] ป๊อปอัพฟอร์มแก้ไขข้อมูลสินค้า */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black text-gray-900">✏️ แก้ไขข้อมูลสินค้า ({editingProduct.name})</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 text-lg font-bold hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-4 text-xs font-bold text-gray-500 uppercase">
              <div>
                <label className="block mb-1">ชื่อสินค้า *</label>
                <input type="text" required value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-black outline-none focus:border-indigo-500" />
              </div>

              <div>
                <label className="block mb-1">ไซส์สินค้า (คั่นด้วยคอมมา) *</label>
                <input type="text" required value={editingProduct.size} onChange={(e) => setEditingProduct({...editingProduct, size: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-black outline-none focus:border-indigo-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">ราคาป้าย *</label>
                  <input type="number" required value={editingProduct.price} onChange={(e) => setEditingProduct({...editingProduct, price: Number(e.target.value)})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-black outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block mb-1">ค่าหิ้วต่อชิ้น *</label>
                  <input type="number" required value={editingProduct.hiew_fee} onChange={(e) => setEditingProduct({...editingProduct, hiew_fee: Number(e.target.value)})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-black outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div>
                <label className="block mb-1">เปลี่ยนรูปถ่ายสินค้าใหม่ (ปล่อยว่างถ้าใช้รูปเดิม)</label>
                <input type="file" accept="image/*" onChange={(e) => { if (e.target.files && e.target.files.length > 0) setEditImageFile(e.target.files[0]); }} className="w-full p-2 border border-gray-200 rounded-xl mt-1 text-xs bg-gray-50 text-gray-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 cursor-pointer" />
              </div>

              <div>
                <label className="block mb-1">ชื่อคอนเสิร์ต</label>
                <input type="text" value={editingProduct.concert_name || ''} onChange={(e) => setEditingProduct({...editingProduct, concert_name: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-black outline-none focus:border-indigo-500" />
              </div>

              <div>
                <label className="block mb-1">วง / ศิลปิน</label>
                <input type="text" value={editingProduct.artist_band || ''} onChange={(e) => setEditingProduct({...editingProduct, artist_band: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-black outline-none focus:border-indigo-500" />
              </div>

              <div>
                <label className="block mb-1">สถานที่ตั้งบูธ</label>
                <input type="text" value={editingProduct.booth_location || ''} onChange={(e) => setEditingProduct({...editingProduct, booth_location: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-black outline-none focus:border-indigo-500" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-2.5 rounded-xl transition text-xs">ยกเลิก</button>
                <button type="submit" disabled={editLoading} className="w-2/3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl shadow-md transition text-xs disabled:bg-gray-400">
                  {editLoading ? '⌛ กำลังอัปเดตข้อมูล...' : '💾 บันทึกการแก้ไข'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}