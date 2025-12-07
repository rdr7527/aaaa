"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './dashboard.module.css';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(()=>{
    (async ()=>{
      try {
        const res = await fetch('/api/me');
        if (res.status === 200) {
          const data = await res.json();
          setUser(data.user);
          // إذا كان للمستخدم قسم وليس مدير، حوله إلى صفحة القسم
          if (data.user.departmentId && data.user.role !== 'admin') {
            router.push('/department');
              }
              // إذا كان مسؤول قسم، حوله إلى لوحة تحكمه
              if (data.user.role === 'department_manager') {
                router.push('/manager');
              }
        } else {
          router.push('/login');
        }
      } catch (e) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    })();
  },[]);

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.spinner}>جارٍ التحميل...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className={styles.container}>
      <nav className={styles.navbar}>
        <div className={styles.navContent}>
          <h1>منصة الكلية</h1>
          <div className={styles.userMenu}>
            <span>{user.id}</span>
            {user.role === 'admin' && (
              <a href="/admin" className={styles.adminLink}>إدارة النظام</a>
            )}
            <button onClick={logout} className={styles.logoutBtn}>تسجيل الخروج</button>
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.card}>
          {user.role === 'admin' ? (
            <>
              <div className={styles.cardHeader}>
                <h2>لوحة تحكم المدير</h2>
                <p className={styles.role}>مسؤول</p>
              </div>
              <div className={styles.content}>
                <p>مرحباً بك في لوحة التحكم</p>
                <div className={styles.adminFeatures}>
                  <div className={styles.feature}>
                    <h3>إدارة الأقسام</h3>
                    <p>يمكنك إضافة وتعديل وحذف الأقسام الدراسية</p>
                  </div>
                  <div className={styles.feature}>
                    <h3>إدارة المستخدمين</h3>
                    <p>يمكنك إدارة صلاحيات المستخدمين وإضافة مستخدمين جدد</p>
                  </div>
                  <div className={styles.feature}>
                    <h3>إدارة المواد والفيديوهات</h3>
                    <p>يمكنك إضافة المواد الدراسية ورفع الفيديوهات التعليمية</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={styles.cardHeader}>
                <h2>لوحة المستخدم</h2>
                <p className={styles.role}>{user.role}</p>
              </div>
              <div className={styles.content}>
                <p>مرحباً بك في منصة الكلية</p>
                <div className={styles.userFeatures}>
                  <div className={styles.feature}>
                    <h3>الأقسام الخاصة بك</h3>
                    <p>عرض جميع الأقسام والمواد المتاحة لك</p>
                  </div>
                  <div className={styles.feature}>
                    <h3>المواد الدراسية</h3>
                    <p>الوصول إلى جميع المواد والمحاضرات</p>
                  </div>
                  <div className={styles.feature}>
                    <h3>الفيديوهات التعليمية</h3>
                    <p>مشاهدة الفيديوهات الشرح والمحاضرات</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
