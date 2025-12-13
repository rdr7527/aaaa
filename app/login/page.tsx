'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const handleRegisterClick = () => {
    router.push('/register');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <img src="../src/sh.jpg" alt="الشعار" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
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
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="أدخل كلمة السر"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{ paddingLeft: '40px' }}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                style={{
                  position: 'absolute',
                  left: '12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#666666',
                  fontSize: '18px',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                tabIndex={-1}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>

        <p className={styles.footer}>بيانات المسؤول الافتراضية: admin / admin123</p>

        <p className={styles.registerLink}>
          ليس لديك حساب؟{' '}
          <a onClick={handleRegisterClick} style={{ color: '#4a90e2', cursor: 'pointer', fontWeight: '500', textDecoration: 'none' }}>
            إنشاء حساب جديد
          </a>
        </p>
      </div>
    </div>
  );
}
