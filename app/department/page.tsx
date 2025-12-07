"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './department.module.css';

function getYoutubeEmbedUrl(url: string): string | null {
  try {
    const youtubeUrlRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(youtubeUrlRegex);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  } catch {
    return null;
  }
}

export default function DepartmentPage() {
  const [user, setUser] = useState<any>(null);
  const [department, setDepartment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<{ video: any; subjectId: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/me', { credentials: 'include' });
        if (res.status !== 200) return router.push('/login');
        const data = await res.json();
        setUser(data.user);

        if (!data.user.departmentId) {
          return router.push('/dashboard');
        }

        // Fetch user's department by id
        const deptRes = await fetch(`/api/departments?id=${data.user.departmentId}`, { credentials: 'include' });
        if (deptRes.ok) {
          const deptData = await deptRes.json();
          setDepartment(deptData.department);
        } else {
          setDepartment(null);
        }
      } catch (e) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function logout() {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    router.push('/login');
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.spinner}>جارٍ التحميل...</div>
      </div>
    );
  }

  if (!user || !department) {
    return (
      <div className={styles.container}>
        <nav className={styles.navbar}>
          <h1>منصة الكلية</h1>
          <button onClick={logout} className={styles.logoutBtn}>تسجيل الخروج</button>
        </nav>
        <div className={styles.main}>
          <p>لم تتم إضافتك إلى أي قسم</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <nav className={styles.navbar}>
        <div className={styles.navContent}>
          <div>
            <h1>منصة الكلية</h1>
            <p className={styles.deptTitle}>{department.name}</p>
          </div>
          <div className={styles.userMenu}>
            <span>{user.id}</span>
            <button onClick={logout} className={styles.logoutBtn}>تسجيل الخروج</button>
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>{department.name}</h2>
            <p className={styles.description}>{department.description}</p>
          </div>

          {selectedVideo && (
            <div className={styles.videoPlayerContainer}>
              <div className={styles.videoPlayerHeader}>
                <h2>{selectedVideo.video.title}</h2>
                <button className={styles.closeBtn} onClick={() => setSelectedVideo(null)}>✕</button>
              </div>
              <div className={styles.videoPlayerWrapper}>
                {getYoutubeEmbedUrl(selectedVideo.video.url) ? (
                  <iframe
                    src={getYoutubeEmbedUrl(selectedVideo.video.url) || ''}
                    title={selectedVideo.video.title}
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

          <div className={styles.content}>
            <h3>المواد الدراسية</h3>
            {department.subjects && department.subjects.length > 0 ? (
              <div className={styles.subjects}>
                {department.subjects.map((subject: any) => (
                  <div key={subject.id} className={styles.subjectCard}>
                    <h4>{subject.name}</h4>
                    <p>{subject.description}</p>
                    {subject.videos && subject.videos.length > 0 && (
                      <div className={styles.videos}>
                        <p className={styles.videoCount}>{subject.videos.length} فيديوهات</p>
                        {subject.videos.map((video: any) => (
                          <div key={video.id} className={styles.videoItem}>
                            <button className={styles.playBtn} onClick={() => setSelectedVideo({ video, subjectId: subject.id })}>
                              ▶ {video.title}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.empty}>لم تتم إضافة مواد لهذا القسم بعد</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
