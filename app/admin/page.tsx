"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './admin.module.css';

// Reusable Item component
function Item({ onDelete, children }: { onDelete: () => void; children: React.ReactNode }) {
  return (
    <div className={styles.item}>
      <div>{children}</div>
      <button className={styles.deleteBtn} onClick={onDelete}>حذف</button>
    </div>
  );
}

// Reusable filter function
function filterBySearchTerm(items: any[], searchTerm: string, fields: string[]) {
  return items.filter(item =>
    fields.some(field =>
      (item[field] || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  );
}

export default function AdminPanel() {
  const [user, setUser] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tab, setTab] = useState('departments');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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
        
        const usersRes = await fetch('/api/admin/users?page=1&limit=50');
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
    if (confirm('هل تريد حذف هذه المادة؟')) {
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

  const addUser = async (userId: string, name: string, role: string, password: string, departmentId: string | null, deputyAccess: boolean) => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, name, role, password, departmentId, deputyAccess }),
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

  const logout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div className={styles.container}>
      <header className={styles.navbar} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="../src/sh.png" alt="الشعار" className="appLogo" />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ fontSize: '16px', fontWeight: 700 }}>منارة المعرفة</span>
            <small style={{ fontSize: '12px', color: '#ffffffcc' }}>إدارة النظام</small>
          </div>
        </div>
        <div>
          <button onClick={logout} className={styles.logoutBtn} style={{ padding: '8px 12px' }}>تسجيل الخروج</button>
        </div>
      </header>
      
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
          المواد
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
            searchTerm={searchTerm}
          />
        )}

        {tab === 'subjects' && (
          <SubjectsTab 
            departments={departments}
            onDelete={deleteSubject}
            searchTerm={searchTerm}
          />
        )}

        {tab === 'users' && (
          <UsersTab 
            users={users} 
            departments={departments}
            onAdd={addUser}
            onDelete={deleteUser}
            searchTerm={searchTerm}
          />
        )}
      </main>
    </div>
  );
}

// Departments tab component (supports search)
function DepartmentsTab({ departments, onAdd, onDelete, searchTerm }: any) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const submit = () => {
    if (name.trim()) {
      onAdd(name, desc);
      setName('');
      setDesc('');
    }
  };

  const filteredDepartments = filterBySearchTerm(departments || [], searchTerm, ['name', 'description']);

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
        {filteredDepartments.length === 0 ? (
          <p>لا توجد أقسام</p>
        ) : (
          filteredDepartments.map((dept: any) => (
            <Item key={dept.id} onDelete={() => onDelete(dept.id)}>
              <h3>{dept.name}</h3>
              <p>{dept.description}</p>
            </Item>
          ))
        )}
      </div>
    </div>
  );
}

// Subjects tab (supports search inside subjects)
function SubjectsTab({ departments, onDelete, searchTerm }: any) {
  const filteredDepartments = (departments || []).filter((dept: any) =>
    (dept.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (dept.subjects || []).some((s: any) =>
      (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className={styles.tabContent}>
      <div className={styles.list}>
        <h2>المواد</h2>
        {filteredDepartments.length === 0 ? (
          <p>لا توجد أقسام أو مواد</p>
        ) : (
          filteredDepartments.map((dept: any) => {
            const filteredSubjects = (dept.subjects || []).filter((s: any) =>
              (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              (s.description || '').toLowerCase().includes(searchTerm.toLowerCase())
            );

            if (filteredSubjects.length === 0 && searchTerm) return null;

            return (
              <div key={dept.id}>
                <h3 className={styles.deptHeader}>{dept.name}</h3>
                {filteredSubjects.length === 0 ? (
                  <p style={{ paddingLeft: '20px', color: '#666' }}>لا توجد مواد</p>
                ) : (
                  filteredSubjects.map((subject: any) => (
                    <Item key={subject.id} onDelete={() => onDelete(dept.id, subject.id)}>
                      <h4>{subject.name}</h4>
                      <p>{subject.description}</p>
                      <p style={{ fontSize: '0.9em', color: '#666' }}>{(subject.videos || []).length} فيديوهات</p>
                    </Item>
                  ))
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Users tab with search
function UsersTab({ users, onAdd, onDelete, departments, searchTerm }: any) {
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');
  const [password, setPassword] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [deputyAccess, setDeputyAccess] = useState(false);

  const submit = () => {
    if (userId.trim() && name.trim() && password.trim()) {
      onAdd(userId, name, role, password, departmentId || null, deputyAccess);
      setUserId('');
      setName('');
      setPassword('');
      setRole('user');
      setDepartmentId('');
      setDeputyAccess(false);
    }
  };

  const filteredUsers = filterBySearchTerm(users || [], searchTerm, ['id', 'name', 'role']);

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
          <option value="user">طالب</option>
          <option value="department_manager">مدير القسم</option>
          <option value="admin">مسؤول النظام</option>
        </select>
        <select value={departmentId} onChange={e => setDepartmentId(e.target.value)}>
          <option value="">اختر القسم (اختياري)</option>
          {(departments || []).map((dept: any) => (
            <option key={dept.id} value={dept.id}>{dept.name}</option>
          ))}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <input type="checkbox" checked={deputyAccess} onChange={e => setDeputyAccess(e.target.checked)} />
          <span>منح صلاحية نائب المدير</span>
        </label>
        <button onClick={submit}>إضافة</button>
      </div>

      <div className={styles.list}>
        <h2>المستخدمين</h2>
        {filteredUsers.length === 0 ? (
          <p>لا يوجد مستخدمين</p>
        ) : (
          filteredUsers.map((u: any) => {
            const dept = (departments || []).find((d: any) => d.id === u.departmentId);
            return (
              <Item key={u.id} onDelete={() => onDelete(u.id)}>
                <h3>{u.name || u.id} {u.deputyAccess ? <span style={{ fontSize: '0.9em', color: '#0a74ff', marginLeft: 8 }}>(نائب)</span> : null}</h3>
                <p>المستخدم: {u.id} | الدور: {u.role === 'admin' ? 'مسؤول النظام' : (u.role === 'department_manager' || u.role === 'teacher') ? 'مدير القسم' : 'طالب'}</p>
                {u.departmentId && <p>القسم: {dept ? dept.name : 'غير محدد'}</p>}
              </Item>
            );
          })
        )}
      </div>
    </div>
  );
}
