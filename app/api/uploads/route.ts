import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  console.log('========== بدء رفع الملف ==========');
  
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      console.error('❌ لم يتم استقبال ملف');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('✓ استقبال الملف:', file.name);
    console.log('✓ حجم الملف:', file.size, 'bytes');

    const projectRoot = process.cwd();
    console.log('📂 جذر المشروع:', projectRoot);

    const uploadsDir = path.resolve(projectRoot, 'public', 'uploads', 'faildrs');
    console.log('📂 مسار المجلد:', uploadsDir);

    // إنشاء المجلد
    console.log('⏳ جاري إنشاء المجلد...');
    await fs.mkdir(uploadsDir, { recursive: true });
    console.log('✓ تم إنشاء/التحقق من المجلد');

    // إنشاء اسم الملف
    const timestamp = Date.now();
    const originalName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\s+/g, '_');
    const fileName = `${timestamp}_${originalName}`;
    const filePath = path.resolve(uploadsDir, fileName);

    console.log('📝 اسم الملف:', fileName);
    console.log('📍 المسار الكامل للملف:', filePath);

    // قراءة الملف
    console.log('⏳ جاري قراءة محتوى الملف...');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log('✓ تم قراءة الملف:', buffer.length, 'bytes');

    // حفظ الملف
    console.log('⏳ جاري حفظ الملف...');
    await fs.writeFile(filePath, buffer);
    console.log('✓ تمت كتابة الملف إلى النظام');

    // التحقق من الملف
    console.log('⏳ جاري التحقق من الملف...');
    const stats = await fs.stat(filePath);
    console.log('✓ الملف موجود فعلاً!');
    console.log('✓ حجم الملف المحفوظ:', stats.size, 'bytes');

    if (stats.size === 0) {
      throw new Error('الملف فارغ - لم يتم حفظ البيانات');
    }

    if (stats.size !== buffer.length) {
      console.warn('⚠️ تحذير: حجم الملف المحفوظ لا يطابق الحجم الأصلي');
    }

    const fileUrl = `/uploads/faildrs/${fileName}`;
    
    console.log('========== نجح الرفع! ==========');
    console.log('✅ الرابط:', fileUrl);
    console.log('✅ المسار:', filePath);
    
    return NextResponse.json({ 
      ok: true, 
      url: fileUrl, 
      fileName,
      message: 'تم رفع الملف بنجاح',
      filePath: filePath
    }, { status: 200 });
    
  } catch (e) {
    console.error('========== خطأ! ==========');
    console.error('❌ نوع الخطأ:', e instanceof Error ? e.constructor.name : typeof e);
    console.error('❌ رسالة الخطأ:', e instanceof Error ? e.message : String(e));
    if (e instanceof Error && e.stack) {
      console.error('❌ Stack trace:', e.stack);
    }
    
    const errorMessage = e instanceof Error ? e.message : String(e);
    
    return NextResponse.json({ 
      error: 'فشل رفع الملف', 
      details: errorMessage,
      success: false
    }, { status: 500 });
  }
}
