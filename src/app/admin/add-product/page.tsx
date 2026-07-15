'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface SizeOption {
  sizeName: string;
  price: string;
}


export default function AddProductPage() {
  const [name, setName] = useState('');
  
  const [sizeOptions, setSizeOptions] = useState<SizeOption[]>([{ sizeName: '', price: '' }]);
  const [hiewFee, setHiewFee] = useState('');
  
  const [concertName, setConcertName] = useState('');
  const [artistBand, setArtistBand] = useState('');
  const [boothLocation, setBoothLocation] = useState('');
  
  const [existingConcerts, setExistingConcerts] = useState<string[]>([]);
  const [selectedConcertIndex, setSelectedConcertIndex] = useState<string>('manual');

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchConcert = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('concert_name')
        .not('concert_name', 'is', null);

      if (data && !error) {
        // กรองเอาเฉพาะคีย์ที่ไม่ซ้ำกัน (Unique)
        const names = data.map(p => p.concert_name) as string[];
        const uniqueNames = Array.from(new Set(names));
        setExistingConcerts(uniqueNames);
      }
    };
    fetchConcert();
  }, []);

  const handleConcertSelectChange = (value: string) => {
    setSelectedConcertIndex(value);
    if (value === 'manual') {
      setConcertName('');
    } else {
      setConcertName(value);
    }
  };

  const addSizeRow = () => {
    setSizeOptions([...sizeOptions, { sizeName: '', price: '' }]);
  };

  const removeSizeRow = (index: number) => {
    if (sizeOptions.length > 1) {
      setSizeOptions(sizeOptions.filter((_, i) => i !== index));
    }
  };

  const handleSizeOptionChange = (index: number, field: keyof SizeOption, value: string) => {
    const updated = [...sizeOptions];
    updated[index][field] = value;
    setSizeOptions(updated);
  };

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

      const validSizes = sizeOptions.filter(opt => opt.sizeName.trim() !== '' && opt.price.trim() !== '');
      if (validSizes.length === 0) {
        throw new Error('กรุณาระบุไซส์และราคาของสินค้าอย่างน้อย 1 รายการค่ะ');
      }

      //  วนลูป Insert แยกตามคู่ไซส์และราคาลงใน Database 
      const insertPromises = validSizes.map((opt) => 
        supabase.from('products').insert([
          {
            name,
            size: opt.sizeName.trim(),
            price: Number(opt.price),
            hiew_fee: Number(hiewFee),
            image_url: finalImageUrl,
            concert_name: concertName || null,
            artist_band: artistBand || null,
            booth_location: boothLocation || null,
          },
        ])
      );

      const results = await Promise.all(insertPromises);
      const firstError = results.find(res => res.error)?.error;
      if (firstError) throw firstError;

      setMessage('🎉 เพิ่มสินค้าทุกไซส์เข้าสู่แคตตาล็อกสำเร็จเรียบร้อย!');
      
      setName('');
      setSizeOptions([{ sizeName: '', price: '' }]);
      setHiewFee('');
      setImageFile(null);
      const fileInput = document.getElementById('product-image-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      const { data } = await supabase.from('products').select('concert_name').not('concert_name', 'is', null);
      if (data) {
        setExistingConcerts(Array.from(new Set(data.map(p => p.concert_name))));
      }

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
    <div className="max-w-md mx-auto my-6 p-4 sm:p-6 bg-white border border-gray-100 rounded-3xl shadow-xl text-black">
      <h1 className="text-xl sm:text-2xl font-black mb-1 text-center text-indigo-600">📌 เพิ่มสินค้าเปิดรับหิ้ว</h1>
      <p className="text-xs text-gray-400 text-center mb-6">สร้างไอเทมสินค้าใหม่พร้อมรูปถ่ายเข้าระบบคลังสินค้า</p>
      
      {message && (
        <div className={`p-3 rounded-xl mb-4 text-center text-xs sm:text-sm font-bold ${message.includes('สำเร็จ') ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
        
        {/* 🌟 ฟังก์ชันดึงประวัติงานคอนเสิร์ตเก่า */}
        {existingConcerts.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-indigo-500 uppercase">✨ เลือกจากคอนเสิร์ตที่มีอยู่แล้ว</label>
            <select
              value={selectedConcertIndex}
              onChange={(e) => handleConcertSelectChange(e.target.value)}
              className="w-full border border-indigo-100 rounded-xl mt-1 p-2 bg-indigo-50/50 text-xs font-semibold outline-none"
            >
              <option value="manual">➕ กรอกข้อมูลคอนเสิร์ตใหม่เอง</option>
              {existingConcerts.map((name, idx) => (
                <option key={idx} value={name}>🎵 {name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase">ชื่อสินค้า *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl mt-1 text-xs sm:text-sm bg-gray-50 font-medium outline-none focus:border-indigo-500"  required />
        </div>

        {/* 💥 ส่วนจัดการขนาดและราคา (Dynamic Size Rows) */}
        <div className="space-y-2 border border-gray-100 p-3 rounded-2xl bg-slate-50/50">
          <div className="flex justify-between items-center mb-1">
            <label className="block text-xs font-bold text-gray-600 uppercase">📐 ตัวเลือกไซส์ & ราคาป้าย *</label>
            <button
              type="button"
              onClick={addSizeRow}
              className="text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold px-2 py-1 rounded-lg transition"
            >
              ➕ เพิ่มไซส์อื่น
            </button>
          </div>

          {sizeOptions.map((option, index) => (
            <div key={index} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="ไซส์ (เช่น S)"
                value={option.sizeName}
                required
                onChange={(e) => handleSizeOptionChange(index, 'sizeName', e.target.value)}
                className="w-1/3 p-2 border border-gray-200 rounded-xl bg-white text-xs font-bold text-center outline-none focus:border-indigo-500 text-black"
              />
              <input
                type="number"
                placeholder="ราคาป้าย (เช่น 990)"
                value={option.price}
                required
                onChange={(e) => handleSizeOptionChange(index, 'price', e.target.value)}
                className="w-2/3 p-2 border border-gray-200 rounded-xl bg-white text-xs font-bold outline-none focus:border-indigo-500 text-black"
              />
              {sizeOptions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSizeRow(index)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg text-xs font-bold transition flex-shrink-0"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase">ค่าหิ้วต่อชิ้น (เท่ากันทุกไซส์) *</label>
          <input type="number" value={hiewFee} onChange={(e) => setHiewFee(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl mt-1 text-xs sm:text-sm bg-gray-50 font-bold outline-none focus:border-indigo-500" placeholder="50" required />
        </div>

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
            className="w-full p-2 border border-gray-200 rounded-xl mt-1 text-xs bg-gray-50 font-medium text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 cursor-pointer" 
          />
        </div>

        <div className="border-t border-gray-100 pt-3 space-y-3">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">🎪 ข้อมูลสถานที่และศิลปิน</p>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">ชื่อคอนเสิร์ต</label>
            <input type="text" value={concertName} onChange={(e) => setConcertName(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl mt-1 text-xs sm:text-sm bg-gray-50 font-medium outline-none focus:border-indigo-500" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">วง / ศิลปิน</label>
            <input type="text" value={artistBand} onChange={(e) => setArtistBand(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl mt-1 text-xs sm:text-sm bg-gray-50 font-medium outline-none focus:border-indigo-500" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">สถานที่ตั้งบูธ</label>
            <input type="text" value={boothLocation} onChange={(e) => setBoothLocation(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl mt-1 text-xs sm:text-sm bg-gray-50 font-medium outline-none focus:border-indigo-500" />
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:bg-gray-400 text-xs sm:text-sm shadow-md transition mt-4">
          {loading ? '⌛ กำลังอัปเดตรูปภาพและบันทึกข้อมูล...' : '💾 บันทึกขึ้นแคตตาล็อกสินค้า'}
        </button>

      </form>
    </div>
  );
}