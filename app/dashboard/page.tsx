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
  const [usersPage, setUsersPage] = useState<number>(1);
  const [usersLimit] = useState<number>(50);
  const [usersTotal, setUsersTotal] = useState<number | null>(null);
  const [usersLoadingMore, setUsersLoadingMore] = useState<boolean>(false);
  const [books, setBooks] = useState<any[]>([]);
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userVideoSearch, setUserVideoSearch] = useState('');
  const [userVideoDateFilter, setUserVideoDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week'>('all');
  const [activeTab, setActiveTab] = useState('departments');
  const [teacherSubTab, setTeacherSubTab] = useState('add-teacher');
  const [userFilter, setUserFilter] = useState('all');
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [modalUserSearchTerm, setModalUserSearchTerm] = useState('');
  const [modalUserFilter, setModalUserFilter] = useState('all');
  const [modalStudentsSearchTerm, setModalStudentsSearchTerm] = useState('');
  const [modalStudentsSort, setModalStudentsSort] = useState<'none' | 'name' | 'role'>('none');
  const [modalStudentsFilter, setModalStudentsFilter] = useState<'all' | 'teacher' | 'user'>('all');
  const [modalDeptSearchTerm, setModalDeptSearchTerm] = useState('');
  const [modalLibrarySearchTerm, setModalLibrarySearchTerm] = useState('');
  const deptListRef = React.useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  // Edit user modal state
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', newId: '', password: '' });

  // Add-student-to-subject modal state (for teachers)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [addStudentSubjectId, setAddStudentSubjectId] = useState<string | null>(null);
  const [addStudentId, setAddStudentId] = useState<string | null>(null);

const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  
  useEffect(() => {
    // run once on mount: fetch current user and load role-specific data
    (async () => {
        // no client-side caching of sensitive user info; always validate with server
      try {
        const res = await fetch('/api/me', { credentials: 'include' });
        if (res.status === 200) {
          const data = await res.json();
          setUser(data.user);
          // Load data depending on role. pass `data.user` because setUser is async
          if (data.user.role === 'admin') {
            await loadData(data.user);
          } else if (data.user.role === 'department_manager' || data.user.role === 'teacher') {
            if (data.user.departmentId) await loadDepartmentData(data.user.departmentId);
            else await loadData(data.user);
          } else {
            // student / other non-staff users: load their department so the name can be displayed
            if (data.user.departmentId) {
              await loadDepartmentData(data.user.departmentId);
            } else {
              // fallback: load general data (departments list) in case departmentId is missing
              await loadData(data.user);
            }
          }
          // Load graduation projects for all users
          await loadGraduationProjects();
          setLoading(false);
        } else {
          setLoading(false);
          router.push('/login');
        }
      } catch (e) {
        console.error(e);
        setLoading(false);
        router.push('/login');
      }
    })();
  }, []);

  // Fetch a page of users (server-side pagination)
  const fetchUsersPage = async (page = 1, append = false) => {
    try {
      const res = await fetch(`/api/admin/users?page=${page}&limit=${usersLimit}`, { credentials: 'include' });
      if (!res.ok) return;
      const body = await res.json();
      const newUsers = body.users || [];
      setUsers(prev => append ? [...prev, ...newUsers] : newUsers);
      setUsersTotal(typeof body.total === 'number' ? body.total : null);
      setUsersPage(page);
    } catch (e) {
      console.error('خطأ جلب المستخدمين', e);
    }
  };

  const loadData = async (currentUser?: any) => {
    try {
      const deptRes = await fetch('/api/departments');
      if (deptRes.ok) {
        const deptData = await deptRes.json();
        setDepartments(deptData.departments || []);
      }

      // Admin needs departments, users, and subjects data
      const roleToCheck = currentUser?.role || user?.role;
      if (roleToCheck === 'admin') {
        await fetchUsersPage(1);

        const subjRes = await fetch('/api/subjects');
        if (subjRes.ok) {
          const subjData = await subjRes.json();
          setSubjects(subjData.subjects || []);
        }

        // also load library for admin so added books persist after reload
        const libResAdmin = await fetch('/api/library');
        if (libResAdmin.ok) {
          const libData = await libResAdmin.json();
          setBooks(libData || []);
        }

        setVideos([]);
        return;
      }

      const subjRes = await fetch('/api/subjects');
      if (subjRes.ok) {
        const subjData = await subjRes.json();
        setSubjects(subjData.subjects || []);
      }

      const libRes = await fetch('/api/library');
      if (libRes.ok) {
        const libData = await libRes.json();
        setBooks(libData || []);
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
      const res = await fetch(`/api/departments?id=${deptId}`, { cache: 'no-store', credentials: 'include' });
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
        const ares = await fetch(`/api/assignments?departmentId=${deptId}`, { cache: 'no-store', credentials: 'include' });
        if (ares.ok) {
          const abody = await ares.json();
          setAssignments(abody.assignments || []);
        }
      } catch (e) {
        console.error('خطأ في تحميل الواجبات', e);
      }
      // load users for this department (for department managers)
      try {
        const ures = await fetch(`/api/admin/users?page=1&limit=${usersLimit}`, { cache: 'no-store', credentials: 'include' });
        if (ures.ok) {
          const ubody = await ures.json();
          setUsers(ubody.users || []);
          setUsersTotal(ubody.total ?? null);
          setUsersPage(1);
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

  const handleAddAssignment = async (title: string, question: string, answerType: string, options?: string[], correctAnswer?: string, dueDate?: string, subjectId?: string) => {
    if (!user?.departmentId) return;
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, question, answerType, options, correctAnswer, dueDate, departmentId: user.departmentId, subjectId }),
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
  const handleAddUser = async (userId: string, name: string, role: string, password: string, departmentId?: string): Promise<boolean> => {
    if (user?.role !== 'admin' && user?.role !== 'department_manager') {
      showToast('لا تملك صلاحية إضافة مستخدم', 'error');
      return false;
    }
    const idTrim = (userId || '').trim();
    if (!idTrim) {
      showToast('أدخل معرف مستخدم صالح', 'error');
      return false;
    }
    if (users.some(u => (u.id || '').toString() === idTrim)) {
      showToast('هذا المستخدم موجود بالفعل', 'error');
      return false;
    }
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, name, role, password, departmentId: departmentId || null }),
      });
      if (res.ok) {
        if (user?.role === 'admin') {
          await loadData();
        } else if (user?.role === 'department_manager') {
          await loadDepartmentData(user.departmentId);
        }
        showToast('تمت إضافة المستخدم بنجاح', 'success');
        return true;
      } else {
        const text = await res.text().catch(() => '');
        showToast(text ? `فشل إضافة المستخدم: ${text}` : 'فشل إضافة المستخدم', 'error');
        return false;
      }
    } catch (e) {
      console.error(e);
      showToast('حدث خطأ أثناء إضافة المستخدم', 'error');
      return false;
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
    if (user?.role !== 'admin' && user?.role !== 'department_manager') return;
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
        credentials: 'include',
        body: JSON.stringify({ name, description, departmentId, teacherId }),
      });
      if (res.ok) {
        // If current user is tied to a department, refresh that department's data
        if (user?.departmentId) {
          try { await loadDepartmentData(user.departmentId); } catch (e) { await loadData(); }
        } else {
          await loadData();
        }
      }
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
        credentials: 'include',
        body: JSON.stringify({ title, url, description, departmentId: user.departmentId, subjectId }),
      });
      if (res.ok) loadDepartmentData(user.departmentId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddBook = async (title: string, url: string, departmentId: string) => {
    console.log('Adding book:', { title, url, departmentId });
    try {
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, url, departmentId }),
      });
      console.log('Response status:', res.status);
      if (res.ok) {
        const newBook = await res.json();
        setBooks(prev => [...prev, newBook]);
        loadData();
        showToast('تم إضافة الكتاب بنجاح', 'success');
      } else {
        const errorText = await res.text();
        console.log('Error response:', errorText);
        showToast('فشل في إضافة الكتاب', 'error');
      }
    } catch (e) {
      console.error('Error adding book:', e);
      showToast('خطأ في الإضافة', 'error');
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!confirm('هل تريد حذف هذا الكتاب؟')) return;
    try {
      const res = await fetch(`/api/library?id=${bookId}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
        showToast('تم حذف الكتاب', 'success');
      } else {
        showToast('فشل في الحذف', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('خطأ في الحذف', 'error');
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

  // Graduation projects states
  const [graduationProjects, setGraduationProjects] = useState<any[]>([]);
  const [showGradModal, setShowGradModal] = useState(false);
  const [gradFile, setGradFile] = useState<File | null>(null);
  const [uploadingGrad, setUploadingGrad] = useState(false);
  const [gradTitle, setGradTitle] = useState('');
  const [gradDeptId, setGradDeptId] = useState<string | null>(null);
  const [gradSearchTerm, setGradSearchTerm] = useState('');
  const [gradOnlyDept, setGradOnlyDept] = useState(false);

  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);

  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifTarget, setNotifTarget] = useState<'all' | 'departments' | 'doctor' | 'students'>('all');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifView, setNotifView] = useState<'send'|'messages'|'notifications'>('send');
  const [notifMode, setNotifMode] = useState<'message'|'notification'>('message');
  const [notifRecipient, setNotifRecipient] = useState<string>('');
  const [sentMessages, setSentMessages] = useState<any[]>([]);
  const [sentNotifications, setSentNotifications] = useState<any[]>([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [showInlineNotifsForUser, setShowInlineNotifsForUser] = useState<boolean>(false);
  const [showDeptSubjectsModal, setShowDeptSubjectsModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);

  const refreshNotifCounts = async () => {
    try {
      // try server-side notifications first
      let msgs: any[] = [];
      let nots: any[] = [];
      try {
        const respMsgs = await fetch('/api/messages');
        if (respMsgs.ok) {
          const body = await respMsgs.json();
          msgs = body.messages || [];
        }
      } catch (e) {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('app_messages') || '[]' : '[]';
        try { msgs = JSON.parse(raw) || []; } catch { msgs = []; }
      }

      try {
        const resp = await fetch('/api/notifications');
        if (resp.ok) {
          const body = await resp.json();
          nots = body.notifications || [];
        } else {
          const rawNot = typeof window !== 'undefined' ? localStorage.getItem('app_notifications') || '[]' : '[]';
          nots = JSON.parse(rawNot) || [];
        }
      } catch (e) {
        const rawNot = typeof window !== 'undefined' ? localStorage.getItem('app_notifications') || '[]' : '[]';
        try { nots = JSON.parse(rawNot) || []; } catch { nots = []; }
      }

      const readKey = `app_messages_read_${user?.id || ''}`;
      const rawRead = typeof window !== 'undefined' ? localStorage.getItem(readKey) || '[]' : '[]';
      const readIds = JSON.parse(rawRead) || [];
      const unreadMsgs = Array.isArray(msgs) ? msgs.filter((m: any) => !readIds.includes(m.id)).length : 0;
      const unreadNots = Array.isArray(nots) ? nots.filter((n: any) => {
        if (n.to === 'all') return !n.read;
        if (!user) return false;
        if (String(n.to) === String(user?.id)) return !n.read;
        if (user.role === 'admin' && String(n.to) === 'admin') return !n.read;
        return false;
      }).length : 0;
      setUnreadMessagesCount(unreadMsgs);
      setUnreadNotificationsCount(unreadNots);
    } catch (e) {
      setUnreadMessagesCount(0);
      setUnreadNotificationsCount(0);
    }
  };

  const openNotifModal = async (opts?: { openTab?: 'send' | 'messages' | 'notifications'; onlyForCurrentUser?: boolean }) => {
    try {
      let msgs: any[] = [];
      // try server first
      try {
        const resp = await fetch('/api/messages');
        if (resp.ok) {
          const body = await resp.json();
          msgs = body.messages || [];
        } else {
          const raw = typeof window !== 'undefined' ? localStorage.getItem('app_messages') || '[]' : '[]';
          msgs = JSON.parse(raw) || [];
        }
      } catch (e) {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('app_messages') || '[]' : '[]';
        try { msgs = JSON.parse(raw) || []; } catch { msgs = []; }
      }
      let nots: any[] = [];
      try {
        const respNot = await fetch('/api/notifications');
        if (respNot.ok) {
          const body = await respNot.json();
          nots = body.notifications || [];
        } else {
          const rawNot = typeof window !== 'undefined' ? localStorage.getItem('app_notifications') || '[]' : '[]';
          nots = JSON.parse(rawNot) || [];
        }
      } catch (e) {
        const rawNot = typeof window !== 'undefined' ? localStorage.getItem('app_notifications') || '[]' : '[]';
        try { nots = JSON.parse(rawNot) || []; } catch { nots = []; }
      }
      // If opening messages from dashboard, show unread messages only for current user
      try {
        const readKey = `app_messages_read_${user?.id || ''}`;
        const rawRead = typeof window !== 'undefined' ? localStorage.getItem(readKey) || '[]' : '[]';
        const readIds = JSON.parse(rawRead) || [];
        if (opts?.openTab === 'messages') {
          setSentMessages(Array.isArray(msgs) ? msgs.filter((m: any) => !readIds.includes(m.id)) : []);
          // mark them as read for this user
          const idsToMark = Array.isArray(msgs) ? msgs.filter((m: any) => !readIds.includes(m.id)).map((m: any) => m.id) : [];
          const newRead = Array.isArray(readIds) ? Array.from(new Set([...readIds, ...idsToMark])) : idsToMark;
          if (typeof window !== 'undefined') localStorage.setItem(readKey, JSON.stringify(newRead));
        } else {
          setSentMessages(Array.isArray(msgs) ? msgs : []);
        }
      } catch (e) {
        setSentMessages(Array.isArray(msgs) ? msgs : []);
      }

      if (opts?.openTab === 'notifications' && opts?.onlyForCurrentUser) {
        const filtered = Array.isArray(nots) ? nots.filter((n: any) => {
          if (n.to === 'all') return true;
          if (!user) return false;
          if (String(n.to) === String(user?.id)) return true;
          if (user.role === 'admin' && String(n.to) === 'admin') return true;
          return false;
        }) : [];
        // mark those notifications as read locally
        try {
          const allNots = Array.isArray(nots) ? nots : [];
          allNots.forEach((n: any) => {
            const match = (n.to === 'all') || (user && (String(n.to) === String(user.id))) || (user && user.role === 'admin' && String(n.to) === 'admin');
            if (match) n.read = true;
          });
          if (typeof window !== 'undefined') localStorage.setItem('app_notifications', JSON.stringify(allNots));
        } catch (e) {}
        setSentNotifications(filtered);
      } else {
        setSentNotifications(Array.isArray(nots) ? nots : []);
      }
    } catch (e) {
      setSentMessages([]);
      setSentNotifications([]);
    }
    setNotifView(opts?.openTab || 'messages');
    setNotifMode('message');
    setNotifRecipient('');
    // default target: department managers can only send to their department
    if (user?.role === 'department_manager') {
      setNotifTarget('departments');
    } else {
      setNotifTarget('all');
    }
    setShowNotifModal(true);
    // update counts after possible marking
    setTimeout(() => refreshNotifCounts(), 50);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };
  useEffect(() => {
    // refresh counts on mount and when user changes
    refreshNotifCounts();
  }, [user?.id]);
  
  useEffect(() => {
    if (!user) return;
    if (user.role === 'admin' || user.role === 'department_manager') {
      // load graduation projects for admin and department managers (dept managers get only their dept)
      (async () => {
        try {
          const url = user.role === 'department_manager' && user.departmentId ? `/api/graduation_projects?departmentId=${encodeURIComponent(user.departmentId)}` : '/api/graduation_projects';
          const res = await fetch(url);
          if (res.ok) {
            const body = await res.json();
            setGraduationProjects(body.projects || []);
          }
        } catch (e) {
          console.error('فشل جلب مشاريع التخرج', e);
        }
      })();
    }
  }, [user]);

  const loadGraduationProjects = async () => {
    try {
      const res = await fetch('/api/graduation_projects');
      if (res.ok) {
        const body = await res.json();
        setGraduationProjects(body.projects || []);
      }
    } catch (e) {
      console.error('فشل جلب مشاريع التخرج', e);
    }
  };

  const handleUploadGraduationProject = async () => {
    if (!gradFile) return showToast('اختر ملف PDF للرفع', 'error');
    if (gradFile.type !== 'application/pdf') return showToast('الملف يجب أن يكون PDF', 'error');
    if (!gradTitle || !gradTitle.trim()) return showToast('أدخل عنوانًا للمشروع', 'error');
    if (!gradDeptId) return showToast('اختر القسم الذي سينتمي إليه المشروع', 'error');
    setUploadingGrad(true);
    try {
      const fd = new FormData();
      fd.append('file', gradFile, gradFile.name);
      fd.append('title', gradTitle.trim());
      fd.append('departmentId', gradDeptId);
      const res = await fetch('/api/graduation_projects', { method: 'POST', body: fd, credentials: 'include' });
      if (res.ok) {
        const body = await res.json();
        setGraduationProjects(prev => [body.project, ...prev]);
        setGradFile(null);
        setGradTitle('');
        setGradDeptId(null);
        setShowGradModal(false);
        showToast('تم رفع المشروع بنجاح', 'success');
      } else {
        const text = await res.text().catch(() => 'فشل الرفع');
        showToast(text || 'فشل الرفع', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('فشل الرفع', 'error');
    } finally {
      setUploadingGrad(false);
    }
  };
  const [addModalType, setAddModalType] = useState<'subject' | 'video' | 'assignment' | 'student' | 'department' | 'teacher' | 'book' | null>(null);

  const [viewModalType, setViewModalType] = useState<'subjects' | 'videos' | 'assignments' | 'students' | 'departments' | 'teachers' | 'users' | 'deptSubjects' | 'graduation_projects' | 'library' | null>(null);

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

  const openVideo = (video: any, subjectId?: string) => {
    if (user?.role === 'user') {
      setViewModalType('videos');
      setSelectedVideo({ video, subjectId });
    } else {
      setSelectedVideo({ video, subjectId });
    }
  };
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

  const filteredVideosForUser = (() => {
    // videos state is already department-scoped when loaded via loadDepartmentData,
    // so use `videos` as the base list to avoid missing items.
    const base = videos || [];
    const bySearch = userVideoSearch ? base.filter(v => (v.title || '').includes(userVideoSearch) || (v.description || '').includes(userVideoSearch)) : base;
    if (userVideoDateFilter === 'all') return bySearch;
    const now = Date.now();
    const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
    const startTodayTs = startOfToday.getTime();
    const startYesterdayTs = startTodayTs - 24*60*60*1000;
    const weekAgoTs = now - 7*24*60*60*1000;
    return bySearch.filter(v => {
      const vidTs = v.createdAt ? Date.parse(v.createdAt) : (Number(v.id) || 0);
      if (!vidTs) return false;
      if (userVideoDateFilter === 'today') return vidTs >= startTodayTs;
      if (userVideoDateFilter === 'yesterday') return vidTs >= startYesterdayTs && vidTs < startTodayTs;
      if (userVideoDateFilter === 'week') return vidTs >= weekAgoTs;
      return true;
    });
  })();

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
  const filteredStudents = (() => {
    // For department managers, show students of their department
    // and also show the doctor(s) (teachers / department_manager) of the same department.
    if (user?.role === 'department_manager') {
      return users.filter(u => {
        const sameDept = u.departmentId && u.departmentId === user.departmentId;
        const isStudent = u.role === 'user' && sameDept;
        const isDoctor = u.role === 'teacher' && sameDept; // exclude other department_manager users
        return isStudent || isDoctor;
      }).filter(s => 
        (s.id || '').includes(searchTerm) || 
        (s.name || '').includes(searchTerm)
      );
    }

    return students.filter(s => 
      (s.id || '').includes(searchTerm) || 
      (s.name || '').includes(searchTerm)
    );
  })();

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
  }

  function openEditUser(userObj: any) {
    setEditingUser(userObj);
    setEditForm({ name: userObj.name || '', newId: userObj.id || '', password: '' });
  }

  function closeEditUser() {
    setEditingUser(null);
    setEditForm({ name: '', newId: '', password: '' });
  }

  async function handleSaveUser() {
    if (!editingUser) return;
    const payload: any = { id: editingUser.id };
    if ((editForm.newId || '').trim() && editForm.newId !== editingUser.id) payload.newId = (editForm.newId || '').trim();
    if ((editForm.name || '').trim()) payload.name = (editForm.name || '').trim();
    if ((editForm.password || '').trim()) payload.password = (editForm.password || '').trim();

    try {
      const res = await fetch('/api/admin/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!data || !data.ok) {
        setToast({ type: 'error', message: data?.error || 'خطأ أثناء التعديل' });
        return;
      }
      // Update local users state
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...data.user } : u));
      setToast({ type: 'success', message: 'تم حفظ التعديلات' });
      closeEditUser();
    } catch (err) {
      console.error('Failed to save user edit:', err);
      setToast({ type: 'error', message: 'فشل الاتصال بالخادم' });
    }
  }

  async function handleAddStudentToSubject() {
    if (!addStudentSubjectId || !addStudentId) {
      setToast({ type: 'error', message: 'اختر المادة والطالب' });
      return;
    }
    try {
      const deptId = user?.departmentId || '';
      const res = await fetch(`/api/departments/${encodeURIComponent(deptId)}/subjects/${encodeURIComponent(addStudentSubjectId)}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ addStudent: addStudentId }) });
      const data = await res.json();
      if (!data || !data.ok) {
        setToast({ type: 'error', message: data?.error || 'فشل إضافة الطالب' });
        return;
      }
      setSubjects(prev => prev.map(s => s.id === data.subject.id ? data.subject : s));
      setToast({ type: 'success', message: 'تمت إضافة الطالب للمادة' });
      setShowAddStudentModal(false);
      setAddStudentSubjectId(null);
      setAddStudentId(null);
    } catch (e) {
      console.error('add student error', e);
      setToast({ type: 'error', message: 'فشل الاتصال بالخادم' });
    }
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
    <div className={`${styles.container} ${user?.role === 'user' ? styles.hasUserSidebar : ''}`}>
      {user?.role === 'user' && (
        <div className={styles.userHeader}>
          <div className={styles.userInfo}>
            <img src="/home/img/users.png" alt="logo" className={styles.userAvatar} />
            <div className={styles.userText}>
              <div className={styles.userName}>{user?.name || user?.id}</div>
              <div className={styles.userDept}>القسم: {departments.find(d => String(d.id) === String(user?.departmentId))?.name || 'غير محدد'}</div>
            </div>
          </div>
          <div className={styles.userActions}>
            <button className={styles.actionBtn} onClick={() => { setShowInlineNotifsForUser(false); setViewModalType(null); setSelectedVideo(null); setActiveTab('departments'); }}>الريسي</button>
            <button className={styles.actionBtn} onClick={() => { setShowInlineNotifsForUser(false); setViewModalType('videos'); }}>الدروس</button>
            <button className={styles.actionBtn} onClick={() => { setShowInlineNotifsForUser(false); setViewModalType('assignments'); }}>الواجبات</button>
            <button className={styles.actionBtn} onClick={async () => { setShowInlineNotifsForUser(true); await openNotifModal({ openTab: 'notifications', onlyForCurrentUser: true }); setShowNotifModal(false); setViewModalType(null); }}>التنبيهات</button>
            <button className={styles.actionBtn} onClick={() => { setShowInlineNotifsForUser(false); setViewModalType('subjects'); }}> المواد</button>
            <button className={styles.actionBtn} onClick={() => { setShowInlineNotifsForUser(false); setViewModalType('graduation_projects'); }}>ملفات مشاريع </button>
            <button className={styles.actionBtn} onClick={() => { setShowInlineNotifsForUser(false); setViewModalType('library'); }}>المكتبة</button>

          </div>
        </div>
      )}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          background: toast.type === 'success' ? '#4caf50' : toast.type === 'info' ? '#2196f3' : '#f44336',
          color: 'white',
          padding: '10px 16px',
          borderRadius: 6,
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
        }}>{toast.message}</div>
      )}

      {showAddStudentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 }}>
          <div style={{ background: 'white', padding: 18, borderRadius: 8, width: 520, maxWidth: '95%', direction: 'rtl' }}>
            <button onClick={() => { setShowAddStudentModal(false); setAddStudentSubjectId(null); setAddStudentId(null); }} style={{ position: 'absolute', left: 12, top: 12, fontSize: 20, border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
            <h3 style={{ marginTop: 0 }}>إضافة طالب للمادة</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label>اختر المادة (أنت مدرسها)</label>
              <select value={addStudentSubjectId || ''} onChange={(e) => setAddStudentSubjectId(e.target.value || null)} style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}>
                <option value="">-- اختر المادة --</option>
                {subjects.filter(s => s.teacherId === user?.id).map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <label>اختر الطالب</label>
              <select value={addStudentId || ''} onChange={(e) => setAddStudentId(e.target.value || null)} style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}>
                <option value="">-- اختر الطالب --</option>
                {users.filter(u => u.role === 'user' && String(u.departmentId) === String(user?.departmentId)).map((st: any) => (
                  <option key={st.id} value={st.id}>{st.name || st.id}</option>
                ))}
              </select>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
                <button onClick={() => { setShowAddStudentModal(false); setAddStudentSubjectId(null); setAddStudentId(null); }} style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc', background: '#fff' }}>إلغاء</button>
                <button onClick={handleAddStudentToSubject} style={{ padding: '8px 12px', borderRadius: 4, border: 'none', background: '#1976d2', color: '#fff' }}>إضافة</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {editingUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 }}>
          <div style={{ background: 'white', padding: 20, borderRadius: 8, width: 460, maxWidth: '95%' }}>
            <h3 style={{ marginTop: 0 }}>تعديل المستخدم</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label>الاسم</label>
              <input value={editForm.name} onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: 4 }} />
              <label>اسم المستخدم</label>
              <input value={editForm.newId} onChange={(e) => setEditForm(prev => ({ ...prev, newId: e.target.value }))} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: 4 }} />
              <label>الرمز (كلمة المرور)</label>
              <input type="password" value={editForm.password} onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))} placeholder="اتركه فارغًا إن لم يتغير" style={{ padding: '8px', border: '1px solid #ccc', borderRadius: 4 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
              <button onClick={closeEditUser} style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc', background: '#fff' }}>إلغاء</button>
              <button onClick={handleSaveUser} style={{ padding: '8px 12px', borderRadius: 4, border: 'none', background: '#1976d2', color: '#fff' }}>حفظ</button>
            </div>
          </div>
        </div>
      )}
      <nav className={styles.navbar}>
        <div className={styles.navContent}>
          <img src="../src/sh.png" alt="الشعار" className={styles.logo} />
          <div className={styles.userMenu}>
            <span>{ user?.id}</span>
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
                

                <div className={styles.cardGrid}>
                  <div className={styles.cardItem} onClick={() => setActiveTab('departments')}>
                    <div className={styles.cardItemContent}>
                      <img src="../src/svg/book.svg" alt="" />
                      <h4>إدارة الأقسام</h4>
                    </div>
                    <div className={styles.cardItemActions}>
                      <p onClick={(e) => {e.stopPropagation(); setAddModalType('department')}}>إضافة قسم جديد</p>
                      <p onClick={(e) => {e.stopPropagation(); setViewModalType('departments')}}>عرض الأقسام ({filteredDepartments.length})</p>
                    </div>
                  </div>
                  {user.role === 'admin' && (
                    <div className={styles.cardItem}>
                      <div className={styles.cardItemContent}>
                        <img src="../src/svg/student.svg" alt="" />
                        <h4>إدارة المستخدمين</h4>
                      </div>
                      <div className={styles.cardItemActions}>
                        <p onClick={(e) => {e.stopPropagation(); setAddModalType('student')}}>إضافة مستخدم جديد</p>
                        <p onClick={async (e) => {e.stopPropagation(); await loadData(); setViewModalType('users')}}>عرض مستخدمين ({filteredUsers.length})</p>
                      </div>
                    </div>
                  )}
                  
                  {((user.role === 'department_manager') || (user.role === 'teacher')) && (
                    <div className={styles.cardItem} onClick={() => setActiveTab('subjects')}>
                      <div className={styles.cardItemContent}>
                        <img src="../src/svg/book.svg" alt="" />
                        <h4>إدارة المواد</h4>
                      </div>
                      <div className={styles.cardItemActions}>
                        <p onClick={(e) => {e.stopPropagation(); setAddModalType('subject')}}>إضافة مادة</p>
                        <p onClick={(e) => {e.stopPropagation(); setViewModalType('subjects')}}>عرض المواد ({filteredSubjects.length})</p>
                      </div>
                    </div>
                  )}
                  {user.role === 'department_manager' && (
                    <div className={styles.cardItem} onClick={() => setActiveTab('videos')}>
                      <div className={styles.cardItemContent}>
                        <img src="../src/svg/video.svg" alt="" />
                        <h4>إدارة الفيديوهات</h4>
                      </div>
                      <div className={styles.cardItemActions}>
                        <p onClick={(e) => { e.stopPropagation(); (async () => { if (user?.departmentId) await loadDepartmentData(user.departmentId); setAddModalType('video'); })(); }}>إضافة درس</p>
                        <p onClick={(e) => {e.stopPropagation(); setViewModalType('videos')}}>عرض الدروس ({filteredVideos.length})</p>
                      </div>
                    </div>
                  )}

                  {/* Notifications card */}
                  <div className={styles.cardItem}>
                    <div className={styles.cardItemContent}>
                      <img src="../src/svg/notification.svg" alt="" />
                      <h4>التنبيهات</h4>
                    </div>
                    <div className={styles.cardItemActions}>
                      <p onClick={() => openNotifModal({ openTab: 'messages' })}>الرسايل {unreadMessagesCount > 0 ? `(${unreadMessagesCount})` : ''}</p>
                      <p onClick={() => openNotifModal({ openTab: 'notifications', onlyForCurrentUser: true })}>التنبيهات {unreadNotificationsCount > 0 ? `(${unreadNotificationsCount})` : ''}</p>
                    </div>
                  </div>

                  {/* Graduation projects card (admin) */}
                  {user.role === 'admin' && (
                    <div className={styles.cardItem}>
                      <div className={styles.cardItemContent}>
                        <img src="../src/svg/file.svg" alt="" />
                        <h4>مشاريع التخرج</h4>
                      </div>
                      <div className={styles.cardItemActions}>
                        <p onClick={(e) => { e.stopPropagation(); setShowGradModal(true); }}>رفع مشروع جديد</p>
                        <p onClick={(e) => { e.stopPropagation(); setViewModalType('graduation_projects'); }}>عرض مشاريع سابق ({graduationProjects.length})</p>
                      </div>
                    </div>
                  )}

                  {/* Department courses management card removed as requested */}

                  {/* Library card */}
                  <div className={styles.cardItem}>
                    <div className={styles.cardItemContent}>
                      <img src="../src/svg/book.svg" alt="" />
                      <h4>المكتبة</h4>
                    </div>
                    <div className={styles.cardItemActions}>
                      <p onClick={(e) => { e.stopPropagation(); setAddModalType('book'); }}>إضافة رابط الكتاب</p>
                      <p onClick={(e) => { e.stopPropagation(); setViewModalType('library'); }}>عرض المكتبة ({books.length})</p>
                    </div>
                  </div>

                </div>

                {/* لوحة عرض الأقسام أزيلت حسب الطلب (لا تظهر هنا). */}

                {activeTab === 'users' && user.role === 'admin' && (
                  <div>
                    <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #000', borderRadius: '8px' }}>
                      <h4>إضافة مستخدم جديد</h4>
                      <AddUserForm
                        departments={departments}
                        onAdd={handleAddUser}
                        showToast={showToast}
                        allowedRoles={['user', 'department_manager', 'teacher', 'admin']}
                      />
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
                        طالب ({users.filter(u => u.role === 'user').length})
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
                              {u.departmentId && <p className={styles.cardDesc}>القسم: {dept ? dept.name : 'غير محدد'}</p>}
                              <p className={styles.cardDesc}>
                                الدور: {u.role === 'admin' ? 'مسؤول النظام' : u.role === 'department_manager' ? 'مدير القسم' : u.role === 'teacher' ? 'دكتور' : 'طالب'}
                              </p>
                              <div className={styles.cardActions}>
                                <button onClick={() => openEditUser(u)} className={styles.editBtn} style={{ marginRight: 8, padding: '6px 10px', background: '#1976d2', color: 'white', border: 'none', borderRadius: 4 }}>تعديل</button>
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
                                        if (teacherSubjects.length === 0) return showToast('لا توجد مواد مرتبطة بهذا مدير القسم', 'error');
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
                                            showToast && showToast('تم إضافة الطالب بنجاح', 'success');
                                            loadData();
                                          } else {
                                            const txt = await res.text();
                                            showToast && showToast('فشل الإضافة: ' + txt, 'error');
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
                            <h4 style={{ margin: '0 0 6px 0' }}>{subject.name}</h4>
                            <p style={{ color: '#333', fontSize: '13px', margin: '0 0 6px 0', fontWeight: 500 }}>الدكتور: {(() => { const _t = teachers.find(t => String(t.id) === String(subject.teacherId)); return _t ? (_t.name || _t.id) : (subject.teacherId || 'غير محدد'); })()}</p>
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
                        <AddSubjectForm departments={departments} teachers={teachers} onAdd={(name, desc, deptId, teacherId) => handleAddSubject(name, desc, user.departmentId || deptId, user.role === 'teacher' ? user.id : teacherId)} user={user} />
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
                  <h2>{user.role === 'department_manager' ? 'بوابة مدير القسم' : user.role === 'teacher' ? 'بوابة الدكتور' : 'بوابة الطالب'}</h2>
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
                    <div className={styles.cardGrid}>
                      {/* المواد */}
                      <div className={styles.cardItem}>
                        <div className={styles.cardItemContent}>
                          <img src="../src/svg/book.svg" alt="كتاب" />
                          <h4>المواد</h4>
                        </div>
                        <div className={styles.cardItemActions}>
                          <p onClick={() => setAddModalType('subject')}>إضافة مادة</p>
                          <p onClick={() => setViewModalType('subjects')}>عرض المواد ({filteredSubjects.length})</p>
                        </div>
                      </div>

                      {/* الدروس محذوفة لمستخدم مدير القسم */}

                      {/* مشاريع التخرج (لمدير القسم) */}
                      <div className={styles.cardItem}>
                        <div className={styles.cardItemContent}>
                          <img src="../src/svg/file.svg" alt="مشاريع" />
                          <h4>مشاريع التخرج</h4>
                        </div>
                        <div className={styles.cardItemActions}>
                          <p onClick={(e) => { e.stopPropagation(); setShowGradModal(true); }}>رفع مشروع جديد</p>
                          <p onClick={(e) => { e.stopPropagation(); setGradOnlyDept(true); setViewModalType('graduation_projects'); }}>عرض مشاريع القسم ({graduationProjects.filter(p => p.departmentId === user.departmentId).length})</p>
                        </div>
                      </div>

                      {/* إدارة المستخدمين محذوفة لمدير القسم */}

                      {/* Notifications card for department_manager */}
                      <div className={styles.cardItem}>
                        <div className={styles.cardItemContent}>
                          <img src="../src/svg/notification.svg" alt="التنبيهات" />
                          <h4>التنبيهات</h4>
                        </div>
                        <div className={styles.cardItemActions}>
                          <p onClick={(e) => { e.stopPropagation(); openNotifModal({ openTab: 'messages' }); }}>الرسايل {unreadMessagesCount > 0 ? `(${unreadMessagesCount})` : ''}</p>
                          <p onClick={(e) => { e.stopPropagation(); openNotifModal({ openTab: 'notifications', onlyForCurrentUser: true }); }}>التنبيهات {unreadNotificationsCount > 0 ? `(${unreadNotificationsCount})` : ''}</p>
                        </div>
                      </div>

                      {/* الواجبات محذوفة لمستخدم مدير القسم */}

                      {/* إدارة المستخدمين */}
                      <div className={styles.cardItem}>
                        <div className={styles.cardItemContent}>
                          <img src="../src/svg/student.svg" alt="المستخدمين" />
                          <h4>إدارة المستخدمين</h4>
                        </div>
                        <div className={styles.cardItemActions}>
                          <p onClick={(e) => { e.stopPropagation(); setAddModalType('student'); }}>إضافة مستخدم</p>
                          <p onClick={async (e) => { e.stopPropagation(); if (user?.departmentId) await loadDepartmentData(user.departmentId); setViewModalType('students'); }}>عرض المستخدمين ({users.filter(u => String(u.departmentId) === String(user.departmentId)).length})</p>
                        </div>
                      </div>
                    </div>

                  </>
                ) : (
                  user.role === 'teacher' ? (
                    <>
                      <h3>إدارة المقرر</h3>
                      <div className={styles.cardGrid}>
                        <div className={styles.cardItem}>
                          <div className={styles.cardItemContent}>
                            <img src="../src/svg/video.svg" alt="الدروس" />
                            <h4>ادارة الدروس</h4>
                          </div>
                          <div className={styles.cardItemActions}>
                            <p onClick={(e) => { e.stopPropagation(); setViewModalType('videos'); }}>عرض الدروس ({videos.filter(v => subjects.find(s=>s.id===v.subjectId && s.teacherId === user.id)).length})</p>
                            <p onClick={(e) => { e.stopPropagation(); (async () => { if (user?.departmentId) await loadDepartmentData(user.departmentId); setAddModalType('video'); })(); }}>إضافة درس</p>
                          </div>
                        </div>

                        <div className={styles.cardItem}>
                          <div className={styles.cardItemContent}>
                            <img src="../src/svg/assignment.svg" alt="الواجبات" />
                            <h4>ادارة الواجبات</h4>
                          </div>
                          <div className={styles.cardItemActions}>
                            <p onClick={(e) => { e.stopPropagation(); setViewModalType('assignments'); }}>عرض الواجبات ({assignments.filter(a => a.teacherId === user.id || subjects.find(s=>s.id===a.subjectId && s.teacherId===user.id)).length})</p>
                            <p onClick={(e) => { e.stopPropagation(); setAddModalType('assignment'); }}>إضافة واجب</p>
                          </div>
                        </div>

                        <div className={styles.cardItem}>
                          <div className={styles.cardItemContent}>
                            <img src="../src/svg/notification.svg" alt="التنبيهات" />
                            <h4>التنبيهات</h4>
                          </div>
                          <div className={styles.cardItemActions}>
                            <p onClick={(e) => { e.stopPropagation(); openNotifModal({ openTab: 'messages' }); }}>الرسائل {unreadMessagesCount > 0 ? `(${unreadMessagesCount})` : ''}</p>
                            <p onClick={(e) => { e.stopPropagation(); openNotifModal({ openTab: 'notifications', onlyForCurrentUser: true }); }}>التنبيهات {unreadNotificationsCount > 0 ? `(${unreadNotificationsCount})` : ''}</p>
                          </div>
                        </div>

                        <div className={styles.cardItem}>
                          <div className={styles.cardItemContent}>
                            <img src="../src/svg/student.svg" alt="اضافة طلاب" />
                            <h4>اضافة طلاب للمادة</h4>
                          </div>
                          <div className={styles.cardItemActions}>
                            <p onClick={(e) => { e.stopPropagation(); (async () => { if (user?.departmentId) await loadDepartmentData(user.departmentId); setShowAddStudentModal(true); })(); }}>اضافة طالب</p>
                            <p onClick={(e) => { e.stopPropagation(); setViewModalType('subjects'); }}>عرض المواد التي تدرسها ({subjects.filter(s => s.teacherId === user.id).length})</p>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : showInlineNotifsForUser ? (
                    <div style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h2>التنبيهات</h2>
                        <div>
                          <button onClick={() => setShowInlineNotifsForUser(false)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc', background: '#fff' }}>إغلاق</button>
                        </div>
                      </div>
                      <div>
                        {(!sentNotifications || sentNotifications.length === 0) ? (
                          <p>لا توجد تنبيهات</p>
                        ) : (
                          <div style={{ display: 'grid', gap: 10 }}>
                            {sentNotifications.map((n: any) => (
                              <div key={n.id || n._id || `${n.to}-${n.message || n.text || ''}`} style={{ border: '1px solid #000', padding: 10, borderRadius: 8 }}>
                                <div style={{ fontSize: 13 }}>{n.message || n.text || n.body || n.title || ''}</div>
                                <div style={{ marginTop: 6, fontSize: 11, color: '#666' }}>إلى: {String(n.to)}</div>
                                {n.date && <div style={{ fontSize: 11, color: '#666' }}>التاريخ: {new Date(n.date).toLocaleString()}</div>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    viewModalType === 'subjects' && user.role === 'user' ? (
                      <div style={{ padding: '20px' }}>
                        <div style={{ textAlign: 'center', marginBottom: 12 }}>
                          <h2>المواد الدراسية</h2>
                        </div>
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
                                  <h5 style={{ margin: '0 0 6px 0' }}>{subject.name}</h5>
                                  <p style={{ color: '#333', fontSize: '13px', margin: '0 0 6px 0', fontWeight: 500 }}>الدكتور: {(() => { const _t = teachers.find(t => String(t.id) === String(subject.teacherId)); return _t ? (_t.name || _t.id) : (subject.teacherId || 'غير محدد'); })()}</p>
                                  <p style={{ color: '#666', fontSize: '12px', margin: '0 0 8px 0' }}>{subject.description}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : viewModalType === 'assignments' && user.role === 'user' ? (
                      <div style={{ padding: '20px' }}>
                        <div style={{ textAlign: 'center', marginBottom: 12 }}>
                          <h2>الواجبات</h2>
                        </div>
                        <div>
                          {assignments && assignments.length > 0 ? (
                            <div style={{ display: 'grid', gap: 10 }}>
                              {assignments.filter(a => String(a.departmentId) === String(user.departmentId)).map(a => (
                                <div key={a.id} style={{ border: '1px solid #000', padding: 10, borderRadius: 8 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                      <div style={{ fontSize: 12, color: '#666' }}>{a.subjectId ? `المادة: ${subjects.find(s => String(s.id) === String(a.subjectId))?.name || a.subjectId}` : ''}</div>
                                      <strong style={{ fontSize: 14 }}>{a.title}</strong>

                                    </div>
                                    <span style={{ fontSize: 11, color: '#666' }}>{a.dueDate ? `المهلة: ${new Date(a.dueDate).toLocaleDateString()}` : ''}</span>
                                  </div>
                                  <p style={{ marginTop: 8 }}>{a.question || a.description}</p>
                                  <div style={{ marginTop: 8 }}>
                                    {a.answerType === 'choice' ? (
                                      <ChoiceAnswer a={a} onComplete={async (ans: string) => {
                                        await handleCompleteAssignment(a.id, ans);
                                        setAssignments(prev => prev.map(p => p.id === a.id ? { ...p, completions: [...(p.completions || []), { userId: user?.id || 'unknown', userName: user?.name || user?.id || 'مستخدم', answer: ans, date: new Date().toISOString() }] } : p));
                                        return true;
                                      }} />
                                    ) : a.answerType === 'tf' ? (
                                      <TFAnswer a={a} onComplete={async (ans: string) => {
                                        await handleCompleteAssignment(a.id, ans);
                                        setAssignments(prev => prev.map(p => p.id === a.id ? { ...p, completions: [...(p.completions || []), { userId: user?.id || 'unknown', userName: user?.name || user?.id || 'مستخدم', answer: ans, date: new Date().toISOString() }] } : p));
                                        return true;
                                      }} />
                                    ) : (
                                      <EssayAnswer a={a} onComplete={async (ans: string) => {
                                        await handleCompleteAssignment(a.id, ans);
                                        setAssignments(prev => prev.map(p => p.id === a.id ? { ...p, completions: [...(p.completions || []), { userId: user?.id || 'unknown', userName: user?.name || user?.id || 'مستخدم', answer: ans, date: new Date().toISOString() }] } : p));
                                        return true;
                                      }} />
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p>لا توجد واجبات</p>
                          )}
                        </div>
                      </div>
                    ) : viewModalType === 'videos' && user.role === 'user' ? (
                      <div style={{ padding: '20px' }}>
                        <div style={{ textAlign: 'center', marginBottom: 12 }}>
                          <h2>مرحباً بك في منصة الكلية</h2>
                        </div>
                        <div>
                          {selectedVideo && (
                            <div style={{ marginBottom: 12, border: '1px solid #e0e0e0', padding: 12, borderRadius: 8 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                <h3 style={{ margin: 0 }}>{selectedVideo.video.title}</h3>
                                <div>
                                  <button onClick={() => setSelectedVideo(null)} style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc', background: '#fff' }}>إغلاق</button>
                                </div>
                              </div>
                              <div style={{ marginTop: 8 }}>
                                {getYoutubeEmbedUrl(selectedVideo.video.url) ? (
                                  <iframe src={getYoutubeEmbedUrl(selectedVideo.video.url) || ''} width="100%" height={360} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                                ) : (
                                  <a href={selectedVideo.video.url} target="_blank" rel="noreferrer">افتح الفيديو في نافذة جديدة</a>
                                )}
                              </div>
                              <p style={{ marginTop: 8 }}>{selectedVideo.video.description}</p>
                            </div>
                          )}
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                              <input placeholder="ابحث في الدروس..." value={userVideoSearch} onChange={(e) => setUserVideoSearch(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: 6, border: '1px solid #ccc' }} />
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => setUserVideoDateFilter('all')} style={{ padding: '6px 10px', borderRadius: 6, border: userVideoDateFilter === 'all' ? '2px solid #1565c0' : '1px solid #ccc', background: userVideoDateFilter === 'all' ? '#e3f2fd' : '#fff' }}>الكل</button>
                                <button onClick={() => setUserVideoDateFilter('today')} style={{ padding: '6px 10px', borderRadius: 6, border: userVideoDateFilter === 'today' ? '2px solid #1565c0' : '1px solid #ccc', background: userVideoDateFilter === 'today' ? '#e3f2fd' : '#fff' }}>اليوم</button>
                                <button onClick={() => setUserVideoDateFilter('yesterday')} style={{ padding: '6px 10px', borderRadius: 6, border: userVideoDateFilter === 'yesterday' ? '2px solid #1565c0' : '1px solid #ccc', background: userVideoDateFilter === 'yesterday' ? '#e3f2fd' : '#fff' }}>امس</button>
                                <button onClick={() => setUserVideoDateFilter('week')} style={{ padding: '6px 10px', borderRadius: 6, border: userVideoDateFilter === 'week' ? '2px solid #1565c0' : '1px solid #ccc', background: userVideoDateFilter === 'week' ? '#e3f2fd' : '#fff' }}>اسبوع</button>
                              </div>
                            </div>

                            {filteredVideosForUser.length === 0 ? (
                              <p>لا توجد دروس</p>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                                {filteredVideosForUser.map(video => (
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
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : viewModalType === 'graduation_projects' && user.role === 'user' ? (
                      <div style={{ padding: '20px' }}>
                        <div style={{ textAlign: 'center', marginBottom: 12 }}>
                          <h2>مشاريع التخرج</h2>
                        </div>
                        <div>
                          {(() => {
                            const list = graduationProjects.filter((p: any) => String(p.departmentId) === String(user?.departmentId));
                            if (list.length === 0) return <p>لا توجد مشاريع تخرج في قسمك</p>;
                            return (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                                {list.map((p: any) => (
                                  <div key={p.id} style={{
                                    border: '1px solid #000',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                  }}>
                                    <h5 style={{ margin: '0 0 8px 0' }}>{p.name}</h5>
                                    <p style={{ fontSize: 12, color: '#666', margin: '0 0 6px 0' }}>تم الرفع: {p.uploadedAt ? new Date(p.uploadedAt).toLocaleString() : ''}</p>
                                    <p style={{ fontSize: 12, color: '#666', margin: '0 0 8px 0' }}>القسم: {departments.find((d: any) => d.id === p.departmentId)?.name || 'عام'}</p>
                                    <a href={p.url} target="_blank" rel="noreferrer" style={{ padding: '6px 10px', background: '#1976d2', color: 'white', borderRadius: 4, textDecoration: 'none' }}>تحميل / عرض</a>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    ) : viewModalType === 'library' && user.role === 'user' ? (
                      <div style={{ padding: '20px' }}>
                        <div style={{ textAlign: 'center', marginBottom: 12 }}>
                          <h2>المكتبة</h2>
                        </div>
                        <div>
                          {(() => {
                            console.log('books:', books);
                            console.log('user departmentId:', user?.departmentId);
                            const filteredBooks = books.filter((b: any) => String(b.departmentId) === String(user?.departmentId));
                            console.log('filtered books:', filteredBooks);
                            if (filteredBooks.length === 0) return <p>لا توجد كتب في قسمك</p>;
                            return (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                                {filteredBooks.map((book: any) => (
                                  <div key={book.id} style={{
                                    border: '1px solid #000',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                  }}>
                                    <h5 style={{ margin: '0 0 8px 0' }}>{book.title}</h5>
                                    <a href={book.url} target="_blank" rel="noreferrer" style={{ padding: '6px 10px', background: '#1976d2', color: 'white', borderRadius: 4, textDecoration: 'none' }}>عرض / تحميل</a>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
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
                    )
                  )
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {selectedVideo && viewModalType !== 'videos' && (
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
              {addModalType === 'subject' ? 'إضافة مادة جديدة' : addModalType === 'video' ? 'إضافة درس جديد' : addModalType === 'assignment' ? 'إضافة واجب جديد' : addModalType === 'department' ? 'إضافة قسم جديد' : addModalType === 'book' ? 'إضافة رابط كتاب' : 'إضافة طالب جديد'}
            </h2>

            {addModalType === 'subject' && (
              <AddSubjectForm departments={departments} teachers={teachers} onAdd={(name, desc, deptId, teacherId) => { handleAddSubject(name, desc, user.departmentId || deptId, teacherId); setAddModalType(null); }} user={user} />
            )}

            {addModalType === 'video' && (
              <AddVideoForm subjects={subjects} onAdd={(title, url, desc, subjectId) => { handleAddVideo(title, url, desc, subjectId); setAddModalType(null); }} />
            )}

            {addModalType === 'assignment' && (
              <AddAssignmentForm subjects={subjects} onAdd={(title, question, answerType, options, correctAnswer, dueDate, subjectId) => { handleAddAssignment(title, question, answerType, options, correctAnswer, dueDate, subjectId); setAddModalType(null); }} />
            )}

            {addModalType === 'department' && (
              <AddDepartmentForm onAdd={(name, description) => { handleAddDept(name, description); setAddModalType(null); }} />
            )}

            {addModalType === 'book' && (
              <div>
                <h3>إضافة رابط كتاب</h3>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target as HTMLFormElement);
                  const title = formData.get('title') as string;
                  const url = formData.get('url') as string;
                  const departmentId = formData.get('departmentId') as string;
                  if (title && url && departmentId) {
                    handleAddBook(title, url, departmentId);
                    setAddModalType(null);
                  }
                }}>
                  <div style={{ marginBottom: '10px' }}>
                    <label>عنوان الكتاب</label>
                    <input name="title" type="text" required style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label>الرابط</label>
                    <input name="url" type="url" required style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label>القسم</label>
                    <select name="departmentId" required style={{ width: '100%', padding: '8px', marginTop: '5px' }}>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>إضافة</button>
                </form>
              </div>
            )}

            {addModalType === 'student' && (
              <AddUserForm
                departments={departments}
                onAdd={async (userId, name, role, password, departmentId) => {
                  const ok = await handleAddUser(userId, name, role, password, departmentId || user.departmentId);
                  if (ok) setAddModalType(null);
                  return ok;
                }}
                showToast={showToast}
                allowedRoles={user?.role === 'admin' ? ['user', 'department_manager', 'teacher', 'admin'] : user?.role === 'department_manager' ? ['user', 'teacher'] : ['user']}
                defaultDepartmentId={user?.departmentId}
              />
            )}

          </div>
        </div>
      )}

      {showNotifModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ background: 'white', padding: '20px', maxWidth: '600px', width: '90%', borderRadius: 8, position: 'relative', direction: 'rtl' }}>
            <button onClick={() => setShowNotifModal(false)} style={{ position: 'absolute', left: 8, top: 8, fontSize: 20, border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>إرسال تنبيه</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button onClick={() => setNotifView('send')} style={{ padding: '8px 12px', background: notifView === 'send' ? '#1976d2' : '#e0e0e0', color: notifView === 'send' ? 'white' : 'black', border: 'none', borderRadius: 6, cursor: 'pointer' }}>إرسال</button>
              <button onClick={async () => { try { const res = await fetch('/api/messages'); if (res.ok) { const body = await res.json(); setSentMessages(body.messages || []); } else { const raw = typeof window !== 'undefined' ? localStorage.getItem('app_messages') || '[]' : '[]'; setSentMessages(Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : []); } } catch (e) { try { const raw = typeof window !== 'undefined' ? localStorage.getItem('app_messages') || '[]' : '[]'; setSentMessages(Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : []); } catch { setSentMessages([]); } } setNotifView('messages'); }} style={{ padding: '8px 12px', background: notifView === 'messages' ? '#1976d2' : '#e0e0e0', color: notifView === 'messages' ? 'white' : 'black', border: 'none', borderRadius: 6, cursor: 'pointer' }}>الرسائل المرسلة</button>
            </div>

            {notifView === 'send' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label>نوع الإرسال</label>
                <select value={notifMode} onChange={(e) => setNotifMode(e.target.value as any)} className={styles.searchInput}>
                  <option value="message">رسالة (بث)</option>
                  <option value="notification">تنبيه (خاص لمستخدم)</option>
                </select>

                {notifMode === 'message' ? (
                  <>
                    <label>اختر المستلمين</label>
                    {user?.role === 'department_manager' ? (
                      <select value={notifTarget} onChange={(e) => setNotifTarget(e.target.value as any)} className={styles.searchInput}>
                        <option value="departments">أقسام (قسمك فقط)</option>
                      </select>
                    ) : (
                      <select value={notifTarget} onChange={(e) => setNotifTarget(e.target.value as any)} className={styles.searchInput}>
                        <option value="all">الكل</option>
                        <option value="departments">أقسام</option>
                        <option value="doctor">دكتور</option>
                        <option value="students">طلاب</option>
                      </select>
                    )}
                  </>
                ) : (
                  <>
                    <label>اختر المستخدم (التنبيه خاص)</label>
                    <select value={notifRecipient} onChange={(e) => setNotifRecipient(e.target.value)} className={styles.searchInput}>
                      <option value="">اختر المستخدم</option>
                      {users.filter(u => u.id !== user?.id).map(u => (
                        <option key={u.id} value={u.id}>{u.name || u.id} — {u.role}</option>
                      ))}
                    </select>
                  </>
                )}

                <label>نص الرسالة</label>
                <textarea value={notifMessage} onChange={(e) => setNotifMessage(e.target.value)} className={`${styles.searchInput}`} rows={5} />

                <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-start' }}>
                  <button
                    onClick={async () => {
                      if (!notifMessage.trim()) { showToast('اكتب نص الرسالة', 'error'); return; }
                      try {
                        if (notifMode === 'notification') {
                          if (!notifRecipient) { showToast('اختر مستخدم للتنبيه', 'error'); return; }
                          const notif = {
                            id: Date.now().toString(),
                            to: notifRecipient,
                            from: user?.id || 'system',
                            fromName: user?.name || user?.id || 'مستخدم',
                            message: notifMessage.trim(),
                            date: new Date().toISOString(),
                          };
                          try {
                            const res = await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(notif) });
                            if (res.ok) {
                              const body = await res.json();
                              const saved = body.notification || body;
                              setSentNotifications(prev => [saved, ...prev]);
                            } else {
                              // fallback to localStorage
                              const raw = typeof window !== 'undefined' ? localStorage.getItem('app_notifications') || '[]' : '[]';
                              const arr = JSON.parse(raw);
                              if (!Array.isArray(arr)) arr.length = 0;
                              arr.unshift(notif);
                              localStorage.setItem('app_notifications', JSON.stringify(arr));
                              setSentNotifications(prev => [notif, ...prev]);
                            }
                          } catch (e) {
                            const raw = typeof window !== 'undefined' ? localStorage.getItem('app_notifications') || '[]' : '[]';
                            const arr = JSON.parse(raw);
                            if (!Array.isArray(arr)) arr.length = 0;
                            arr.unshift(notif);
                            localStorage.setItem('app_notifications', JSON.stringify(arr));
                            setSentNotifications(prev => [notif, ...prev]);
                          }
                        } else {
                          const toField = (notifTarget === 'departments' && user?.role === 'department_manager') ? (user.departmentId || 'departments') : notifTarget;
                          const msg = {
                            id: Date.now().toString(),
                            to: toField,
                            from: user?.id || 'system',
                            fromName: user?.name || user?.id || 'مستخدم',
                            message: notifMessage.trim(),
                            date: new Date().toISOString(),
                          };
                          try {
                            const res = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(msg) });
                            if (res.ok) {
                              const body = await res.json();
                              const saved = body.message || body;
                              setSentMessages(prev => [saved, ...prev]);
                            } else {
                              // fallback to localStorage
                              const raw = typeof window !== 'undefined' ? localStorage.getItem('app_messages') || '[]' : '[]';
                              const arr = JSON.parse(raw);
                              if (!Array.isArray(arr)) arr.length = 0;
                              arr.unshift(msg);
                              localStorage.setItem('app_messages', JSON.stringify(arr));
                              setSentMessages(prev => [msg, ...prev]);
                            }
                          } catch (e) {
                            const raw = typeof window !== 'undefined' ? localStorage.getItem('app_messages') || '[]' : '[]';
                            const arr = JSON.parse(raw);
                            if (!Array.isArray(arr)) arr.length = 0;
                            arr.unshift(msg);
                            localStorage.setItem('app_messages', JSON.stringify(arr));
                            setSentMessages(prev => [msg, ...prev]);
                          }
                          // refresh counts and mark this message as unread for current user
                          try {
                            // small delay to ensure storage is written
                            setTimeout(() => {
                              try { refreshNotifCounts(); } catch (e) {}
                              setUnreadMessagesCount(prev => (typeof prev === 'number' ? prev + 1 : 1));
                            }, 30);
                          } catch (e) {}
                        }
                        showToast('تم الإرسال', 'success');
                        try { refreshNotifCounts(); } catch (e) {}
                        setNotifMessage('');
                        setNotifTarget(user?.role === 'department_manager' ? 'departments' : 'all');
                        setNotifRecipient('');
                        setNotifMode('message');
                        setShowNotifModal(false);
                      } catch (e) {
                        console.error(e);
                        showToast('فشل الإرسال', 'error');
                      }
                    }}
                    className={styles.btnPrimary}
                  >
                    إرسال
                  </button>

                  <button onClick={() => setShowNotifModal(false)} className={styles.btnSecondary}>رجوع</button>
                </div>
              </div>
            ) : notifView === 'messages' ? (
              <div style={{ maxHeight: '50vh', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <h4 style={{ margin: '6px 0' }}>الرسائل</h4>
                  {sentMessages.length === 0 ? (
                    <p className={styles.small}>لا توجد رسائل</p>
                  ) : (
                    sentMessages.map((m, i) => (
                      <div key={m.id} style={{ border: '1px solid #eee', padding: 10, borderRadius: 6, background: '#fafafa', marginBottom: 8 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ background: '#1976d2', color: 'white', padding: '2px 8px', borderRadius: 12, fontSize: 12 }}>{i + 1}</span>
                            <strong>{m.fromName}</strong>
                          </div>
                          <span style={{ fontSize: 12, color: '#666' }}>{new Date(m.date).toLocaleString()}</span>
                        </div>
                        <div style={{ marginTop: 6 }}>{m.message}</div>
                        <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>المستلم: {m.to}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div style={{ maxHeight: '50vh', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <h4 style={{ margin: '6px 0' }}>التنبيهات</h4>
                  {sentNotifications.length === 0 ? (
                    <p className={styles.small}>لا توجد تنبيهات</p>
                  ) : (
                    sentNotifications.map((n, idx) => (
                      <div key={n.id} style={{ border: '1px solid #eee', padding: 10, borderRadius: 6, background: '#fff8e1', marginBottom: 8 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ background: '#ff9800', color: 'white', padding: '2px 8px', borderRadius: 12, fontSize: 12 }}>{idx + 1}</span>
                            <strong>{n.fromName}</strong>
                          </div>
                          <span style={{ fontSize: 12, color: '#666' }}>{new Date(n.date).toLocaleString()}</span>
                        </div>
                        <div style={{ marginTop: 6 }}>{n.message}</div>
                        <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>المستلم: {n.to}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {viewModalType && user?.role !== 'user' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', padding: '20px', maxWidth: '800px', width: '90%', maxHeight: '80vh', overflow: 'auto', borderRadius: 8, position: 'relative', direction: 'rtl' }}>
            <button onClick={() => setViewModalType(null)} style={{ position: 'absolute', left: 8, top: 8, fontSize: 20, border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
            <h2 style={{ marginTop: 0, marginBottom: 16 }}>
              {viewModalType === 'subjects' ? 'المواد الدراسية' : viewModalType === 'videos' ? 'الدروس التعليمية' : viewModalType === 'assignments' ? 'الواجبات' : viewModalType === 'departments' ? 'الأقسام الدراسية' : viewModalType === 'teachers' ? 'مديري القسم' : viewModalType === 'users' ? 'المستخدمين' : viewModalType === 'library' ? 'المكتبة' : 'الطلاب'}
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
                        <h5 style={{ margin: '0 0 6px 0' }}>{subject.name}</h5>
                        <p style={{ color: '#333', fontSize: '13px', margin: '0 0 6px 0', fontWeight: 500 }}>الدكتور: {(() => { const _t = teachers.find(t => String(t.id) === String(subject.teacherId)); return _t ? (_t.name || _t.id) : (subject.teacherId || 'غير محدد'); })()}</p>
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
                {selectedVideo && (
                  <div style={{ marginBottom: 12, border: '1px solid #e0e0e0', padding: 12, borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <h3 style={{ margin: 0 }}>{selectedVideo.video.title}</h3>
                      <div>
                        <button onClick={() => setSelectedVideo(null)} style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc', background: '#fff' }}>إغلاق</button>
                      </div>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      {getYoutubeEmbedUrl(selectedVideo.video.url) ? (
                        <iframe src={getYoutubeEmbedUrl(selectedVideo.video.url) || ''} width="100%" height={360} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                      ) : (
                        <a href={selectedVideo.video.url} target="_blank" rel="noreferrer">افتح الفيديو في نافذة جديدة</a>
                      )}
                    </div>
                    <p style={{ marginTop: 8 }}>{selectedVideo.video.description}</p>
                  </div>
                )}
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
            {viewModalType === 'graduation_projects' && (
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                  <input
                    type="text"
                    placeholder="ابحث عن مشروع..."
                    value={gradSearchTerm}
                    onChange={(e) => setGradSearchTerm(e.target.value)}
                    className={styles.searchInput}
                    style={{ width: '100%' }}
                  />
                </div>

                {(() => {
                  const q = (gradSearchTerm || '').trim().toLowerCase();
                  const list = graduationProjects.filter((p: any) => {
                    // if viewing only department projects (from dept manager card), filter by user's dept
                    if (gradOnlyDept && user?.departmentId) {
                      if (p.departmentId !== user.departmentId) return false;
                    }
                    if (!q) return true;
                    const name = (p.name || p.originalName || '').toString().toLowerCase();
                    const deptName = (departments.find((d: any) => d.id === p.departmentId)?.name || '').toString().toLowerCase();
                    return name.includes(q) || deptName.includes(q);
                  });

                  if (list.length === 0) return <p>لا توجد مشاريع تخرج</p>;

                  return (
                    <div
                      ref={deptListRef}
                      className={styles.modalListContainer}
                      onWheel={(e) => {
                        const el = deptListRef.current;
                        if (!el) return;
                        el.scrollBy({ top: e.deltaY, behavior: 'auto' });
                        e.preventDefault();
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                        {list.map((p: any) => (
                          <div key={p.id} style={{
                            border: '1px solid #000',
                            padding: '10px',
                            borderRadius: '8px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          }}>
                            <h5 style={{ margin: '0 0 8px 0' }}>{p.name}</h5>
                            <p style={{ fontSize: 12, color: '#666', margin: '0 0 6px 0' }}>تم الرفع: {p.uploadedAt ? new Date(p.uploadedAt).toLocaleString() : ''}</p>
                            <p style={{ fontSize: 12, color: '#666', margin: '0 0 8px 0' }}>القسم: {departments.find((d: any) => d.id === p.departmentId)?.name || 'عام'}</p>
                            <div style={{ display: 'flex', gap: 8 }}>
                              {(user.role === 'admin' || (user.role === 'department_manager' && String(p.departmentId) === String(user.departmentId))) && (
                                <a href={p.url} target="_blank" rel="noreferrer" style={{ padding: '6px 10px', background: '#1976d2', color: 'white', borderRadius: 4, textDecoration: 'none' }}>تحميل / عرض</a>
                              )}
                              {(user.role === 'admin' || (user.role === 'department_manager' && String(p.departmentId) === String(user.departmentId))) && (
                                <button onClick={async () => {
                                  if (!confirm('هل تريد حذف هذا المشروع؟')) return;
                                  try {
                                    const res = await fetch(`/api/graduation_projects?id=${encodeURIComponent(p.id)}`, { method: 'DELETE', credentials: 'include' });
                                    if (res.ok) {
                                      setGraduationProjects(prev => prev.filter(pr => pr.id !== p.id));
                                      showToast('تم حذف المشروع', 'success');
                                    } else {
                                      const txt = await res.text().catch(() => 'فشل الحذف');
                                      showToast(txt || 'فشل الحذف', 'error');
                                    }
                                  } catch (e) {
                                    console.error(e);
                                    showToast('فشل الحذف', 'error');
                                  }
                                }} style={{ padding: '6px 10px', background: '#d32f2f', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>حذف</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
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
                          <div style={{ fontSize: 12, color: '#666' }}>{a.subjectId ? `المادة: ${subjects.find(s => String(s.id) === String(a.subjectId))?.name || a.subjectId}` : ''}</div>
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
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                  <input
                    type="text"
                    placeholder="ابحث عن مستخدم..."
                    value={modalStudentsSearchTerm}
                    onChange={(e) => setModalStudentsSearchTerm(e.target.value)}
                    className={styles.searchInput}
                    style={{ width: '100%' }}
                  />
                  {user?.role === 'department_manager' && (
                    <select value={modalStudentsSort} onChange={(e) => setModalStudentsSort(e.target.value as any)} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: 4 }}>
                      <option value="none">فرز: بدون</option>
                      <option value="name">فرز حسب الاسم</option>
                      <option value="role">فرز حسب الدور</option>
                    </select>
                  )}
                </div>
                {user?.role === 'department_manager' && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <button onClick={() => setModalStudentsFilter('all')} style={{ padding: '6px 12px', fontSize: '14px', background: modalStudentsFilter === 'all' ? '#007bff' : '#f8f9fa', color: modalStudentsFilter === 'all' ? 'white' : 'black', border: '1px solid #ccc', borderRadius: 4 }}>الكل</button>
                    <button onClick={() => setModalStudentsFilter('teacher')} style={{ padding: '6px 12px', fontSize: '14px', background: modalStudentsFilter === 'teacher' ? '#007bff' : '#f8f9fa', color: modalStudentsFilter === 'teacher' ? 'white' : 'black', border: '1px solid #ccc', borderRadius: 4 }}>دكتور</button>
                    <button onClick={() => setModalStudentsFilter('user')} style={{ padding: '6px 12px', fontSize: '14px', background: modalStudentsFilter === 'user' ? '#007bff' : '#f8f9fa', color: modalStudentsFilter === 'user' ? 'white' : 'black', border: '1px solid #ccc', borderRadius: 4 }}>الطلاب</button>
                  </div>
                )}

                {(() => {
                  const q = (modalStudentsSearchTerm || '').toLowerCase().trim();
                  let list = Array.isArray(filteredStudents) ? [...filteredStudents] : [];
                  if (q) {
                    list = list.filter((s: any) => {
                      return (s.id || '').toString().toLowerCase().includes(q) || (s.name || '').toLowerCase().includes(q) || (s.role || '').toLowerCase().includes(q);
                    });
                  }
                  if (modalStudentsFilter !== 'all') {
                    list = list.filter((s: any) => s.role === modalStudentsFilter);
                  }
                  if (modalStudentsSort === 'name') {
                    list.sort((a: any, b: any) => ( (a.name || a.id || '').toString().localeCompare((b.name || b.id || '').toString()) ));
                  } else if (modalStudentsSort === 'role') {
                    list.sort((a: any, b: any) => ( (a.role || '').toString().localeCompare((b.role || '').toString()) ));
                  }

                  if (list.length === 0) return <p>لا يوجد مستخدمين</p>;

                  return (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                        {list.map(student => {
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
                            <p style={{ color: '#666', fontSize: '12px', margin: '0 0 8px 0' }}>الدور: {student.role === 'admin' ? 'مسؤول النظام' : student.role === 'department_manager' ? 'مدير القسم' : student.role === 'teacher' ? 'دكتور' : 'طالب'}</p>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => openEditUser(student)} style={{ padding: '4px 8px', fontSize: '12px', background: '#1976d2', color: 'white', border: 'none', borderRadius: '4px' }}>تعديل</button>
                              <button onClick={() => handleDeleteUser(student.id)} style={{ padding: '4px 8px', fontSize: '12px', background: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px' }}>حذف</button>
                            </div>
                          </div>
                        );
                      })}
                      </div>
                      {usersTotal && users.length < usersTotal && (
                        <div style={{ textAlign: 'center', marginTop: 12 }}>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                setUsersLoadingMore(true);
                                await fetchUsersPage(usersPage + 1, true);
                              } finally {
                                setUsersLoadingMore(false);
                              }
                            }}
                            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc', background: '#fff' }}
                          >
                            {usersLoadingMore ? 'جاري التحميل...' : `تحميل المزيد (${users.length}/${usersTotal})`}
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
            {viewModalType === 'library' && (
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                  <input
                    type="text"
                    placeholder="ابحث في المكتبة..."
                    value={modalLibrarySearchTerm}
                    onChange={(e) => setModalLibrarySearchTerm(e.target.value)}
                    className={styles.searchInput}
                    style={{ width: '100%' }}
                  />
                </div>

                {(() => {
                  const q = (modalLibrarySearchTerm || '').toLowerCase();
                  const list = books.filter(b => {
                    if (!q) return true;
                    const title = (b.title || '').toString().toLowerCase();
                    const deptName = (departments.find(d => d.id === b.departmentId)?.name || '').toString().toLowerCase();
                    return title.includes(q) || deptName.includes(q);
                  });

                  if (list.length === 0) return <p>لا توجد كتب</p>;

                  return (
                    <div
                      ref={deptListRef}
                      className={styles.modalListContainer}
                      onWheel={(e) => {
                        const el = deptListRef.current;
                        if (!el) return;
                        el.scrollBy({ top: e.deltaY, behavior: 'auto' });
                        e.preventDefault();
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                        {list.map(book => {
                          const dept = departments.find(d => d.id === book.departmentId);
                          return (
                            <div key={book.id} style={{
                              border: '1px solid #000',
                              padding: '10px',
                              borderRadius: '8px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            }}>
                              <h5 style={{ margin: '0 0 8px 0' }}>{book.title}</h5>
                              <p style={{ color: '#666', fontSize: '12px', margin: '0 0 5px 0' }}>القسم: {dept ? dept.name : 'غير محدد'}</p>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => window.open(book.url, '_blank')} style={{ padding: '4px 8px', fontSize: '12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>فتح الرابط</button>
                                <button onClick={() => handleDeleteBook(book.id)} style={{ padding: '4px 8px', fontSize: '12px', background: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px' }}>حذف</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
            {viewModalType === 'users' && (
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                  <input
                    type="text"
                    placeholder="ابحث عن مستخدم..."
                    value={modalUserSearchTerm}
                    onChange={(e) => setModalUserSearchTerm(e.target.value)}
                    className={styles.searchInput}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <button onClick={() => setModalUserFilter('all')} style={{ padding: '6px 12px', fontSize: '14px', background: modalUserFilter === 'all' ? '#007bff' : '#f8f9fa', color: modalUserFilter === 'all' ? 'white' : 'black', border: '1px solid #ccc', borderRadius: 4 }}>الكل</button>
                  <button onClick={() => setModalUserFilter('admin')} style={{ padding: '6px 12px', fontSize: '14px', background: modalUserFilter === 'admin' ? '#007bff' : '#f8f9fa', color: modalUserFilter === 'admin' ? 'white' : 'black', border: '1px solid #ccc', borderRadius: 4 }}>مسؤول النظام</button>
                  <button onClick={() => setModalUserFilter('department_manager')} style={{ padding: '6px 12px', fontSize: '14px', background: modalUserFilter === 'department_manager' ? '#007bff' : '#f8f9fa', color: modalUserFilter === 'department_manager' ? 'white' : 'black', border: '1px solid #ccc', borderRadius: 4 }}>مدير القسم</button>
                  <button onClick={() => setModalUserFilter('teacher')} style={{ padding: '6px 12px', fontSize: '14px', background: modalUserFilter === 'teacher' ? '#007bff' : '#f8f9fa', color: modalUserFilter === 'teacher' ? 'white' : 'black', border: '1px solid #ccc', borderRadius: 4 }}>دكتور</button>
                  <button onClick={() => setModalUserFilter('user')} style={{ padding: '6px 12px', fontSize: '14px', background: modalUserFilter === 'user' ? '#007bff' : '#f8f9fa', color: modalUserFilter === 'user' ? 'white' : 'black', border: '1px solid #ccc', borderRadius: 4 }}>الطلاب</button>
                </div>

                {(() => {
                  const q = (modalUserSearchTerm || '').toLowerCase();
                  const list = users.filter(u => {
                    if (!q) return true;
                    return (u.id || '').toString().toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q) || (u.role || '').toLowerCase().includes(q);
                  }).filter(u => modalUserFilter === 'all' || u.role === modalUserFilter);

                  if (list.length === 0) return <p>لا يوجد مستخدمين</p>;
                  return (
                    <div
                      ref={deptListRef}
                      className={styles.modalListContainer}
                      onWheel={(e) => {
                        const el = deptListRef.current;
                        if (!el) return;
                        el.scrollBy({ top: e.deltaY, behavior: 'auto' });
                        e.preventDefault();
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                        {list.map(u => {
                          const dept = departments.find(d => d.id === u.departmentId);
                          return (
                            <div key={u.id} style={{
                              border: '1px solid #000',
                              padding: '10px',
                              borderRadius: '8px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            }}>
                              <h5 style={{ margin: '0 0 8px 0' }}>{u.name || u.id}</h5>
                              <p style={{ color: '#666', fontSize: '12px', margin: '0 0 8px 0' }}>{'المستخدم: ' + (u.id || '')}</p>
                              {u.departmentId && <p style={{ color: '#666', fontSize: '12px', margin: '0 0 8px 0' }}>القسم: {dept ? dept.name : 'غير محدد'}</p>}
                              <p style={{ color: '#666', fontSize: '12px', margin: '0 0 8px 0' }}>
                                الدور: {u.role === 'user' ? 'طالب' : u.role === 'teacher' ? 'دكتور' : u.role === 'department_manager' ? 'مدير القسم' : u.role === 'admin' ? 'مسؤول النظام' : u.role}
                              </p>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button onClick={() => openEditUser(u)} style={{ padding: '4px 8px', fontSize: '12px', background: '#1976d2', color: 'white', border: 'none', borderRadius: '4px' }}>تعديل</button>
                                <button onClick={() => handleDeleteUser(u.id)} style={{ padding: '4px 8px', fontSize: '12px', background: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px' }}>حذف</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                  <input
                    type="text"
                    placeholder="ابحث عن قسم..."
                    value={modalDeptSearchTerm}
                    onChange={(e) => setModalDeptSearchTerm(e.target.value)}
                    className={styles.searchInput}
                    style={{ width: '100%' }}
                  />
                </div>

                {(() => {
                  const q = (modalDeptSearchTerm || '').toLowerCase();
                  const list = filteredDepartments.filter(d => {
                    if (!q) return true;
                    return (d.name || '').toLowerCase().includes(q) || (d.description || '').toLowerCase().includes(q);
                  });
                  if (list.length === 0) return <p>لا توجد أقسام</p>;
                  return (
                    <div
                      ref={deptListRef}
                      className={styles.modalListContainer}
                      onWheel={(e) => {
                        // ensure inner container scrolls with mouse wheel and prevent outer modal scroll
                        const el = deptListRef.current;
                        if (!el) return;
                        el.scrollBy({ top: e.deltaY, behavior: 'auto' });
                        e.preventDefault();
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                        {list.map(dept => (
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
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {showGradModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 100000 }}>
          <div style={{ background: 'white', padding: '18px', marginTop: '40px', maxWidth: '640px', width: '95%', borderRadius: 8, position: 'relative', direction: 'rtl' }}>
            <button onClick={() => setShowGradModal(false)} style={{ position: 'absolute', left: 8, top: 8, fontSize: 20, border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
            <h2 style={{ marginTop: 0 }}>رفع مشروع تخرج</h2>
            <p style={{ marginTop: 0, color: '#666' }}>اختر ملف PDF لرفعه على المنصة. فقط ملفات PDF مدعومة.</p>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input placeholder="عنوان المشروع" value={gradTitle} onChange={(e) => setGradTitle(e.target.value)} style={{ padding: '8px', borderRadius: 6, border: '1px solid #ccc' }} />
              <div>
                <label style={{ marginRight: 8 }}>القسم:</label>
                <select value={gradDeptId || ''} onChange={(e) => setGradDeptId(e.target.value || null)} style={{ padding: '8px', borderRadius: 6, border: '1px solid #ccc' }}>
                  <option value="">-- اختر القسم --</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f0f0f0', borderRadius: 6, cursor: 'pointer', border: '1px solid #ccc' }}>
                  اختيار الملف
                  <input type="file" accept="application/pdf" onChange={(e) => setGradFile(e.target.files ? e.target.files[0] : null)} style={{ display: 'none' }} />
                </label>
                <span style={{ fontSize: 13, color: '#333', minWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gradFile ? gradFile.name : 'لم يتم اختيار ملف'}</span>
                <button onClick={handleUploadGraduationProject} disabled={uploadingGrad || !gradFile} style={{ padding: '8px 12px', background: uploadingGrad || !gradFile ? '#90caf9' : '#1976d2', color: 'white', border: 'none', borderRadius: 6, cursor: uploadingGrad || !gradFile ? 'not-allowed' : 'pointer' }}>{uploadingGrad ? 'جارٍ الرفع...' : 'رفع'}</button>
                <button onClick={() => { setGradFile(null); setShowGradModal(false); setGradTitle(''); setGradDeptId(null); }} style={{ padding: '8px 12px', borderRadius: 6 }}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeptSubjectsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ background: 'white', padding: '20px', maxWidth: '800px', width: '90%', maxHeight: '80vh', overflow: 'auto', borderRadius: 8, position: 'relative', direction: 'rtl' }}>
            <button onClick={() => setShowDeptSubjectsModal(false)} style={{ position: 'absolute', left: 8, top: 8, fontSize: 20, border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>المواد التابعة للقسم</h2>
            <p style={{ marginTop: 0, marginBottom: 12 }}>القسم: {departments.find(d => d.id === user.departmentId)?.name || 'غير محدد'}</p>

            

            <div>
              <h4>استعراض المواد</h4>
              {(() => {
                const list = Array.isArray(subjects) ? subjects.filter(s => s.departmentId === user.departmentId || (!s.departmentId && departments[0] && departments[0].id === user.departmentId)) : [];
                if (list.length === 0) return <p>لا توجد مواد</p>;
                return (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {list.map((subject: any) => {
                      const teacher = teachers.find(t => t.id === subject.teacherId);
                      return (
                        <div key={subject.id} style={{ border: '1px solid #000', padding: 10, borderRadius: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <strong style={{ fontSize: 14 }}>{subject.name}</strong>
                              <div style={{ fontSize: 12, color: '#666' }}>{teacher ? `الدكتور: ${teacher.name || teacher.id}` : 'بدون دكتور'}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              {(user.role === 'admin') ? (
                                <button onClick={() => { handleDeleteSubject(subject.id); setTimeout(() => { if (user?.role === 'admin') loadData(); else if (user?.departmentId) loadDepartmentData(user.departmentId); }, 300); }} style={{ padding: '6px 10px' }}>حذف</button>
                              ) : (
                                <button onClick={() => { handleDeleteSubjectForManager(subject.id); setTimeout(() => { if (user?.departmentId) loadDepartmentData(user.departmentId); }, 300); }} style={{ padding: '6px 10px' }}>حذف</button>
                              )}
                            </div>
                          </div>
                          {subject.description && <p style={{ marginTop: 8 }}>{subject.description}</p>}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

          </div>
        </div>
      )}

      {showAddSubjectModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ background: 'white', padding: '20px', maxWidth: '720px', width: '90%', maxHeight: '80vh', overflow: 'auto', borderRadius: 8, position: 'relative', direction: 'rtl' }}>
            <button onClick={() => setShowAddSubjectModal(false)} style={{ position: 'absolute', left: 8, top: 8, fontSize: 20, border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>اضافة مادة جديدة</h2>
            <div style={{ padding: 10, border: '1px solid #eee', borderRadius: 6 }}>
              <AddSubjectForm
                departments={departments}
                teachers={teachers}
                onAdd={(name, desc, deptId, teacherId) => {
                  handleAddSubject(name, desc, user.departmentId || deptId, user.role === 'teacher' ? user.id : teacherId);
                  setTimeout(() => { if (user?.departmentId) loadDepartmentData(user.departmentId); }, 300);
                  setShowAddSubjectModal(false);
                }}
                user={user}
              />
            </div>
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

function AddAssignmentForm({ subjects, onAdd }: { subjects?: any[]; onAdd: (title: string, question: string, answerType: string, options?: string[], correctAnswer?: string, dueDate?: string, subjectId?: string) => void }) {
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [answerType, setAnswerType] = useState('choice');
  const [optionsText, setOptionsText] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [due, setDue] = useState('');
  const [subjectId, setSubjectId] = useState('');

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', borderRadius: 6, border: '1px solid #ccc', fontSize: 14 };
  const btnStyle: React.CSSProperties = { padding: '10px 14px', background: '#000', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' };

  return (
    <form onSubmit={(e) => { e.preventDefault(); const opts = optionsText ? optionsText.split('|').map(s => s.trim()).filter(Boolean) : undefined; onAdd(title, question, answerType, opts, correctAnswer || undefined, due || undefined, subjectId || undefined); setTitle(''); setQuestion(''); setAnswerType('choice'); setOptionsText(''); setCorrectAnswer(''); setDue(''); setSubjectId(''); }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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

      <label>المادة (اختياري)</label>
      <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: 4 }}>
        <option value="">- بدون مادة -</option>
        {(subjects || []).map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" style={btnStyle}>أضف الواجب</button>
        <button type="button" onClick={() => { setTitle(''); setQuestion(''); setAnswerType('choice'); setOptionsText(''); setCorrectAnswer(''); setDue(''); setSubjectId(''); }} style={{ padding: '10px 14px', borderRadius: 6, border: '1px solid #ccc', background: 'white', cursor: 'pointer' }}>مسح</button>
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

function AddUserForm({ departments, subjects, onAdd, allowedRoles = ['user', 'teacher', 'department_manager', 'admin'], defaultDepartmentId, showToast }: { departments?: any[], subjects?: any[], onAdd: (userId: string, name: string, role: string, password: string, departmentId?: string, subjectId?: string) => Promise<boolean> | boolean | void, allowedRoles?: string[], defaultDepartmentId?: string, showToast?: (msg: string, type?: 'success'|'error'|'info') => void }) {
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');
  const [password, setPassword] = useState('');
  const [departmentId, setDepartmentId] = useState(defaultDepartmentId || '');
  const [subjectId, setSubjectId] = useState('');

  React.useEffect(() => {
    if (role === 'admin') setDepartmentId('');
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) { if (showToast) showToast('يرجى إدخال اسم المستخدم','error'); else alert('يرجى إدخال اسم المستخدم'); return; }
    if (!name.trim()) { if (showToast) showToast('يرجى إدخال الاسم الكامل','error'); else alert('يرجى إدخال الاسم الكامل'); return; }
    if (!password.trim()) { if (showToast) showToast('يرجى إدخال كلمة المرور','error'); else alert('يرجى إدخال كلمة المرور'); return; }
    // If subjects are not provided (we show department select) then department is required for non-admin roles
    if (!subjects && role !== 'admin' && !departmentId) { if (showToast) showToast('اختر القسم أولاً','error'); else alert('اختر القسم أولاً'); return; }
    const res = await onAdd(userId.trim(), name.trim(), role, password, departmentId || undefined, subjectId || undefined);
    // if onAdd returns false, keep form as-is (error). On success (true/undefined), reset form.
    if (res === false) return;
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
        {allowedRoles.includes('department_manager') && <option value="department_manager">مدير القسم</option>}
        {allowedRoles.includes('teacher') && <option value="teacher">دكتور</option>}
        {allowedRoles.includes('user') && <option value="user">طالب</option>}
        
        
        
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
        role !== 'admin' && (
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            required={role !== 'admin'}
            style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            <option value="">اختر القسم {role !== 'admin' ? '(مطلوب)' : '(اختياري)'}</option>
            {departments?.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        )
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

  // Consider actual teachers (role === 'teacher') primarily
  const availableTeachers = (teachers || []).filter((t: any) => t.role === 'teacher');

  // When department changes, filter teachers to that department and auto-select first.
  // If no teachers exist for the dept, we'll fallback to the department_manager for that dept (if any).
  React.useEffect(() => {
    const dept = user?.role === 'department_manager' ? user.departmentId : departmentId;
    if (!dept) {
      setTeacherId('');
      return;
    }
    const deptTeachers = availableTeachers.filter((t: any) => t.departmentId === dept);
    if (deptTeachers.length === 0) {
      // fallback: find department_manager for this dept
      const mgrs = (teachers || []).filter((t: any) => t.role === 'department_manager' && t.departmentId === dept);
      if (mgrs.length === 0) {
        setTeacherId('');
      } else {
        if (!mgrs.find(t => t.id === teacherId)) setTeacherId(mgrs[0].id);
      }
    } else {
      // keep previous selection if still valid
      if (!deptTeachers.find(t => t.id === teacherId)) setTeacherId(deptTeachers[0].id);
    }
  }, [departmentId, user?.departmentId, JSON.stringify(availableTeachers)]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const deptId = user?.role === 'department_manager' ? user.departmentId : departmentId;
    const teacherRequired = availableTeachers.length > 0;
    if (name.trim() && deptId && (!teacherRequired || teacherId)) {
      onAdd(name.trim(), description.trim(), deptId, teacherId || undefined);
      setName('');
      setDescription('');
      if (user?.role !== 'department_manager') setDepartmentId('');
      setTeacherId('');
    }
  };

  // Teachers shown in select: prefer role 'teacher' in the selected dept; if none, show dept managers
  const teachersForDept = (() => {
    const dept = user?.role === 'department_manager' ? user.departmentId : departmentId;
    if (!dept) return [];
    const deptTeachers = availableTeachers.filter((t: any) => t.departmentId === dept);
    if (deptTeachers.length > 0) return deptTeachers;
    // fallback to department_manager(s) for that dept
    return (teachers || []).filter((t: any) => t.departmentId === dept && t.role === 'department_manager');
  })();

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

      {/** show teacher select only when there are teachers for the chosen department **/}
      {teachersForDept.length > 0 && (
        <select
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          required
          style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
        >
          <option value="">اختر الدكتور للقسم</option>
          {teachersForDept.map((teacher: any) => (
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
