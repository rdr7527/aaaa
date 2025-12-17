"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './dashboard.module.css';

function formatAnswer(answer: any, answerType?: string): string {
  if (!answer) return '<بدون إجابة>';
  if (answerType === 'tf') {
    return answer === 'true' ? 'صح ✓' : answer === 'false' ? 'خطأ ✗' : String(answer);
  }
  return String(answer);
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('departments');
  const [teacherSubTab, setTeacherSubTab] = useState('add-teacher');
  const [userFilter, setUserFilter] = useState('all');
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [modalUserSearchTerm, setModalUserSearchTerm] = useState('');
  const [modalUserFilter, setModalUserFilter] = useState('all');
  const router = useRouter();

const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  
  useEffect(()=>{
    (async ()=>{
      try {
        const res = await fetch('/api/me');
          if (res.status === 200) {
          const data = await res.json();
          setUser(data.user);
          // Keep teachers on the dashboard
          // For other department users (students) keep existing behavior and send to /department
          // Department managtment managers go to deputy
          if (data.user.role !== 'admin' && data.user.role !== 'department_manager' && data.user.role !== 'teacher' && data.user.departmentId) {
            router.push('/department');
          }
          // Keep department managers on the dashboard
          // Teachers go to deputy
          if (data.user.role === 'teacher') return router.push('/deputy');
          if (data.user.role !== 'admin' && data.user.role !== 'department_manager' && data.user.departmentId) {
            router.push('/department');
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

  useEffect(() => {
    if (!user) return;
    if (user.role === 'admin') {
      loadData();
      // Ensure admin only sees departments tab
      if (activeTab !== 'departments') {
        setActiveTab('departments');
      }
    } else if (user.role === 'department_manager') {
      loadDepartmentData(user.departmentId);
    }
  }, [user]);

  const loadData = async () => {
    try {
      const deptRes = await fetch('/api/departments');
      if (deptRes.ok) {
        const deptData = await deptRes.json();
        setDepartments(deptData.departments || []);
      }

      // Admin needs departments, users, and subjects data
      if (user?.role === 'admin') {
        const usersRes = await fetch('/api/admin/users');
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData.users || []);
        }

        const subjRes = await fetch('/api/subjects');
        if (subjRes.ok) {
          const subjData = await subjRes.json();
          setSubjects(subjData.subjects || []);
        }

        setVideos([]);
        return;
      }

      const subjRes = await fetch('/api/subjects');
      if (subjRes.ok) {
        const subjData = await subjRes.json();
        setSubjects(subjData.subjects || []);
      }

      const vidRes = await fetch('/api/videos');
      if (vidRes.ok) {
        const vidData = await vidRes.json();
        setVideos(vidData.videos || []);
      }
    } catch (e) {
      console.error('خطأ في تحميل البيانات', e);
    }
  };

  const loadDepartmentData = async (deptId: string) => {
    if (!deptId) return;
    try {
      const res = await fetch(`/api/departments?id=${deptId}`);
      if (!res.ok) {
        console.error('فشل جلب القسم');
        setDepartments([]);
        setSubjects([]);
        setVideos([]);
        return;
      }
      const body = await res.json();
      const dept = body.department;
      if (!dept) {
        setDepartments([]);
        setSubjects([]);
        setVideos([]);
        return;
      }
      setDepartments([dept]);
      // subjects may be nested inside dept
      const deptSubjects = dept.subjects || [];
      setSubjects(deptSubjects || []);
      // gather videos
      const deptVideos: any[] = [];
      (deptSubjects || []).forEach((s: any) => {
        (s.videos || []).forEach((v: any) => deptVideos.push({ ...v, subjectName: s.name, subjectId: s.id }));
      });
      setVideos(deptVideos);
      // try load assignments for this department
      try {
        const ares = await fetch(`/api/assignments?departmentId=${deptId}`);
        if (ares.ok) {
          const abody = await ares.json();
          setAssignments(abody.assignments || []);
        }
      } catch (e) {
        console.error('خطأ في تحميل الواجبات', e);
      }
      // load users for this department (for department managers)
      try {
        const ures = await fetch('/api/admin/users');
        if (ures.ok) {
          const ubody = await ures.json();
          setUsers(ubody.users || []);
        }
      } catch (e) {
        console.error('خطأ في تحميل المستخدمين', e);
      }
    } catch (e) {
      console.error('خطأ في تحميل بيانات القسم', e);
      setDepartments([]);
      setSubjects([]);
      setVideos([]);
      setUsers([]);
    }
  };

  const handleAddAssignment = async (title: string, question: string, answerType: string, options?: string[], correctAnswer?: string, dueDate?: string) => {
    if (!user?.departmentId) return;
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, question, answerType, options, correctAnswer, dueDate, departmentId: user.departmentId }),
      });
      if (res.ok) {
        // reload assignments
        const ares = await fetch(`/api/assignments?departmentId=${user.departmentId}`);
        if (ares.ok) {
          const abody = await ares.json();
          setAssignments(abody.assignments || []);
        }
      } else {
        const text = await res.text();
        console.error('فشل إضافة الواجب', res.status, text);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompleteAssignment = async (assignmentId: string, answer: any) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/assignments/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ assignmentId, answer, userId: user.id, userName: user.name || user.id }),
      });
      if (res.ok) {
        // update local state to show completion to manager
        setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, completions: [...(a.completions || []), { userId: user.id, userName: user.name || user.id, answer, date: new Date().toISOString() }] } : a));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditDept = async (deptId: string) => {
    const newName = prompt('اسم القسم الجديد:');
    if (newName) {
      const res = await fetch(`/api/departments/${deptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        if (user?.role === 'admin') loadData();
        else if (user?.role === 'department_manager') loadDepartmentData(user.departmentId);
      }
    }
  };

  // Admin CRUD actions for departments
  const handleAddDept = async (name: string, description: string) => {
    if (user?.role !== 'admin') return;
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      if (res.ok) loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDept = async (deptId: string) => {
    if (user?.role !== 'admin') return;
    if (!confirm('هل تريد حذف هذا القسم؟ سيتم حذف جميع المواد والفيديوهات المرتبطة به.')) return;
    try {
      const res = await fetch(`/api/departments/${deptId}`, { method: 'DELETE' });
      if (res.ok) loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Admin CRUD actions for users
  const handleAddUser = async (userId: string, name: string, role: string, password: string, departmentId?: string) => {
    if (user?.role !== 'admin' && !(user?.role === 'department_manager' && role === 'user')) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, name, role, password, departmentId: departmentId || null }),
      });
      if (res.ok) {
        if (user?.role === 'admin') {
          loadData();
        } else if (user?.role === 'department_manager') {
          loadDepartmentData(user.departmentId);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (user?.role !== 'admin' && user?.role !== 'department_manager') return;
    if (!confirm('هل تريد حذف هذا المستخدم؟')) return;
    try {
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(userId)}`, { method: 'DELETE' });
      if (res.ok) {
        if (user?.role === 'admin') {
          loadData();
        } else if (user?.role === 'department_manager') {
          loadDepartmentData(user.departmentId);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Update teacher department
  const handleUpdateTeacher = async (teacherId: string, updates: any) => {
    if (user?.role !== 'admin') return;
    try {
      const res = await fetch(`/api/admin/users`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: teacherId, ...updates }),
      });
      if (res.ok) loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Update teacher subjects
  const handleUpdateTeacherSubjects = async (teacherId: string, subjectNames: string) => {
    if (user?.role !== 'admin') return;
    const subjectNameList = subjectNames.split(',').map(s => s.trim()).filter(s => s);
    // For simplicity, we'll update the teacherId in subjects that match the names
    // In a real app, this might need a more complex API
    try {
      // First, remove teacherId from all subjects
      await Promise.all(subjects.map(async (subject) => {
        if (subject.teacherId === teacherId) {
          await fetch(`/api/subjects/${subject.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teacherId: null }),
          });
        }
      }));
      // Then, assign to matching subjects
      await Promise.all(subjects.map(async (subject) => {
        if (subjectNameList.includes(subject.name)) {
          await fetch(`/api/subjects/${subject.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teacherId }),
          });
        }
      }));
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Manager CRUD actions: add subject, add video, delete, edit
  const handleAddSubject = async (name: string, description: string, departmentId: string, teacherId?: string) => {
    if (!(user?.role === 'admin' || user?.role === 'department_manager' || user?.role === 'teacher')) return;
    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, departmentId, teacherId }),
      });
      if (res.ok) loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditSubject = async (subjectId: string, newName: string) => {
    if (user?.role !== 'admin') return;
    try {
      const res = await fetch(`/api/subjects/${subjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (user?.role !== 'admin') return;
    if (!confirm('هل تريد حذف هذه المادة؟')) return;
    try {
      const res = await fetch(`/api/subjects/${subjectId}`, { method: 'DELETE' });
      if (res.ok) loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddVideo = async (title: string, url: string, description: string, subjectId: string) => {
    if (!user?.departmentId) return;
    try {
      const res = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, url, description, departmentId: user.departmentId, subjectId }),
      });
      if (res.ok) loadDepartmentData(user.departmentId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSubjectForManager = async (subjectId: string) => {
    if (!user) return;
    if (!confirm('هل تريد حذف هذه المادة؟')) return;
    try {
      const res = await fetch(`/api/departments/${user.departmentId}/subjects/${subjectId}`, { method: 'DELETE' });
      if (res.ok) loadDepartmentData(user.departmentId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteVideo = async (videoId: string, subjectId: string) => {
    if (!user) return;
    if (!confirm('هل تريد حذف هذا الفيديو؟')) return;
    try {
      const res = await fetch(`/api/departments/${user.departmentId}/subjects/${subjectId}/videos/${videoId}`, { method: 'DELETE' });
      if (res.ok) loadDepartmentData(user.departmentId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!user || user.role !== 'department_manager') return;
    if (!confirm('هل تريد حذف هذا الواجب؟')) return;
    try {
      const res = await fetch(`/api/assignments?id=${encodeURIComponent(assignmentId)}`, { method: 'DELETE' });
      if (res.ok) {
        // reload assignments
        const ares = await fetch(`/api/assignments?departmentId=${user.departmentId}`);
        if (ares.ok) {
          const abody = await ares.json();
          setAssignments(abody.assignments || []);
        }
      } else {
        console.error('فشل حذف الواجب');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditSubjectForManager = async (subjectId: string) => {
    const newName = prompt('اسم المادة الجديد:');
    if (!newName) return;
    try {
      const res = await fetch(`/api/subjects/${subjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) loadDepartmentData(user.departmentId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditVideo = async (videoId: string) => {
    const newTitle = prompt('عنوان الفيديو الجديد:');
    if (!newTitle) return;
    try {
      const res = await fetch(`/api/videos/${videoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) loadDepartmentData(user.departmentId);
    } catch (e) {
      console.error(e);
    }
  };

  const [selectedVideo, setSelectedVideo] = useState<{ video: any; subjectId?: string } | null>(null);

  const [addModalType, setAddModalType] = useState<'subject' | 'video' | 'assignment' | 'student' | 'department' | 'teacher' | null>(null);

  const [viewModalType, setViewModalType] = useState<'subjects' | 'videos' | 'assignments' | 'students' | 'departments' | 'teachers' | 'users' | null>(null);

  function getYoutubeEmbedUrl(url: string): string | null {
    try {
      const youtubeUrlRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
      const match = url.match(youtubeUrlRegex);
      return match ? `https://www.youtube.com/embed/${match[1]}` : null;
    } catch {
      return null;
    }
  }

  const selectAssignment = (assignment: any) => setSelectedAssignment(assignment);
  const closeAssignment = () => setSelectedAssignment(null);

  const openVideo = (video: any, subjectId?: string) => setSelectedVideo({ video, subjectId });
  const closeVideo = () => setSelectedVideo(null);

  const filteredDepartments = departments.filter(d => 
    d.name.includes(searchTerm) || d.description?.includes(searchTerm)
  );

  const filteredSubjects = subjects.filter(s => 
    s.name.includes(searchTerm) || s.description?.includes(searchTerm)
  );

  const filteredVideos = videos.filter(v => 
    v.title.includes(searchTerm) || v.description?.includes(searchTerm)
  );

  const filteredUsers = users.filter(u => 
    (u.id || '').includes(searchTerm) || 
    (u.name || '').includes(searchTerm) || 
    (u.role || '').includes(searchTerm)
  ).filter(u => userFilter === 'all' || u.role === userFilter);

  const teachers = users.filter(u => u.role === 'department_manager' || u.role === 'teacher');
  const filteredTeachers = teachers.filter(t => 
    (t.id || '').includes(searchTerm) || 
    (t.name || '').includes(searchTerm)
  ).filter(t => teacherFilter === 'all' || t.role === teacherFilter);

  const students = users.filter(u => u.role === 'user');
  const filteredStudents = students.filter(s => 
    (s.id || '').includes(searchTerm) || 
    (s.name || '').includes(searchTerm)
  );

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
          <img src="../src/sh.jpg" alt="الشعار" className={styles.logo} />
          <div className={styles.userMenu}>
            <span>{user.id}</span>
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
                <div className={styles.searchSection}>
                  <input
                    type="text"
                    placeholder="ابحث عن قسم أو مادة أو فيديو..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '18px', marginTop: '22px', direction: 'ltr' }}>
                  <div onClick={() => setActiveTab('departments')} style={{ border: '1px solid #000', padding: '14px', borderRadius: '10px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                      <h4 style={{ margin: 0, textAlign: 'right', fontSize: '20px' }}>إدارة الأقسام</h4>
                      <img src="../src/svg/book.svg" alt="" style={{ width: '28px', height: '28px' }} />

                    </div>
                    <div style={{ marginTop: '12px' }}>
                      <p onClick={(e) => {e.stopPropagation(); setAddModalType('department')}} style={{ cursor: 'pointer', textAlign: 'center' }}>إضافة قسم جديد</p>
                      <p onClick={(e) => {e.stopPropagation(); setViewModalType('departments')}} style={{ cursor: 'pointer', textAlign: 'center' }}>عرض الأقسام ({filteredDepartments.length})</p>
                    </div>
                  </div>
                  {user.role === 'admin' && (
                    <div style={{ border: '1px solid #000', padding: '14px', borderRadius: '10px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                        <h4 style={{ margin: 0, textAlign: 'right', fontSize: '20px' }}>إدارة المستخدمين</h4>
                        <img src="../src/svg/student.svg" alt="" style={{ width: '28px', height: '28px' }} />
                      </div>
                      <div style={{ marginTop: '12px' }}>
                        <p onClick={(e) => {e.stopPropagation(); setAddModalType('student')}} style={{ cursor: 'pointer', textAlign: 'center' }}>إضافة مستخدم جديد</p>
                        <p onClick={(e) => {e.stopPropagation(); setViewModalType('users')}} style={{ cursor: 'pointer', textAlign: 'center' }}>عرض مستخدمين ({filteredUsers.length})</p>
                      </div>
                    </div>
                  )}
                  {user.role === 'admin' && (
                    <div onClick={() => setActiveTab('teachers')} style={{ border: '1px solid #000', padding: '14px', borderRadius: '10px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                        <h4 style={{ margin: 0, textAlign: 'right', fontSize: '20px' }}>أعضاء هيئة التدريس</h4>
                        <img src="../src/svg/assignment.svg" alt="" style={{ width: '28px', height: '28px' }} />

                      </div>
                      <div style={{ marginTop: '12px' }}>
                        <p onClick={(e) => {e.stopPropagation(); setAddModalType('teacher')}} style={{ cursor: 'pointer', textAlign: 'right' }}>إضافة مدير قسم جديد</p>
                        <p onClick={(e) => {e.stopPropagation(); setViewModalType('teachers')}} style={{ cursor: 'pointer', textAlign: 'right' }}>عرض مديري القسم ({filteredTeachers.length})</p>
                      </div>
                    </div>
                  )}
                  {((user.role === 'department_manager') || (user.role === 'teacher')) && (
                    <div onClick={() => setActiveTab('subjects')} style={{ border: '1px solid #000', padding: '14px', borderRadius: '10px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                        <img src="../src/svg/book.svg" alt="" style={{ width: '28px', height: '28px' }} />
                        <h4 style={{ margin: 0, textAlign: 'right', fontSize: '20px' }}>إدارة المواد</h4>
                      </div>
                      <div style={{ marginTop: '12px' }}>
                        <p onClick={(e) => {e.stopPropagation(); setAddModalType('subject')}} style={{ cursor: 'pointer', textAlign: 'center' }}>إضافة مادة</p>
                        <p onClick={(e) => {e.stopPropagation(); setViewModalType('subjects')}} style={{ cursor: 'pointer', textAlign: 'center' }}>عرض المواد ({filteredSubjects.length})</p>
                      </div>
                    </div>
                  )}
                  {user.role === 'department_manager' && (
                    <div onClick={() => setActiveTab('videos')} style={{ border: '1px solid #000', padding: '14px', borderRadius: '10px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                        <img src="../src/svg/video.svg" alt="" style={{ width: '28px', height: '28px' }} />
                        <h4 style={{ margin: 0, textAlign: 'right', fontSize: '20px' }}>إدارة الفيديوهات</h4>
                      </div>
                      <div style={{ marginTop: '12px' }}>
                        <p onClick={(e) => {e.stopPropagation(); setAddModalType('video')}} style={{ cursor: 'pointer', textAlign: 'center' }}>إضافة درس</p>
                        <p onClick={(e) => {e.stopPropagation(); setViewModalType('videos')}} style={{ cursor: 'pointer', textAlign: 'center' }}>عرض الدروس ({filteredVideos.length})</p>
                      </div>
                    </div>
                  )}

                </div>

                {/* لوحة عرض الأقسام أزيلت حسب الطلب (لا تظهر هنا). */}

                {activeTab === 'users' && user.role === 'admin' && (
                  <div>
                    <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #000', borderRadius: '8px' }}>
                      <h4>إضافة مستخدم جديد</h4>
                      <AddUserForm departments={departments} onAdd={handleAddUser} />
                    </div>
                    <h3>المستخدمين</h3>
                    <div className={styles.subTabs}>
                      <button 
                        onClick={() => setUserFilter('all')}
                        className={`${styles.tabButton} ${userFilter === 'all' ? styles.active : ''}`}
                      >
                        الكل ({users.length})
                      </button>
                      <button 
                        onClick={() => setUserFilter('user')}
                        className={`${styles.tabButton} ${userFilter === 'user' ? styles.active : ''}`}
                      >
                        مستخدم عادي ({users.filter(u => u.role === 'user').length})
                      </button>
                      <button 
                        onClick={() => setUserFilter('teacher')}
                        className={`${styles.tabButton} ${userFilter === 'teacher' ? styles.active : ''}`}
                      >
                        مدير القسم ({users.filter(u => u.role === 'department_manager' || u.role === 'teacher').length})
                      </button>
                      <button 
                        onClick={() => setUserFilter('admin')}
                        className={`${styles.tabButton} ${userFilter === 'admin' ? styles.active : ''}`}
                      >
                        مسؤول النظام ({users.filter(u => u.role === 'admin').length})
                      </button>
                    </div>
                    {filteredUsers.length === 0 ? (
                      <p className={styles.noData}>لا يوجد مستخدمين</p>
                    ) : (
                      <div className={styles.departmentsGrid}>
                        {filteredUsers.map(u => {
                          const dept = departments.find(d => d.id === u.departmentId);
                          return (
                            <div key={u.id} className={styles.departmentCard}>
                              <h4 className={styles.cardTitle}>{u.name || u.id}</h4>
                              <p className={styles.cardDesc}>المستخدم: {u.id}</p>
                              <p className={styles.cardDesc}>
                                الدور: {u.role === 'admin' ? 'مسؤول النظام' : u.role === 'department_manager' ? 'دكتور' : u.role === 'teacher' ? 'مدير القسم' : 'مستخدم عادي'}
                              </p>
                              {u.departmentId && <p className={styles.cardDesc}>القسم: {dept ? dept.name : 'غير محدد'}</p>}
                              <div className={styles.cardActions}>
                                {u.role === 'department_manager' && (
                                  <button 
                                    onClick={() => router.push(`/deputy?deptId=${u.departmentId}`)}
                                    className={styles.editBtn}
                                  >
                                    دخول إلى صفحة النايب
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleDeleteUser(u.id)}
                                  className={styles.deleteBtn}
                                >
                                  حذف
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'teachers' && user.role === 'admin' && (
                  <div>
                    <h3>إدارة أعضاء هيئة التدريس</h3>
                    <div className={styles.subTabs}>
                      <button 
                        onClick={() => setTeacherSubTab('add-teacher')}
                        className={`${styles.subTabButton} ${teacherSubTab === 'add-teacher' ? styles.active : ''}`}
                      >
                        1. إضافة أو حذف مدير القسم
                      </button>
                      <button 
                        onClick={() => setTeacherSubTab('add-subject')}
                        className={`${styles.subTabButton} ${teacherSubTab === 'add-subject' ? styles.active : ''}`}
                      >
                        إضافة مادة
                      </button>
                      <button 
                        onClick={() => setTeacherSubTab('assign-teacher')}
                        className={`${styles.subTabButton} ${teacherSubTab === 'assign-teacher' ? styles.active : ''}`}
                      >
                        2. ربط مدير القسم بالمواد
                      </button>
                      <button 
                        onClick={() => setTeacherSubTab('monitor-teacher')}
                        className={`${styles.subTabButton} ${teacherSubTab === 'monitor-teacher' ? styles.active : ''}`}
                      >
                        3. متابعة أداء مديري القسم
                      </button>
                    </div>

                    {teacherSubTab === 'add-teacher' && (
                      <div>
                        <div className={styles.addForm}>
                          <h4>إضافة مدير قسم جديد</h4>
                          <AddTeacherForm departments={departments} onAdd={handleAddUser} />
                        </div>
                        <h4>مديري القسم الحاليين</h4>
                        {filteredTeachers.length === 0 ? (
                          <p className={styles.noData}>لا يوجد مديري قسم</p>
                        ) : (
                          <div className={styles.departmentsGrid}>
                            {filteredTeachers.map(t => {
                              const dept = departments.find(d => d.id === t.departmentId);
                              return (
                                <div key={t.id} style={{
                                  border: '1px solid #000',
                                  padding: '15px',
                                  borderRadius: '8px',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                }}>
                                  <h4 style={{ margin: '0 0 10px 0' }}>{t.name || t.id}</h4>
                                  <p style={{ color: '#666', fontSize: '14px', margin: '0 0 5px 0' }}>المستخدم: {t.id}</p>
                                  {t.departmentId && <p style={{ color: '#666', fontSize: '14px', margin: '0 0 15px 0' }}>القسم: {dept ? dept.name : 'غير محدد'}</p>}
                                  <button 
                                    onClick={() => handleDeleteUser(t.id)}
                                    style={{
                                      padding: '8px 16px',
                                      background: '#d32f2f',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                    }}
                                  >
                                    حذف
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {teacherSubTab === 'add-subject' && (
                      <div>
                        <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #000', borderRadius: '8px' }}>
                          <h4>إضافة مادة جديدة</h4>
                          <AddSubjectForm departments={departments} teachers={teachers} onAdd={handleAddSubject} user={user} />
                        </div>
                      </div>
                    )}

                    {teacherSubTab === 'assign-teacher' && (
                      <div>
                        <h4>إدارة مديري القسم والمواد</h4>
                        {teachers.length === 0 ? (
                          <p style={{ color: '#000' }}>لا يوجد مديري قسم</p>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                            {teachers.map(teacher => {
                              const teacherDept = departments.find(d => d.id === teacher.departmentId);
                              const teacherSubjects = subjects.filter(s => s.teacherId === teacher.id);
                              return (
                                <div key={teacher.id} style={{
                                  border: '1px solid #000',
                                  padding: '15px',
                                  borderRadius: '8px',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                }}>
                                  <h4 style={{ margin: '0 0 10px 0' }}>{teacher.name || teacher.id}</h4>
                                  <p style={{ color: '#666', fontSize: '14px', margin: '0 0 5px 0' }}>المستخدم: {teacher.id}</p>
                                  <p style={{ color: '#666', fontSize: '14px', margin: '0 0 5px 0' }}>القسم: {teacherDept ? teacherDept.name : 'غير محدد'}</p>
                                  <p style={{ color: '#666', fontSize: '14px', margin: '0 0 10px 0' }}>المواد: {teacherSubjects.length > 0 ? teacherSubjects.map(s => s.name).join(', ') : 'لا توجد مواد'}</p>
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button 
                                      onClick={() => {
                                        const newDept = prompt('اختر القسم الجديد:', teacherDept?.name || '');
                                        if (newDept) {
                                          const dept = departments.find(d => d.name === newDept);
                                          if (dept) {
                                            // Update teacher department
                                            handleUpdateTeacher(teacher.id, { departmentId: dept.id });
                                          }
                                        }
                                      }}
                                      style={{
                                        padding: '6px 12px',
                                        background: '#0d47a1',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                      }}
                                    >
                                      تعديل القسم
                                    </button>
                                    <button 
                                      onClick={() => {
                                        const subjectNames = teacherSubjects.map(s => s.name).join(', ');
                                        const newSubjects = prompt('المواد الحالية: ' + subjectNames + '\nأدخل أسماء المواد الجديدة (مفصولة بفاصلة):', subjectNames);
                                        if (newSubjects !== null) {
                                          // Update teacher subjects
                                          handleUpdateTeacherSubjects(teacher.id, newSubjects);
                                        }
                                      }}
                                      style={{
                                        padding: '6px 12px',
                                        background: '#1565c0',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                      }}
                                    >
                                      تعديل المواد
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (teacherSubjects.length === 0) return alert('لا توجد مواد مرتبطة بهذا مدير القسم');
                                        const subjOptions = teacherSubjects.map(s => `${s.id}|${s.name}`).join('\n');
                                        const sel = prompt('اختر المادة عبر السطر المبين (الصيغة id|name):\n' + subjOptions);
                                        if (!sel) return;
                                        const sid = sel.split('|')[0];
                                        const studentId = prompt('أدخل معرف الطالب لإضافته إلى المادة:');
                                        if (!studentId) return;
                                        try {
                                          const res = await fetch(`/api/subjects/${sid}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ addStudent: studentId }),
                                          });
                                          if (res.ok) {
                                            alert('تم إضافة الطالب بنجاح');
                                            loadData();
                                          } else {
                                            const txt = await res.text();
                                            alert('فشل الإضافة: ' + txt);
                                          }
                                        } catch (e) {
                                          console.error(e);
                                        }
                                      }}
                                      style={{
                                        padding: '6px 12px',
                                        background: '#388e3c',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                      }}
                                    >
                                      أضف طالب للمادة
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteUser(teacher.id)}
                                      style={{
                                        padding: '6px 12px',
                                        background: '#d32f2f',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                      }}
                                    >
                                      حذف مدير القسم
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {teacherSubTab === 'monitor-teacher' && (
                      <div>
                        <h4>متابعة أداء مديري القسم</h4>
                        <p>هذه الميزة قيد التطوير...</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'subjects' && (user.role === 'department_manager' || user.role === 'teacher') && (
                  <div>
                    <h3>المواد الدراسية</h3>
                    {filteredSubjects.length === 0 ? (
                      <p style={{ color: '#000' }}>لا توجد مواد</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                        {filteredSubjects.map(subject => (
                          <div key={subject.id} style={{
                            border: '1px solid #000',
                            padding: '15px',
                            borderRadius: '8px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          }}>
                            <h4 style={{ margin: '0 0 10px 0' }}>{subject.name}</h4>
                            <p style={{ color: '#666', fontSize: '14px', margin: '0' }}>{subject.description}</p>
                            {user.role === 'department_manager' && (
                              <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                                <button onClick={() => handleEditSubjectForManager(subject.id)} style={{ padding: '6px 10px' }}>تعديل</button>
                                <button onClick={() => handleDeleteSubjectForManager(subject.id)} style={{ padding: '6px 10px' }}>حذف</button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {(user.role === 'department_manager' || user.role === 'teacher') && (
                      <div style={{ marginTop: '20px' }}>
                        <h4>أضف مادة جديدة</h4>
                        <AddSubjectForm departments={departments} teachers={[]} onAdd={(name, desc, deptId, teacherId) => handleAddSubject(name, desc, user.departmentId || deptId, user.role === 'teacher' ? user.id : teacherId)} user={user} />
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'videos' && user.role === 'department_manager' && (
                  <div>
                    <h3>الفيديوهات التعليمية</h3>
                    {filteredVideos.length === 0 ? (
                      <p style={{ color: '#000' }}>لا توجد فيديوهات</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                        {filteredVideos.map(video => (
                          <div key={video.id} style={{
                            border: '1px solid #000',
                            padding: '15px',
                            borderRadius: '8px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          }}>
                            <h4 style={{ margin: '0 0 10px 0' }}>{video.title}</h4>
                            <p style={{ color: '#666', fontSize: '14px', margin: '0' }}>{video.description}</p>
                            <p style={{ color: '#000', fontSize: '12px', marginTop: '8px' }}>المادة: {video.subjectName || video.subject}</p>
                            <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                              <button onClick={() => openVideo(video, video.subjectId || video.subject)} style={{ padding: '6px 10px' }}>▶ تشغيل</button>
                              {user.role === 'department_manager' && (
                                <>
                                  <button onClick={() => handleEditVideo(video.id)} style={{ padding: '6px 10px' }}>تعديل</button>
                                  <button onClick={() => handleDeleteVideo(video.id, video.subjectId || video.subject)} style={{ padding: '6px 10px' }}>حذف</button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {user.role === 'department_manager' && (
                      <div style={{ marginTop: '20px' }}>
                        <h4>أضف فيديو جديد</h4>
                        <AddVideoForm subjects={subjects} onAdd={handleAddVideo} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className={styles.cardHeader}>
                <div>
                  <h2>بوابة الدكتور</h2>
                  <div style={{ marginTop: '10px', fontSize: '14px', color: '#0d47a1', lineHeight: '1.5', fontFamily: 'sans-serif' }}>
                    <p style={{ margin: '5px 0', fontWeight: '500' }}>القسم: {departments.find(d => d.id === user.departmentId)?.name || 'غير محدد'}</p>
                    <p style={{ margin: '5px 0', fontWeight: '500' }}>الاسم: {user.name || user.id}</p>
                  </div>
                </div>
                <p className={styles.role}>{user.role}</p>
              </div>
              <div className={styles.content}>
                {user.role === 'department_manager' ? (
                  <>
                    <h3>إدارة قسمك</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '30px' }}>
                      {/* المواد */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                       
                        <div style={{ border: '1px solid #000', padding: '14px', borderRadius: '10px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginBottom: '8px' }}>
                            <img src="../src/svg/book.svg" alt="كتاب" style={{ width: '28px', height: '28px' }} />
                            <h4 style={{ margin: 0, textAlign: 'right', fontSize: '20px', fontFamily: 'sans-serif' }}>المواد</h4>
                          </div>
                          <p style={{ fontSize: '15px', margin: 0, cursor: 'pointer', fontFamily: 'sans-serif' }} onClick={() => setAddModalType('subject')}>إضافة مادة</p>
                          <p style={{ fontSize: '15px', margin: 0, cursor: 'pointer', fontFamily: 'sans-serif' }} onClick={() => setViewModalType('subjects')}>عرض المواد ({filteredSubjects.length})</p>
                        </div>
                      </div>

                      {/* الدروس */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ border: '1px solid #000', padding: '14px', borderRadius: '10px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginBottom: '8px' }}>
                            <img src="../src/svg/video.svg" alt="فيديو" style={{ width: '28px', height: '28px' }} />
                            <h4 style={{ margin: 0, textAlign: 'right', fontSize: '20px', fontFamily: 'sans-serif' }}>الدروس</h4>
                          </div>
                          <p style={{ fontSize: '15px', margin: 0, cursor: 'pointer', fontFamily: 'sans-serif' }} onClick={() => setAddModalType('video')}>إضافة درس</p>
                          <p style={{ fontSize: '15px', margin: 0, cursor: 'pointer', fontFamily: 'sans-serif' }} onClick={() => setViewModalType('videos')}>عرض الدروس ({filteredVideos.length})</p>
                        </div>
                      </div>

                      {/* الواجبات */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ border: '1px solid #000', padding: '14px', borderRadius: '10px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginBottom: '8px' }}>
                            <img src="../src/svg/assignment.svg" alt="واجب" style={{ width: '28px', height: '28px' }} />
                            <h4 style={{ margin: 0, textAlign: 'right', fontSize: '20px', fontFamily: 'sans-serif' }}>الواجبات</h4>
                          </div>
                          <p style={{ fontSize: '15px', margin: 0, cursor: 'pointer', fontFamily: 'sans-serif' }} onClick={() => setAddModalType('assignment')}>إضافة واجب</p>
                          <p style={{ fontSize: '15px', margin: 0, cursor: 'pointer', fontFamily: 'sans-serif' }} onClick={() => setViewModalType('assignments')}>عرض الواجبات ({assignments?.length || 0})</p>
                        </div>
                      </div>

                      {/* إضافة الطلاب */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ border: '1px solid #000', padding: '14px', borderRadius: '10px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginBottom: '8px' }}>
                            <img src="../src/svg/student.svg" alt="طالب" style={{ width: '28px', height: '28px' }} />
                            <h4 style={{ margin: 0, textAlign: 'right', fontSize: '20px', fontFamily: 'sans-serif' }}>إضافة الطلاب</h4>
                          </div>
                          <p style={{ fontSize: '15px', margin: 0, cursor: 'pointer', fontFamily: 'sans-serif' }} onClick={() => setAddModalType('student')}>إضافة طالب</p>
                          <p style={{ fontSize: '15px', margin: 0, cursor: 'pointer', fontFamily: 'sans-serif', textAlign: 'right' }} onClick={() => setViewModalType('students')}>عرض الطلاب ({filteredStudents.length})</p>
                        </div>
                      </div>
                    </div>

                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {selectedVideo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', padding: '16px', maxWidth: '900px', width: '90%', borderRadius: 8, position: 'relative', direction: 'rtl' }}>
            <button onClick={closeVideo} style={{ position: 'absolute', left: 8, top: 8, fontSize: 20, border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>{selectedVideo.video.title}</h2>
            {getYoutubeEmbedUrl(selectedVideo.video.url) ? (
              <iframe width="100%" height="480" src={getYoutubeEmbedUrl(selectedVideo.video.url) || ''} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            ) : (
              <div>
                <p>لا يمكن تشغيل هذا الفيديو</p>
                <a href={selectedVideo.video.url} target="_blank" rel="noopener noreferrer">افتح في نافذة جديدة</a>
              </div>
            )}
            <p style={{ marginTop: 8 }}>{selectedVideo.video.description}</p>
          </div>
        </div>
      )}

      {addModalType && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', padding: '20px', maxWidth: '600px', width: '90%', borderRadius: 8, position: 'relative', direction: 'rtl' }}>
            <button onClick={() => setAddModalType(null)} style={{ position: 'absolute', left: 8, top: 8, fontSize: 20, border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
            <h2 style={{ marginTop: 0, marginBottom: 16 }}>
              {addModalType === 'subject' ? 'إضافة مادة جديدة' : addModalType === 'video' ? 'إضافة درس جديد' : addModalType === 'assignment' ? 'إضافة واجب جديد' : addModalType === 'department' ? 'إضافة قسم جديد' : 'إضافة طالب جديد'}
            </h2>
            {addModalType === 'subject' && (
              <AddSubjectForm departments={departments} teachers={[]} onAdd={(name, desc, deptId, teacherId) => { handleAddSubject(name, desc, user.departmentId || deptId, teacherId); setAddModalType(null); }} user={user} />
            )}
            {addModalType === 'video' && (
              <AddVideoForm subjects={subjects} onAdd={(title, url, desc, subjectId) => { handleAddVideo(title, url, desc, subjectId); setAddModalType(null); }} />
            )}
            {addModalType === 'assignment' && (
              <AddAssignmentForm onAdd={(title, question, answerType, options, correctAnswer, dueDate) => { handleAddAssignment(title, question, answerType, options, correctAnswer, dueDate); setAddModalType(null); }} />
            )}
            {addModalType === 'department' && (
              <AddDepartmentForm onAdd={(name, description) => { handleAddDept(name, description); setAddModalType(null); }} />
            )}
            {addModalType === 'student' && (
              <AddUserForm departments={departments} onAdd={(userId, name, role, password, departmentId) => { handleAddUser(userId, name, 'user', password, departmentId || user.departmentId); setAddModalType(null); }} allowedRoles={['user']} />
            )}
          </div>
        </div>
      )}

      {viewModalType && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', padding: '20px', maxWidth: '800px', width: '90%', maxHeight: '80vh', overflow: 'auto', borderRadius: 8, position: 'relative', direction: 'rtl' }}>
            <button onClick={() => setViewModalType(null)} style={{ position: 'absolute', left: 8, top: 8, fontSize: 20, border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
            <h2 style={{ marginTop: 0, marginBottom: 16 }}>
              {viewModalType === 'subjects' ? 'المواد الدراسية' : viewModalType === 'videos' ? 'الدروس التعليمية' : viewModalType === 'assignments' ? 'الواجبات' : viewModalType === 'departments' ? 'الأقسام الدراسية' : viewModalType === 'teachers' ? 'مديري القسم' : viewModalType === 'users' ? 'المستخدمين' : 'الطلاب'}
            </h2>
            {viewModalType === 'subjects' && (
              <div>
                {filteredSubjects.length === 0 ? (
                  <p>لا توجد مواد</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                    {filteredSubjects.map(subject => (
                      <div key={subject.id} style={{
                        border: '1px solid #000',
                        padding: '10px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      }}>
                        <h5 style={{ margin: '0 0 8px 0' }}>{subject.name}</h5>
                        <p style={{ color: '#666', fontSize: '12px', margin: '0 0 8px 0' }}>{subject.description}</p>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleEditSubjectForManager(subject.id)} style={{ padding: '4px 8px', fontSize: '12px' }}>تعديل</button>
                          <button onClick={() => handleDeleteSubjectForManager(subject.id)} style={{ padding: '4px 8px', fontSize: '12px', background: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px' }}>حذف</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {viewModalType === 'videos' && (
              <div>
                {filteredVideos.length === 0 ? (
                  <p>لا توجد دروس</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                    {filteredVideos.map(video => (
                      <div key={video.id} style={{
                        border: '1px solid #000',
                        padding: '10px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      }}>
                        <h5 style={{ margin: '0 0 8px 0' }}>{video.title}</h5>
                        <p style={{ color: '#666', fontSize: '12px', margin: '0 0 4px 0' }}>{video.description}</p>
                        <p style={{ color: '#000', fontSize: '11px', margin: '0 0 8px 0' }}>المادة: {video.subjectName}</p>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => openVideo(video, video.subjectId)} style={{ padding: '4px 8px', fontSize: '12px' }}>▶ تشغيل</button>
                          <button onClick={() => handleEditVideo(video.id)} style={{ padding: '4px 8px', fontSize: '12px' }}>تعديل</button>
                          <button onClick={() => handleDeleteVideo(video.id, video.subjectId)} style={{ padding: '4px 8px', fontSize: '12px', background: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px' }}>حذف</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {viewModalType === 'assignments' && (
              <div>
                {assignments && assignments.length > 0 ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {assignments.map(a => (
                      <div key={a.id} style={{ border: '1px solid #000', padding: 10, borderRadius: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <strong style={{ fontSize: '14px' }}>{a.title}</strong>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: 11, color: '#666' }}>{a.dueDate ? `المهلة: ${new Date(a.dueDate).toLocaleDateString()}` : ''}</span>
                            <button onClick={() => handleDeleteAssignment(a.id)} style={{ padding: '2px 6px', background: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px' }}>حذف</button>
                          </div>
                        </div>
                        <p style={{ margin: 0, fontSize: '13px' }}>{a.question}</p>
                        {(user.role === 'department_manager' || user.role === 'teacher') && (
                          <div style={{ marginTop: 8 }}>
                            <h6 style={{ margin: '0 0 6px 0', fontSize: '12px' }}>التسليمات ({(a.completions || []).length})</h6>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {(a.completions || []).slice(0, 3).map((c: any, idx: number) => (
                                <div key={idx} style={{ border: '1px solid #e0e0e0', padding: 6, borderRadius: 4, background: '#fafafa', fontSize: '11px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <strong style={{ fontSize: '11px' }}>{c.userName || c.userId}</strong>
                                    <span style={{ fontSize: '10px', color: '#999' }}>{c.date ? new Date(c.date).toLocaleString() : ''}</span>
                                  </div>
                                  <div style={{ fontSize: '10px', padding: '4px 6px', background: 'white', borderRadius: 3, border: '1px solid #e0e0e0', wordBreak: 'break-word' }}>
                                    {formatAnswer(c.answer, a.answerType)}
                                  </div>
                                </div>
                              ))}
                              {(a.completions || []).length > 3 && <p style={{ fontSize: '11px', color: '#666', margin: 0 }}>... و {(a.completions || []).length - 3} أخرى</p>}
                              {(!a.completions || a.completions.length === 0) && <p style={{ color: '#999', fontSize: '11px', margin: 0 }}>لا توجد تسليمات</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>لا توجد واجبات</p>
                )}
              </div>
            )}
            {viewModalType === 'students' && (
              <div>
                {filteredStudents.length === 0 ? (
                  <p>لا يوجد طلاب</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                    {filteredStudents.map(student => {
                      const dept = departments.find(d => d.id === student.departmentId);
                      return (
                        <div key={student.id} style={{
                          border: '1px solid #000',
                          padding: '10px',
                          borderRadius: '8px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        }}>
                          <h5 style={{ margin: '0 0 8px 0' }}>{student.name || student.id}</h5>
                          <p style={{ color: '#666', fontSize: '12px', margin: '0 0 5px 0' }}>المستخدم: {student.id}</p>
                          {student.departmentId && <p style={{ color: '#666', fontSize: '12px', margin: '0 0 8px 0' }}>القسم: {dept ? dept.name : 'غير محدد'}</p>}
                          <button onClick={() => handleDeleteUser(student.id)} style={{ padding: '4px 8px', fontSize: '12px', background: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px' }}>حذف</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {viewModalType === 'users' && (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <input
                    type="text"
                    placeholder="ابحث عن مستخدم..."
                    value={modalUserSearchTerm}
                    onChange={(e) => setModalUserSearchTerm(e.target.value)}
                    style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', width: '100%', maxWidth: '300px', marginBottom: '10px' }}
                  />
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => setModalUserFilter('all')}
                      style={{
                        padding: '6px 12px',
                        background: modalUserFilter === 'all' ? '#1976d2' : '#e0e0e0',
                        color: modalUserFilter === 'all' ? 'white' : 'black',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      الكل
                    </button>
                    <button 
                      onClick={() => setModalUserFilter('user')}
                      style={{
                        padding: '6px 12px',
                        background: modalUserFilter === 'user' ? '#1976d2' : '#e0e0e0',
                        color: modalUserFilter === 'user' ? 'white' : 'black',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      الطلاب
                    </button>
                    <button 
                      onClick={() => setModalUserFilter('department_manager')}
                      style={{
                        padding: '6px 12px',
                        background: modalUserFilter === 'department_manager' ? '#1976d2' : '#e0e0e0',
                        color: modalUserFilter === 'department_manager' ? 'white' : 'black',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      دكتور
                    </button>
                    <button 
                      onClick={() => setModalUserFilter('teacher')}
                      style={{
                        padding: '6px 12px',
                        background: modalUserFilter === 'teacher' ? '#1976d2' : '#e0e0e0',
                        color: modalUserFilter === 'teacher' ? 'white' : 'black',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      مدير القسم
                    </button>
                    <button 
                      onClick={() => setModalUserFilter('admin')}
                      style={{
                        padding: '6px 12px',
                        background: modalUserFilter === 'admin' ? '#1976d2' : '#e0e0e0',
                        color: modalUserFilter === 'admin' ? 'white' : 'black',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      مدير النظام
                    </button>
                  </div>
                </div>
                {(() => {
                  const modalFilteredUsers = users.filter(u => 
                    (u.id || '').includes(modalUserSearchTerm) || 
                    (u.name || '').includes(modalUserSearchTerm) || 
                    (u.role || '').includes(modalUserSearchTerm)
                  ).filter(u => modalUserFilter === 'all' || u.role === modalUserFilter);
                  return modalFilteredUsers.length === 0 ? (
                    <p>لا يوجد مستخدمين</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                      {modalFilteredUsers.map(u => {
                        const dept = departments.find(d => d.id === u.departmentId);
                        return (
                          <div key={u.id} style={{
                            border: '1px solid #000',
                            padding: '10px',
                            borderRadius: '8px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          }}>
                            <h5 style={{ margin: '0 0 8px 0' }}>{u.name || u.id}</h5>
                            <p style={{ color: '#666', fontSize: '12px', margin: '0 0 5px 0' }}>المستخدم: {u.id}</p>
                            <p style={{ color: '#666', fontSize: '12px', margin: '0 0 5px 0' }}>
                              الدور: {u.role === 'admin' ? 'مدير النظام' : u.role === 'department_manager' ? 'دكتور' : u.role === 'teacher' ? 'مدير القسم' : 'طالب'}
                            </p>
                            {u.departmentId && <p style={{ color: '#666', fontSize: '12px', margin: '0 0 8px 0' }}>القسم: {dept ? dept.name : 'غير محدد'}</p>}
                            <button onClick={() => handleDeleteUser(u.id)} style={{ padding: '4px 8px', fontSize: '12px', background: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px' }}>حذف</button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
            {viewModalType === 'teachers' && (
              <div>
                {filteredTeachers.length === 0 ? (
                  <p>لا يوجد مديري قسم</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                    {filteredTeachers.map(t => {
                      const dept = departments.find(d => d.id === t.departmentId);
                      return (
                        <div key={t.id} style={{
                          border: '1px solid #000',
                          padding: '10px',
                          borderRadius: '8px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        }}>
                          <h5 style={{ margin: '0 0 8px 0' }}>{t.name || t.id}</h5>
                          <p style={{ color: '#666', fontSize: '12px', margin: '0 0 5px 0' }}>المستخدم: {t.id}</p>
                          {t.departmentId && <p style={{ color: '#666', fontSize: '12px', margin: '0 0 8px 0' }}>القسم: {dept ? dept.name : 'غير محدد'}</p>}
                          <button onClick={() => handleDeleteUser(t.id)} style={{ padding: '4px 8px', fontSize: '12px', background: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px' }}>حذف</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {viewModalType === 'departments' && (
              <div>
                {filteredDepartments.length === 0 ? (
                  <p>لا توجد أقسام</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                    {filteredDepartments.map(dept => (
                      <div key={dept.id} style={{
                        border: '1px solid #000',
                        padding: '10px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      }}>
                        <h5 style={{ margin: '0 0 8px 0' }}>{dept.name}</h5>
                        <p style={{ color: '#666', fontSize: '12px', margin: '0 0 8px 0' }}>{dept.description}</p>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleEditDept(dept.id)} style={{ padding: '4px 8px', fontSize: '12px' }}>تعديل</button>
                          {user.role === 'admin' && (
                            <button onClick={() => handleDeleteDept(dept.id)} style={{ padding: '4px 8px', fontSize: '12px', background: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px' }}>حذف</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}



function AddVideoForm({ subjects, onAdd }: { subjects: any[]; onAdd: (title: string, url: string, description: string, subjectId: string) => void }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [desc, setDesc] = useState('');
  const [subjectId, setSubjectId] = useState('');

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', borderRadius: 6, border: '1px solid #ccc', fontSize: 14 };
  const btnStyle: React.CSSProperties = { padding: '10px 14px', background: '#1565c0', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (title && url && subjectId) { onAdd(title, url, desc, subjectId); setTitle(''); setUrl(''); setDesc(''); setSubjectId(''); } }}
      style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: '560px' }}
      aria-label="نموذج إضافة فيديو"
    >
      <label style={{ fontSize: 14, marginBottom: 4 }}>المادة</label>
      <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required style={{ ...inputStyle, appearance: 'none' }}>
        <option value="">-- اختر مادة --</option>
        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      <label style={{ fontSize: 14, marginTop: 6, marginBottom: 4 }}>عنوان الفيديو</label>
      <input placeholder="عنوان واضح للفيديو" value={title} onChange={(e) => setTitle(e.target.value)} required style={inputStyle} />

      <label style={{ fontSize: 14, marginTop: 6, marginBottom: 4 }}>رابط الفيديو</label>
      <input placeholder="رابط يوتيوب أو رابط مباشر" value={url} onChange={(e) => setUrl(e.target.value)} required style={inputStyle} />

      <label style={{ fontSize: 14, marginTop: 6, marginBottom: 4 }}>وصف (اختياري)</label>
      <textarea placeholder="ملخص قصير عن محتوى الفيديو" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />

      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <button type="submit" style={btnStyle}>أضف الفيديو</button>
        <button type="button" onClick={() => { setTitle(''); setUrl(''); setDesc(''); setSubjectId(''); }} style={{ padding: '10px 14px', borderRadius: 6, border: '1px solid #ccc', background: 'white', cursor: 'pointer' }}>مسح</button>
      </div>
    </form>
  );
}

function AddAssignmentForm({ onAdd }: { onAdd: (title: string, question: string, answerType: string, options?: string[], correctAnswer?: string, dueDate?: string) => void }) {
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [answerType, setAnswerType] = useState('choice');
  const [optionsText, setOptionsText] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [due, setDue] = useState('');

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', borderRadius: 6, border: '1px solid #ccc', fontSize: 14 };
  const btnStyle: React.CSSProperties = { padding: '10px 14px', background: '#000', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' };

  return (
    <form onSubmit={(e) => { e.preventDefault(); const opts = optionsText ? optionsText.split('|').map(s => s.trim()).filter(Boolean) : undefined; onAdd(title, question, answerType, opts, correctAnswer || undefined, due || undefined); setTitle(''); setQuestion(''); setAnswerType('choice'); setOptionsText(''); setCorrectAnswer(''); setDue(''); }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label>اسم الدرس / عنوان الواجب</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="مثال: واجب الأسبوع 1" style={inputStyle} />

      <label>السؤال</label>
      <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} placeholder="نص السؤال" style={{ ...inputStyle, resize: 'vertical' }} />

      <label>نوع الإجابة</label>
      <select value={answerType} onChange={(e) => setAnswerType(e.target.value)} style={inputStyle}>
        <option value="choice">اختيار من متعدد</option>
        <option value="tf">صح / خطأ</option>
        <option value="essay">مقالي</option>
      </select>

      {answerType === 'choice' && (
        <>
          <label>الخيارات (افصل بين الخيارات بـ <span style={{ fontWeight: 600 }}>|</span>)</label>
          <input value={optionsText} onChange={(e) => setOptionsText(e.target.value)} placeholder="خيار1 | خيار2 | خيار3" style={inputStyle} />
          <label>الإجابة الصحيحة (نص الخيار الصحيح)</label>
          <input value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} placeholder="ضع النص الصحيح من الخيارات" style={inputStyle} />
        </>
      )}

      {answerType === 'tf' && (
        <>
          <label>الإجابة الصحيحة</label>
          <select value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} style={inputStyle}>
            <option value="true">صح</option>
            <option value="false">خطأ</option>
          </select>
        </>
      )}

      <label>تاريخ التسليم (اختياري)</label>
      <input type="date" value={due} onChange={(e) => setDue(e.target.value)} style={inputStyle} />

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" style={btnStyle}>أضف الواجب</button>
        <button type="button" onClick={() => { setTitle(''); setQuestion(''); setAnswerType('choice'); setOptionsText(''); setCorrectAnswer(''); setDue(''); }} style={{ padding: '10px 14px', borderRadius: 6, border: '1px solid #ccc', background: 'white', cursor: 'pointer' }}>مسح</button>
      </div>
    </form>
  );
}

function ChoiceAnswer({ a, onComplete }: { a: any; onComplete: (ans: string) => Promise<boolean> }) {
  const [selected, setSelected] = useState('');
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(a.options || []).map((opt: string, idx: number) => (
          <label key={idx} style={{ display: 'block' }}>
            <input type="radio" name={`choice-${a.id}`} value={opt} checked={selected === opt} onChange={() => setSelected(opt)} /> {opt}
          </label>
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        <button onClick={() => selected && onComplete(selected)} style={{ padding: '8px 12px' }}>أجب</button>
      </div>
    </div>
  );
}

function TFAnswer({ a, onComplete }: { a: any; onComplete: (ans: string) => Promise<boolean> }) {
  const [val, setVal] = useState('true');
  return (
    <div>
      <div>
        <label style={{ marginRight: 8 }}><input type="radio" name={`tf-${a.id}`} value="true" checked={val === 'true'} onChange={() => setVal('true')} /> صح</label>
        <label><input type="radio" name={`tf-${a.id}`} value="false" checked={val === 'false'} onChange={() => setVal('false')} /> خطأ</label>
      </div>
      <div style={{ marginTop: 8 }}>
        <button onClick={() => onComplete(val)} style={{ padding: '8px 12px' }}>أجب</button>
      </div>
    </div>
  );
}

function EssayAnswer({ a, onComplete }: { a: any; onComplete: (ans: string) => Promise<boolean> }) {
  const [text, setText] = useState('');
  return (
    <div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} style={{ width: '100%', padding: 8 }} />
      <div style={{ marginTop: 8 }}>
        <button onClick={() => text && onComplete(text)} style={{ padding: '8px 12px' }}>أجب</button>
      </div>
    </div>
  );
}

function AddDepartmentForm({ onAdd }: { onAdd: (name: string, description: string) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim(), description.trim());
      setName('');
      setDescription('');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <input
        type="text"
        placeholder="اسم القسم"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
      />
      <textarea
        placeholder="الوصف"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
      />
      <button type="submit" style={{ padding: '10px', background: '#1565c0', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        إضافة القسم
      </button>
    </form>
  );
}

function AddUserForm({ departments, subjects, onAdd, allowedRoles = ['user', 'teacher', 'department_manager', 'admin'] }: { departments?: any[], subjects?: any[], onAdd: (userId: string, name: string, role: string, password: string, departmentId?: string, subjectId?: string) => void, allowedRoles?: string[] }) {
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');
  const [password, setPassword] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [subjectId, setSubjectId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) { alert('يرجى إدخال اسم المستخدم'); return; }
    if (!name.trim()) { alert('يرجى إدخال الاسم الكامل'); return; }
    if (!password.trim()) { alert('يرجى إدخال كلمة المرور'); return; }
    onAdd(userId.trim(), name.trim(), role, password, departmentId || undefined, subjectId || undefined);
    setUserId('');
    setName('');
    setPassword('');
    setRole('user');
    setDepartmentId('');
    setSubjectId('');
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <input
        type="text"
        placeholder="اسم المستخدم (مثل: user123)"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        required
        style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
      />
      <input
        type="text"
        placeholder="الاسم الكامل (مثل: محمد أحمد)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
      />
      <input
        type="password"
        placeholder="كلمة المرور"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
      >
        {allowedRoles.includes('admin') && <option value="admin">مسؤول النظام</option>}
        {allowedRoles.includes('department_manager') && <option value="department_manager">دكتور</option>}
        {allowedRoles.includes('teacher') && <option value="teacher">مدير القسم</option>}
        {allowedRoles.includes('user') && <option value="user">مستخدم عادي</option>}
        
        
        
      </select>
      {subjects ? (
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
        >
          <option value="">اختر المادة</option>
          {subjects.map((subj) => (
            <option key={subj.id} value={subj.id}>{subj.name}</option>
          ))}
        </select>
      ) : (
        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
        >
          <option value="">اختر القسم (اختياري)</option>
          {departments?.map((dept) => (
            <option key={dept.id} value={dept.id}>{dept.name}</option>
          ))}
        </select>
      )}
      <button type="submit" style={{ padding: '10px', background: '#1565c0', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        إضافة المستخدم
      </button>
    </form>
  );
}

function AddTeacherForm({ departments, onAdd }: { departments: any[], onAdd: (userId: string, name: string, role: string, password: string, departmentId?: string) => void }) {
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userId.trim() && name.trim() && password.trim() && departmentId) {
      onAdd(userId.trim(), name.trim(), 'department_manager', password.trim(), departmentId);
      setUserId('');
      setName('');
      setPassword('');
      setDepartmentId('');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <input
        type="text"
        placeholder="اسم المستخدم"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        required
        style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
      />
      <input
        type="text"
        placeholder="الاسم الكامل"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
      />
      <input
        type="password"
        placeholder="كلمة المرور"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
      />
      <select
        value={departmentId}
        onChange={(e) => setDepartmentId(e.target.value)}
        required
        style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
      >
        <option value="">اختر القسم</option>
        {departments?.map((dept) => (
          <option key={dept.id} value={dept.id}>{dept.name}</option>
        ))}
      </select>
      <button type="submit" style={{ padding: '10px', background: '#1565c0', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        إضافة مدير القسم
      </button>
    </form>
  );
}

function AddSubjectForm({ departments = [], teachers = [], onAdd, user }: { departments?: any[], teachers?: any[], onAdd: (name: string, description: string, departmentId: string, teacherId?: string) => void, user?: any }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [teacherId, setTeacherId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const deptId = user?.role === 'department_manager' ? user.departmentId : departmentId;
    const teacherRequired = teachers.length > 0;
    if (name.trim() && deptId && (!teacherRequired || teacherId)) {
      onAdd(name.trim(), description.trim(), deptId, teacherId || undefined);
      setName('');
      setDescription('');
      setDepartmentId('');
      setTeacherId('');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <input
        type="text"
        placeholder="اسم المادة"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
      />
      <textarea
        placeholder="وصف المادة"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
      />
      {user?.role !== 'department_manager' && (
        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          required
          style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
        >
          <option value="">اختر القسم</option>
          {departments?.map((dept) => (
            <option key={dept.id} value={dept.id}>{dept.name}</option>
          ))}
        </select>
      )}
      {teachers.length > 0 && (
        <select
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          required
          style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
        >
          <option value="">اختر مدير القسم</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>{teacher.name || teacher.id}</option>
          ))}
        </select>
      )}
      <button type="submit" style={{ padding: '10px', background: '#1565c0', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        إضافة المادة
      </button>
    </form>
  );
}
