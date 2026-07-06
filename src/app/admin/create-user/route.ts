import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { phoneContact, customerName, shippingFee, totalPrice, slipUrl, cart } = await request.json();
    
    const adminClient = getSupabaseAdmin();
    if (!adminClient) {
      return NextResponse.json({ error: 'สิทธิ์แอดมินหลังบ้านขัดข้อง คีย์ลับสูญหาย' }, { status: 500 });
    }

    const cleanPhone = phoneContact.trim().replace(/[^0-9]/g, ""); 
    const trimmedName = customerName?.trim() || "";
    let targetUserId = null;
    let finalCustomerName = "";

    const { data: lastOrder } = await adminClient
      .from("orders")
      .select("customer_name, user_id")
      .eq("contact", cleanPhone)
      .not("customer_name", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastOrder) {
      // 🟢 เคสที่ 1: เบอร์นี้เคยมีออเดอร์ในระบบแล้ว
      targetUserId = lastOrder.user_id;
      
      if (trimmedName !== "") {
        // ถ้าแอดมินคีย์ชื่อมาใหม่ ให้ใช้ชื่อใหม่สำหรับบิลนี้
        finalCustomerName = trimmedName;
      } else {
        finalCustomerName = lastOrder.customer_name;
      }
    } else {
      // 🟡 เคสที่ 2: เบอร์นี้ไม่เคยสั่งของมาก่อนเลยในระบบ
      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("id")
        .eq("phone_number", cleanPhone)
        .maybeSingle();

      if (existingProfile) {
        targetUserId = existingProfile.id;
      } else {
        const dummyEmail = `${cleanPhone}@rubhiw.com`;
        const defaultPassword = "password123";

        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email: dummyEmail,
          password: defaultPassword,
          email_confirm: true
        });

        if (authError) {
          if (authError.message.includes("already registered") || authError.status === 422) {
            const { data: userList } = await adminClient.auth.admin.listUsers();
            const foundUser = userList.users.find(u => u.email === dummyEmail);
            targetUserId = foundUser?.id;
          } else {
            return NextResponse.json({ error: authError.message }, { status: 500 });
          }
        } else {
          targetUserId = authData.user?.id;
        }

        if (!targetUserId) {
          return NextResponse.json({ error: 'ไม่สามารถดึงหรือสร้างรหัสสมาชิกได้' }, { status: 500 });
        }

        // ยิงสร้างข้อมูลลงตาราง profiles ตามโครงสร้างจริง (มี id, phone_number, role)
        const { error: profileError } = await adminClient
          .from("profiles")
          .upsert(
            { id: targetUserId, phone_number: cleanPhone, role: "user" },
            { onConflict: 'id' }
          );

        if (profileError) return NextResponse.json({ error: `บันทึกโปรไฟล์ล้มเหลว: ${profileError.message}` }, { status: 500 });
      }

      finalCustomerName = trimmedName !== "" ? trimmedName : `คุณลูกค้า (${cleanPhone.slice(-4)})`;
    }

    // 💾 2. บันทึกข้อมูลลงตาราง orders
    const { data: orderData, error: orderError } = await adminClient
      .from("orders")
      .insert([
        {
          user_id: targetUserId,
          customer_name: finalCustomerName, 
          contact: cleanPhone,
          shipping_fee: shippingFee,
          total_price: totalPrice,
          status: "pending",
          slip_url: slipUrl,
        },
      ])
      .select()
      .single();

    if (orderError) return NextResponse.json({ error: `บันทึกออเดอร์ล้มเหลว: ${orderError.message}` }, { status: 500 });

    // 📦 3. บันทึกรายการสินค้าลง order_items
    const itemsToInsert = cart.map((item: any) => ({
      order_id: orderData.id,
      product_id: item.product.id,
      quantity: item.quantity,
      selected_size: item.selectedSize,
    }));

    const { error: itemsError } = await adminClient
      .from("order_items")
      .insert(itemsToInsert);

    if (itemsError) return NextResponse.json({ error: `บันทึกรายการสินค้าล้มเหลว: ${itemsError.message}` }, { status: 500 });

    return NextResponse.json({ success: true, orderId: orderData.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}