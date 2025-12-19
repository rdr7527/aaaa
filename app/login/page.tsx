'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
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

      if (!res.ok) {
        setError(data.error || 'فشل تسجيل الدخول');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
    } catch (err) {
      setError('خطأ في الخادم');
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <img src="../src/login.png" alt="الشعار" className="login-logo" />
          <p>تسجيل الدخول</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.group}>
            <label>يوزر</label>
            <input
              type="text"
              placeholder="أدخل اسم المستخدم"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className={styles.group}>
            <label>كلمة السر</label>
            <input
              type="password"
              placeholder="أدخل كلمة السر"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>

        <p className={styles.footer}>بيانات المسؤول الافتراضية: admin / admin123</p>
      </div>
    </div>
  );
}
