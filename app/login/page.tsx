"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: any) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!data.ok) return setError(data.error || 'فشل تسجيل الدخول');
      router.push('/dashboard');
    } catch (err) {
      setError('خطأ في الخادم');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>منصة الكلية</h1>
          <p>تسجيل الدخول</p>
        </div>
        <form onSubmit={submit} className={styles.form}>
          <div className={styles.group}>
            <label>اسم المستخدم</label>
            <input 
              type="text"
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="ادخل اسم المستخدم"
              disabled={loading}
            />
          </div>
          <div className={styles.group}>
            <label>كلمة المرور</label>
            <input 
              type="password"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="ادخل كلمة المرور"
              disabled={loading}
            />
          </div>
          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? 'جارٍ التحميل...' : 'دخول'}
          </button>
          {error && <div className={styles.error}>{error}</div>}
        </form>
        <p className={styles.footer}>بيانات المسؤول الافتراضية: admin / admin123</p>
      </div>
    </div>
  );
}
