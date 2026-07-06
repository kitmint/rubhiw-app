'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AddProductPage() {
  
  const [name, setName] = useState('');
  const [size, setSize] = useState('');
  const [price, setPrice] = useState('');
  const [hiewFee, setHiewFee] = useState('');
  const [concertName, setConcertName] = useState('');
  const [artistBand, setArtistBand] = useState('');
  const [boothLocation, setBoothLocation] = useState('');
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from('products')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('อัปเดตรูปภาพล้มเหลว:', err);
      return null;
    }
  };

  // ฟังก์ชันสำหรับส่งข้อมูลไปบันทึกที่ Supabase
  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      let finalImageUrl = null;

      if (imageFile) {
        finalImageUrl = await uploadImage(imageFile);
        if (!finalImageUrl) {
          throw new Error('ระบบอัปโหลดรูปภาพขัดข้อง กรุณาลองใหม่อีกครั้ง');
        }
      }

      const { error } = await supabase.from('products').insert([
        {
          name,
          size: size || null,
          price: Number(price),
          hiew_fee: Number(hiewFee),
          image_url: finalImageUrl,
          concert_name: concertName || null,
          artist_band: artistBand || null,
          booth_location: boothLocation || null,
        },
      ]);

      if (error) throw error;

      setMessage('🎉 เพิ่มสินค้าพร้อมรูปถ่ายสำเร็จเรียบร้อย!');
      // ล้างฟอร์มหลังบันทึกสำเร็จ
      setName('');
      setSize('');
      setPrice('');
      setHiewFee('');
      setImageFile(null);
      setConcertName('');
      setArtistBand('');
      setBoothLocation('');

      const fileInput = document.getElementById('product-image-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage(`❌ เกิดข้อผิดพลาด: ${err.message}`);
      } else {
        setMessage('❌ เกิดข้อผิดพลาดที่ไม่รู้จัก');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-10 p-6 bg-white border border-gray-100 rounded-3xl shadow-xl text-black">
      <h1 className="text-2xl font-black mb-1 text-center text-indigo-600">📌 เพิ่มสินค้าเปิดรับหิ้ว</h1>
      <p className="text-xs text-gray-400 text-center mb-6">สร้างไอเทมสินค้าใหม่พร้อมรูปถ่ายเข้าระบบคลังสินค้า</p>
      
      {message && (
        <div className={`p-3 rounded-2xl mb-4 text-center text-sm font-bold ${message.includes('สำเร็จ') ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase">ชื่อสินค้า *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl mt-1 text-sm bg-gray-50 font-medium outline-none focus:border-indigo-500" placeholder="เช่น เสื้อทัวร์ลายคอนเสิร์ตบล็อก A" required />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase">ไซส์สินค้า *</label>
          <input type="text" placeholder="พิมพ์คั่นด้วยคอมมา เช่น S, M, L, XL" value={size} onChange={(e) => setSize(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl mt-1 text-sm bg-gray-50 font-medium outline-none focus:border-indigo-500" required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">ราคาป้าย *</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl mt-1 text-sm bg-gray-50 font-bold outline-none focus:border-indigo-500" placeholder="990" required />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">ค่าหิ้วต่อชิ้น *</label>
            <input type="number" value={hiewFee} onChange={(e) => setHiewFee(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl mt-1 text-sm bg-gray-50 font-bold outline-none focus:border-indigo-500" placeholder="50" required />
          </div>
        </div>

        {/* 📸 อัปเดตช่องกรอกข้อมูล: เปลี่ยนจากช่องกรอก URL เป็นปุ่มเลือกไฟล์รูปภาพจริง */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase">รูปภาพสินค้า</label>
          <input 
            id="product-image-input"
            type="file" 
            accept="image/*"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                setImageFile(e.target.files[0]);
              }
            }} 
            className="w-full p-2 border border-gray-200 rounded-xl mt-1 text-xs bg-gray-50 font-medium text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" 
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase">ชื่อคอนเสิร์ต</label>
          <input type="text" value={concertName} onChange={(e) => setConcertName(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl mt-1 text-sm bg-gray-50 font-medium outline-none focus:border-indigo-500" placeholder="เช่น NCT DREAM TOUR" />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase">วง / ศิลปิน</label>
          <input type="text" value={artistBand} onChange={(e) => setArtistBand(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl mt-1 text-sm bg-gray-50 font-medium outline-none focus:border-indigo-500" placeholder="เช่น NCT DREAM" />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase">สถานที่ตั้งบูธ</label>
          <input type="text" value={boothLocation} onChange={(e) => setBoothLocation(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl mt-1 text-sm bg-gray-50 font-medium outline-none focus:border-indigo-500" placeholder="เช่น บูธ Official หน้าประตูฝั่งทิศใต้" />
        </div>

        <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:bg-gray-400 text-sm shadow-md transition mt-4">
          {loading ? '⌛ กำลังอัปเดตรูปภาพและบันทึกข้อมูล...' : '💾 บันทึกขึ้นแคตตาล็อกสินค้า'}
        </button>


      </form>
    </div>
  );
}