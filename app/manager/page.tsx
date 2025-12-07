'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './manager.module.css';

interface Video {
  id: string;
  title: string;
  url: string;
  description: string;
}

interface Subject {
  id: string;
  name: string;
  description: string;
  videos?: Video[];
}

interface Department {
  id: string;
  name: string;
  description: string;
  subjects?: Subject[];
}

interface User {
  id: string;
  name: string;
  role: string;
  departmentId?: string | null;
}

function getYoutubeEmbedUrl(url: string): string | null {
  try {
    const youtubeUrlRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(youtubeUrlRegex);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  } catch {
    return null;
  }
}

export default function ManagerPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [dept, setDept] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'subjects' | 'videos'>('subjects');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectDesc, setNewSubjectDesc] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoDesc, setNewVideoDesc] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<{ video: Video; subjectId: string } | null>(null);

  useEffect(() => {
    const fetchUserAndDept = async () => {
      try {
        const res = await fetch('/api/me', { credentials: 'include' });
        if (!res.ok) return router.push('/login');
        const body = await res.json();
        const userData: User = body.user;
        if (!userData) return router.push('/login');
        if (userData.role !== 'department_manager') return router.push('/dashboard');
        if (!userData.departmentId) {
          console.error('Manager has no departmentId');
          return router.push('/dashboard');
        }
        setUser(userData);

        const deptRes = await fetch(`/api/departments?id=${userData.departmentId}`, { credentials: 'include' });
        if (!deptRes.ok) {
          console.error('Failed to fetch department', deptRes.status);
          setDept(null);
        } else {
          const d = await deptRes.json();
          setDept(d.department || null);
        }
      } catch (err) {
        console.error(err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchUserAndDept();
  }, [router]);

  const logout = async () => {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    router.push('/login');
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName || !user) return;
    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSubjectName, description: newSubjectDesc, departmentId: user.departmentId }),
      });
      if (res.ok) location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVideoTitle || !newVideoUrl || !selectedSubjectId || !user) return;
    try {
      const res = await fetch('/api/videos', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newVideoTitle, url: newVideoUrl, description: newVideoDesc, departmentId: user.departmentId, subjectId: selectedSubjectId }),
      });
      if (res.ok) location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!user || !confirm('هل تريد حذف هذا المقرر؟')) return;
    if (!dept || !dept.id) return;
    try {
      const res = await fetch(`/api/departments/${dept.id}/subjects/${subjectId}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteVideo = async (videoId: string, subjectId: string) => {
    if (!user || !confirm('هل تريد حذف هذا الفيديو؟')) return;
    try {
      const res = await fetch(`/api/departments/${user.departmentId}/subjects/${subjectId}/videos/${videoId}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className={styles.container}>جاري التحميل...</div>;
  if (!user || !dept) return <div className={styles.container}>خطأ في تحميل البيانات</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>لوحة التحكم - {dept.name}</h1>
          <p className={styles.subtitle}>مرحبا، {user.name}</p>
        </div>
        <button className={styles.logoutBtn} onClick={logout}>تسجيل الخروج</button>
      </header>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'subjects' ? styles.active : ''}`} onClick={() => setActiveTab('subjects')}>المقررات</button>
        <button className={`${styles.tab} ${activeTab === 'videos' ? styles.active : ''}`} onClick={() => setActiveTab('videos')}>الفيديوهات</button>
      </div>

      {activeTab === 'subjects' && (
        <div className={styles.tabContent}>
          <form onSubmit={handleAddSubject} className={styles.form}>
            <input value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="اسم المقرر" required />
            <textarea value={newSubjectDesc} onChange={(e) => setNewSubjectDesc(e.target.value)} placeholder="وصف المقرر" rows={3} />
            <button type="submit">إضافة مقرر</button>
          </form>

          <div className={styles.grid}>
            {(dept.subjects || []).map((subject) => (
              <div key={subject.id} className={styles.card}>
                <h3>{subject.name}</h3>
                <p>{subject.description}</p>
                <p className={styles.meta}>{(subject.videos || []).length} فيديو</p>
                <button className={styles.deleteBtn} onClick={() => handleDeleteSubject(subject.id)}>حذف</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'videos' && (
        <div className={styles.tabContent}>
          <form onSubmit={handleAddVideo} className={styles.form}>
            <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} required>
              <option value="">-- اختر مقرر --</option>
              {(dept.subjects || []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <input value={newVideoTitle} onChange={(e) => setNewVideoTitle(e.target.value)} placeholder="عنوان الفيديو" required />
            <input value={newVideoUrl} onChange={(e) => setNewVideoUrl(e.target.value)} placeholder="رابط الفيديو" required />
            <textarea value={newVideoDesc} onChange={(e) => setNewVideoDesc(e.target.value)} placeholder="وصف الفيديو" rows={2} />
            <button type="submit">إضافة فيديو</button>
          </form>

          {selectedVideo && (
            <div className={styles.videoPlayerContainer}>
              <div className={styles.videoPlayerHeader}>
                <h2>{selectedVideo.video.title}</h2>
                <button className={styles.closeBtn} onClick={() => setSelectedVideo(null)}>✕</button>
              </div>
              <div className={styles.videoPlayerWrapper}>
                {getYoutubeEmbedUrl(selectedVideo.video.url) ? (
                  <iframe
                    width="100%"
                    height="500"
                    src={getYoutubeEmbedUrl(selectedVideo.video.url) || ''}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className={styles.videoPlayerError}>
                    <p>لا يمكن تشغيل هذا الفيديو</p>
                    <a href={selectedVideo.video.url} target="_blank" rel="noopener noreferrer" className={styles.link}>افتح على YouTube</a>
                  </div>
                )}
              </div>
              <p className={styles.videoDescription}>{selectedVideo.video.description}</p>
            </div>
          )}

          <div className={styles.grid}>
            {(dept.subjects || []).map((subject) =>
              (subject.videos || []).map((video) => (
                <div key={`${subject.id}-${video.id}`} className={styles.card}>
                  <h3>{video.title}</h3>
                  <p className={styles.meta}>{subject.name}</p>
                  <p>{video.description}</p>
                  <button className={styles.playBtn} onClick={() => setSelectedVideo({ video, subjectId: subject.id })}>▶ تشغيل الفيديو</button>
                  <button className={styles.deleteBtn} onClick={() => handleDeleteVideo(video.id, subject.id)}>حذف</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
