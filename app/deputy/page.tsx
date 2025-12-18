"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../admin/admin.module.css';

export default function DeputyPanel() {
  const [user, setUser] = useState<any>(null);
  const [department, setDepartment] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [subjectName, setSubjectName] = useState('');
  const [subjectDesc, setSubjectDesc] = useState('');
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/me');
        if (!res.ok) return router.push('/login');
        const data = await res.json();
        if (data.user.role !== 'admin' && data.user.role !== 'department_manager' && data.user.role !== 'teacher') return router.push('/dashboard');
        setUser(data.user);

        // get deptId from query or user
        const searchParams = new URLSearchParams(window.location.search);
        const deptId = searchParams.get('deptId') || data.user.departmentId;
        if (!deptId) return router.push('/dashboard');

        // fetch the department
        const deptRes = await fetch(`/api/departments?id=${deptId}`);
        if (deptRes.ok) {
          const d = await deptRes.json();
          setDepartment(d.department || null);
        }

        const usersRes = await fetch('/api/admin/users');
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData.users || []);
        }

        const subjRes = await fetch('/api/subjects');
        if (subjRes.ok) {
          const subjData = await subjRes.json();
          setSubjects((subjData.subjects || []).filter((s: any) => s.departmentId === deptId));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const addUser = async () => {
    if (!userId.trim() || !name.trim() || !password.trim() || !user || !department) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, name, role, password, departmentId: department.id }),
      });
      if (res.ok) {
        const body = await res.json();
        setUsers([...users, body.user]);
        setUserId(''); setName(''); setPassword(''); setRole('user');
      } else {
        const err = await res.json();
        alert(err.error || 'خطأ');
      }
    } catch (e) {
      console.error(e);
      alert('خطأ في الإتصال');
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('هل تريد حذف هذا المستخدم؟')) return;
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
      if (res.ok) setUsers(users.filter(u => u.id !== id));
      else {
        const err = await res.json();
        alert(err.error || 'خطأ');
      }
    } catch (e) {
      console.error(e);
      alert('خطأ في الإتصال');
    }
  };

  const addSubject = async () => {
    if (!subjectName.trim() || !department) return;
    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: subjectName, description: subjectDesc, departmentId: department.id }),
      });
      if (res.ok) {
        const body = await res.json();
        setSubjects([...subjects, body.subject]);
        setSubjectName('');
        setSubjectDesc('');
      } else {
        const err = await res.json();
        alert(err.error || 'خطأ');
      }
    } catch (e) {
      console.error(e);
      alert('خطأ في الإتصال');
    }
  };

  const deleteSubject = async (id: string) => {
    if (!confirm('هل تريد حذف هذه المادة؟')) return;
    try {
      const res = await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
      if (res.ok) setSubjects(subjects.filter(s => s.id !== id));
      else {
        const err = await res.json();
        alert(err.error || 'خطأ');
      }
    } catch (e) {
      console.error(e);
      alert('خطأ في الإتصال');
    }
  };

  const assignTeacherToSubject = async (teacherId: string, subjectId: string) => {
    try {
      const res = await fetch(`/api/subjects/${subjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId }),
      });
      if (res.ok) {
        setSubjects(subjects.map(s => s.id === subjectId ? { ...s, teacherId } : s));
      } else {
        const err = await res.json();
        alert(err.error || 'خطأ');
      }
    } catch (e) {
      console.error(e);
      alert('خطأ في الإتصال');
    }
  };

  if (loading) return <div className={styles.loading}>جارٍ التحميل...</div>;
  if (!user) return null;

  return (
    <div className={styles.container}>
      <header className={styles.navbar} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="../src/sh.png" alt="الشعار" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ fontSize: '16px', fontWeight: 700 }}>منارة المعرفة</span>
            <small style={{ fontSize: '12px', color: '#ffffffcc' }}>صلاحيات نائب المدير - إدارة القسم</small>
          </div>
        </div>
        <div>
          <button onClick={async () => { await fetch('/api/logout', { method: 'POST' }); router.push('/login'); }} className={styles.logoutBtn} style={{ padding: '8px 12px' }}>تسجيل الخروج</button>
        </div>
      </header>

      <div className={styles.tabs}>
        <button 
          className={activeTab === 'users' ? styles.active : ''} 
          onClick={() => setActiveTab('users')}
        >
          المستخدمين
        </button>
        <button 
          className={activeTab === 'subjects' ? styles.active : ''} 
          onClick={() => setActiveTab('subjects')}
        >
          المواد
        </button>
        <button 
          className={activeTab === 'teachers' ? styles.active : ''} 
          onClick={() => setActiveTab('teachers')}
        >
          مديري القسم
        </button>
      </div>

      <main className={styles.main}>
        {activeTab === 'users' && (
          <div className={styles.tabContent} style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div className={styles.form} style={{ marginBottom: 20 }}>
              <h2>إضافة مستخدم جديد للقسم: {department ? department.name : 'غير محدد'}</h2>
              <input placeholder="اسم المستخدم" value={userId} onChange={e => setUserId(e.target.value)} />
              <input placeholder="الاسم الكامل" value={name} onChange={e => setName(e.target.value)} />
              <input placeholder="كلمة المرور" type="password" value={password} onChange={e => setPassword(e.target.value)} />
              <select value={role} onChange={e => setRole(e.target.value)}>
                <option value="user">طالب</option>
              </select>
              <button onClick={addUser}>إضافة</button>
            </div>

            <div className={styles.list}>
              <h2>المستخدمين في القسم</h2>
              {users.filter(u => u.departmentId === department.id).length === 0 ? (
                <p>لا يوجد مستخدمين</p>
              ) : (
                users.filter(u => u.departmentId === department.id).map(u => (
                  <div key={u.id} className={styles.item}>
                    <div>
                      <h3>{u.name || u.id}</h3>
                      <p>المستخدم: {u.id} | الدور: {u.role}</p>
                    </div>
                    <button className={styles.deleteBtn} onClick={() => deleteUser(u.id)}>حذف</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'subjects' && (
          <div className={styles.tabContent} style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div className={styles.form} style={{ marginBottom: 20 }}>
              <h2>إضافة مادة جديدة</h2>
              <input placeholder="اسم المادة" value={subjectName} onChange={e => setSubjectName(e.target.value)} />
              <textarea placeholder="وصف المادة" value={subjectDesc} onChange={e => setSubjectDesc(e.target.value)} rows={3} />
              <button onClick={addSubject}>إضافة</button>
            </div>

            <div className={styles.list}>
              <h2>المواد</h2>
              {subjects.length === 0 ? (
                <p>لا توجد مواد</p>
              ) : (
                subjects.map(s => (
                  <div key={s.id} className={styles.item}>
                    <div>
                      <h3>{s.name}</h3>
                      <p>{s.description}</p>
                    </div>
                    <button className={styles.deleteBtn} onClick={() => deleteSubject(s.id)}>حذف</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'teachers' && (
          <div className={styles.tabContent} style={{ maxWidth: 1000, margin: '0 auto' }}>
            <h2>ربط مديري القسم بالمواد</h2>
            {subjects.length === 0 ? (
              <p>لا توجد مواد</p>
            ) : (
              subjects.map(s => (
                <div key={s.id} className={styles.item}>
                  <div>
                    <h3>{s.name}</h3>
                    <p>{s.description}</p>
                    <p>مدير القسم الحالي: {s.teacherId ? users.find(u => u.id === s.teacherId)?.name || s.teacherId : 'غير محدد'}</p>
                  </div>
                  <select onChange={e => assignTeacherToSubject(e.target.value, s.id)}>
                    <option value="">اختر معلم</option>
                    {users.filter(u => (u.role === 'teacher' || u.role === 'department_manager') && u.departmentId === department.id).map(u => (
                      <option key={u.id} value={u.id}>{u.name || u.id}</option>
                    ))}
                  </select>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
