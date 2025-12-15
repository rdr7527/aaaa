"use client";
import React, { useEffect, useState } from 'react';
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

// Helper to submit completion (fetches current user then posts completion)
async function handleCompleteAssignment(assignmentId: string, answer: any): Promise<boolean> {
  try {
    const meRes = await fetch('/api/me', { credentials: 'include' });
    if (!meRes.ok) {
      alert('يرجى تسجيل الدخول');
      return false;
    }
    const meBody = await meRes.json();
    const user = meBody.user;
    const res = await fetch(`/api/assignments/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ assignmentId, answer, userId: user.id, userName: user.name || user.id }),
    });
    if (res.ok) {
      alert('تم إرسال الإجابة');
      return true;
    } else {
      if (res.status === 409) {
        alert('لقد قمت بإرسال هذه الإجابة مسبقاً');
        return false;
      }
      const txt = await res.text();
      console.error('فشل إرسال الإجابة', res.status, txt);
      alert('فشل إرسال الإجابة');
      return false;
    }
  } catch (e) {
    console.error(e);
    alert('حدث خطأ أثناء الإرسال');
    return false;
  }
}

function formatAnswer(answer: any, answerType?: string): string {
  if (!answer) return '<بدون إجابة>';
  if (answerType === 'tf') {
    return answer === 'true' ? 'صح ✓' : answer === 'false' ? 'خطأ ✗' : String(answer);
  }
  return String(answer);
}

export default function DepartmentPage() {
  const [user, setUser] = useState<any>(null);
  const [department, setDepartment] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [showAddAssignment, setShowAddAssignment] = useState(false);
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
          // try to load assignments either nested or via API
          const nested = deptData.department?.assignments;
          if (nested) setAssignments(nested || []);
          else {
            try {
              const ares = await fetch(`/api/assignments?departmentId=${deptData.department.id}`, { credentials: 'include' });
              if (ares.ok) {
                const abody = await ares.json();
                setAssignments(abody.assignments || []);
              }
            } catch (e) {
              // ignore
            }
          }
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
          <img src="../src/sh.jpg" alt="الشعار" style={{ width: '50px', height: '50px', objectFit: 'contain' }} />
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="../src/sh.jpg" alt="الشعار" style={{ width: '50px', height: '50px', objectFit: 'contain' }} />
            <p className={styles.deptTitle}>منارة المعرفة </p>
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
          
            {showAddAssignment && user.role === 'department_manager' && (
              <div style={{ margin: '12px 0', padding: 12, border: '1px solid #ccc', borderRadius: 8, maxWidth: 720 }}>
                <AddAssignmentForm
                  onAdd={async (title, description, dueDate) => {
                    try {
                      const res = await fetch('/api/assignments', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title, description, dueDate, departmentId: department.id }),
                      });
                      if (res.ok) {
                        // try to reload assignments
                        const ares = await fetch(`/api/assignments?departmentId=${department.id}`, { credentials: 'include' });
                        if (ares.ok) {
                          const abody = await ares.json();
                          setAssignments(abody.assignments || []);
                        } else {
                          // append locally
                          const body = await res.json();
                          setAssignments(prev => [body.assignment, ...prev]);
                        }
                        setShowAddAssignment(false);
                      } else {
                        alert('فشل إضافة الواجب');
                      }
                    } catch (e) {
                      console.error(e);
                      alert('حدث خطأ');
                    }
                  }}
                />
              </div>
            )}

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
            
            <div style={{ marginTop: 20 }}>
              <h3>الواجبات</h3>
              {assignments && assignments.length > 0 ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  {assignments.map(a => (
                    <div key={a.id} style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>{a.title}</strong>
                        <span style={{ fontSize: 12, color: '#666' }}>{a.dueDate ? `المهلة: ${new Date(a.dueDate).toLocaleDateString()}` : ''}</span>
                      </div>
                      <p style={{ marginTop: 8 }}>{a.description}</p>
                      {user.role === 'department_manager' ? (
                        <div style={{ marginTop: 8 }}>
                          <h5 style={{ margin: '0 0 8px 0' }}>التسليمات ({(a.completions || []).length})</h5>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {(a.completions || []).map((c: any, idx: number) => (
                              <div key={idx} style={{ border: '1px solid #e0e0e0', padding: 10, borderRadius: 6, background: '#fafafa' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                  <strong style={{ fontSize: 14 }}>{c.userName || c.userId}</strong>
                                  <span style={{ fontSize: 11, color: '#999' }}>{c.date ? new Date(c.date).toLocaleString() : ''}</span>
                                </div>
                                <div style={{ fontSize: 13, padding: '8px 10px', background: 'white', borderRadius: 4, border: '1px solid #e0e0e0', wordBreak: 'break-word' }}>
                                  {formatAnswer(c.answer, a.answerType)}
                                </div>
                              </div>
                            ))}
                            {(!a.completions || a.completions.length === 0) && <p style={{ color: '#999' }}>لا توجد تسليمات بعد</p>}
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginTop: 8 }}>
                          {a.answerType === 'choice' ? (
                            <ChoiceAnswer a={a} onComplete={async (ans: string) => {
                              const ok = await handleCompleteAssignment(a.id, ans);
                              if (ok) {
                                setAssignments(prev => prev.map(p => p.id === a.id ? { ...p, completions: [...(p.completions || []), { userId: user?.id || 'unknown', userName: user?.name || user?.id || 'مستخدم', answer: ans, date: new Date().toISOString() }] } : p));
                              }
                              return ok;
                            }} />
                          ) : a.answerType === 'tf' ? (
                            <TFAnswer a={a} onComplete={async (ans: string) => {
                              const ok = await handleCompleteAssignment(a.id, ans);
                              if (ok) {
                                setAssignments(prev => prev.map(p => p.id === a.id ? { ...p, completions: [...(p.completions || []), { userId: user?.id || 'unknown', userName: user?.name || user?.id || 'مستخدم', answer: ans, date: new Date().toISOString() }] } : p));
                              }
                              return ok;
                            }} />
                          ) : (
                            <EssayAnswer a={a} onComplete={async (ans: string) => {
                              const ok = await handleCompleteAssignment(a.id, ans);
                              if (ok) {
                                setAssignments(prev => prev.map(p => p.id === a.id ? { ...p, completions: [...(p.completions || []), { userId: user?.id || 'unknown', userName: user?.name || user?.id || 'مستخدم', answer: ans, date: new Date().toISOString() }] } : p));
                              }
                              return ok;
                            }} />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.empty}>لا توجد واجبات حالياً</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function AddAssignmentForm({ onAdd }: { onAdd: (title: string, description: string, dueDate?: string) => void }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [due, setDue] = useState('');

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', borderRadius: 6, border: '1px solid #ccc', fontSize: 14 };
  const btnStyle: React.CSSProperties = { padding: '10px 14px', background: '#000', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' };

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (title) { onAdd(title, desc, due || undefined); setTitle(''); setDesc(''); setDue(''); } }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ fontSize: 14 }}>عنوان الواجب</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="مثال: واجب الأسبوع 1" style={inputStyle} />

      <label style={{ fontSize: 14 }}>وصف (اختياري)</label>
      <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="تفاصيل الواجب" style={{ ...inputStyle, resize: 'vertical' }} />

      <label style={{ fontSize: 14 }}>تاريخ التسليم (اختياري)</label>
      <input type="date" value={due} onChange={(e) => setDue(e.target.value)} style={inputStyle} />

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" style={btnStyle}>أضف الواجب</button>
        <button type="button" onClick={() => { setTitle(''); setDesc(''); setDue(''); }} style={{ padding: '10px 14px', borderRadius: 6, border: '1px solid #ccc', background: 'white', cursor: 'pointer' }}>مسح</button>
      </div>
    </form>
  );
}

function ChoiceAnswer({ a, onComplete }: { a: any; onComplete: (ans: string) => Promise<boolean> }) {
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
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
        <button onClick={async () => { if (!selected) return alert('اختر إجابة'); setLoading(true); const ok = await onComplete(selected); setLoading(false); if (ok) { /* submitted */ } }} style={{ padding: '8px 12px' }} disabled={loading}>{loading ? 'جارٍ...' : 'أجب'}</button>
      </div>
    </div>
  );
}

function TFAnswer({ a, onComplete }: { a: any; onComplete: (ans: string) => Promise<boolean> }) {
  const [val, setVal] = useState('true');
  const [loading, setLoading] = useState(false);
  return (
    <div>
      <div>
        <label style={{ marginRight: 8 }}><input type="radio" name={`tf-${a.id}`} value="true" checked={val === 'true'} onChange={() => setVal('true')} /> صح</label>
        <label><input type="radio" name={`tf-${a.id}`} value="false" checked={val === 'false'} onChange={() => setVal('false')} /> خطأ</label>
      </div>
      <div style={{ marginTop: 8 }}>
        <button onClick={async () => { setLoading(true); const ok = await onComplete(val); setLoading(false); if (ok) { } }} style={{ padding: '8px 12px' }} disabled={loading}>{loading ? 'جارٍ...' : 'أجب'}</button>
      </div>
    </div>
  );
}

function EssayAnswer({ a, onComplete }: { a: any; onComplete: (ans: string) => Promise<boolean> }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} style={{ width: '100%', padding: 8 }} />
      <div style={{ marginTop: 8 }}>
        <button onClick={async () => { if (!text) return alert('أدخل إجابة'); setLoading(true); const ok = await onComplete(text); setLoading(false); if (ok) { } }} style={{ padding: '8px 12px' }} disabled={loading}>{loading ? 'جارٍ...' : 'أجب'}</button>
      </div>
    </div>
  );
}
