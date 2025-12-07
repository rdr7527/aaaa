"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './admin.module.css';

export default function AdminPanel() {
  const [user, setUser] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tab, setTab] = useState('departments');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/me');
        if (res.status !== 200) return router.push('/login');
        const data = await res.json();
        if (data.user.role !== 'admin') return router.push('/dashboard');
        setUser(data.user);
        
        const deptRes = await fetch('/api/departments');
        if (deptRes.ok) {
          const deptData = await deptRes.json();
          setDepartments(deptData.departments || []);
        }
        
        const usersRes = await fetch('/api/admin/users');
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData.users || []);
        }
      } catch (e) {}
      finally {
        setLoading(false);
      }
    })();
  }, []);

  const addDept = async (name: string, desc: string) => {
    const res = await fetch('/api/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: desc }),
    });
    if (res.ok) {
      const data = await res.json();
      setDepartments([...departments, data.department]);
    }
  };

  const deleteDept = async (id: string) => {
    if (confirm('هل تريد حذف هذا القسم؟')) {
      const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDepartments(departments.filter(d => d.id !== id));
      }
    }
  };

  const deleteSubject = async (deptId: string, subjId: string) => {
    if (confirm('هل تريد حذف هذا المقرر؟')) {
      const res = await fetch(`/api/departments/${deptId}/subjects/${subjId}`, { method: 'DELETE' });
      if (res.ok) {
        setDepartments(departments.map(d => 
          d.id === deptId 
            ? { ...d, subjects: (d.subjects || []).filter((s: any) => s.id !== subjId) }
            : d
        ));
      }
    }
  };

  const addUser = async (userId: string, name: string, role: string, password: string, departmentId: string | null) => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, name, role, password, departmentId }),
    });
    if (res.ok) {
      const data = await res.json();
      setUsers([...users, data.user]);
    }
  };

  const deleteUser = async (userId: string) => {
    if (confirm('هل تريد حذف هذا المستخدم؟')) {
      const res = await fetch(`/api/admin/users?id=${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
      }
    }
  };

  if (loading) return <div className={styles.loading}>جارٍ التحميل...</div>;
  if (!user || user.role !== 'admin') return null;

  return (
    <div className={styles.container}>
      <nav className={styles.navbar}>
        <h1>إدارة النظام</h1>
      </nav>
      
      <div className={styles.tabs}>
        <button 
          className={tab === 'departments' ? styles.active : ''} 
          onClick={() => setTab('departments')}
        >
          الأقسام
        </button>
        <button 
          className={tab === 'subjects' ? styles.active : ''} 
          onClick={() => setTab('subjects')}
        >
          المقررات
        </button>
        <button 
          className={tab === 'users' ? styles.active : ''} 
          onClick={() => setTab('users')}
        >
          المستخدمين
        </button>
      </div>

      <main className={styles.main}>
        {tab === 'departments' && (
          <DepartmentsTab 
            departments={departments} 
            onAdd={addDept}
            onDelete={deleteDept}
          />
        )}
        {tab === 'subjects' && (
          <SubjectsTab 
            departments={departments}
            onDelete={deleteSubject}
          />
        )}
        {tab === 'users' && (
          <UsersTab 
            users={users} 
            departments={departments}
            onAdd={addUser}
            onDelete={deleteUser}
          />
        )}
      </main>
    </div>
  );
}

function DepartmentsTab({ departments, onAdd, onDelete }: any) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const submit = () => {
    if (name.trim()) {
      onAdd(name, desc);
      setName('');
      setDesc('');
    }
  };

  return (
    <div className={styles.tabContent}>
      <div className={styles.form}>
        <h2>إضافة قسم جديد</h2>
        <input 
          placeholder="اسم القسم" 
          value={name} 
          onChange={e => setName(e.target.value)}
        />
        <textarea 
          placeholder="الوصف" 
          value={desc} 
          onChange={e => setDesc(e.target.value)}
          rows={3}
        />
        <button onClick={submit}>إضافة</button>
      </div>

      <div className={styles.list}>
        <h2>الأقسام الموجودة</h2>
        {departments.length === 0 ? (
          <p>لا توجد أقسام</p>
        ) : (
          departments.map((dept: any) => (
            <div key={dept.id} className={styles.item}>
              <div>
                <h3>{dept.name}</h3>
                <p>{dept.description}</p>
              </div>
              <button 
                className={styles.deleteBtn}
                onClick={() => onDelete(dept.id)}
              >
                حذف
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SubjectsTab({ departments, onDelete }: any) {
  return (
    <div className={styles.tabContent}>
      <div className={styles.list}>
        <h2>المقررات</h2>
        {departments.length === 0 ? (
          <p>لا توجد أقسام</p>
        ) : (
          departments.map((dept: any) => (
            <div key={dept.id}>
              <h3 className={styles.deptHeader}>{dept.name}</h3>
              {(dept.subjects || []).length === 0 ? (
                <p style={{ paddingLeft: '20px', color: '#666' }}>لا توجد مقررات</p>
              ) : (
                (dept.subjects || []).map((subject: any) => (
                  <div key={subject.id} className={styles.item} style={{ marginLeft: '20px' }}>
                    <div>
                      <h4>{subject.name}</h4>
                      <p>{subject.description}</p>
                      <p style={{ fontSize: '0.9em', color: '#666' }}>{(subject.videos || []).length} فيديوهات</p>
                    </div>
                    <button 
                      className={styles.deleteBtn}
                      onClick={() => onDelete(dept.id, subject.id)}
                    >
                      حذف
                    </button>
                  </div>
                ))
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function UsersTab({ users, onAdd, onDelete, departments }: any) {
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');
  const [password, setPassword] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  const submit = () => {
    if (userId.trim() && name.trim() && password.trim()) {
      onAdd(userId, name, role, password, departmentId || null);
      setUserId('');
      setName('');
      setPassword('');
      setRole('user');
      setDepartmentId('');
    }
  };

  return (
    <div className={styles.tabContent}>
      <div className={styles.form}>
        <h2>إضافة مستخدم جديد</h2>
        <input 
          placeholder="اسم المستخدم" 
          value={userId} 
          onChange={e => setUserId(e.target.value)}
        />
        <input 
          placeholder="الاسم الكامل" 
          value={name} 
          onChange={e => setName(e.target.value)}
        />
        <input 
          placeholder="كلمة المرور" 
          type="password"
          value={password} 
          onChange={e => setPassword(e.target.value)}
        />
        <select value={role} onChange={e => setRole(e.target.value)}>
          <option value="user">مستخدم عادي</option>
          <option value="department_manager">مسؤول قسم</option>
          <option value="admin">مسؤول النظام</option>
        </select>
        <select value={departmentId} onChange={e => setDepartmentId(e.target.value)}>
          <option value="">اختر القسم (اختياري)</option>
          {(departments || []).map((dept: any) => (
            <option key={dept.id} value={dept.id}>{dept.name}</option>
          ))}
        </select>
        <button onClick={submit}>إضافة</button>
      </div>

      <div className={styles.list}>
        <h2>المستخدمين</h2>
        {users.length === 0 ? (
          <p>لا يوجد مستخدمين</p>
        ) : (
          users.map((u: any) => {
            const dept = (departments || []).find((d: any) => d.id === u.departmentId);
            return (
              <div key={u.id} className={styles.item}>
                <div>
                  <h3>{u.name || u.id}</h3>
                  <p>المستخدم: {u.id} | الدور: {u.role === 'admin' ? 'مسؤول النظام' : u.role === 'department_manager' ? 'مسؤول قسم' : 'مستخدم عادي'}</p>
                  {u.departmentId && <p>القسم: {dept ? dept.name : 'غير محدد'}</p>}
                </div>
                <button 
                  className={styles.deleteBtn}
                  onClick={() => onDelete(u.id)}
                >
                  حذف
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
