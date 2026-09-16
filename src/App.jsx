import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  serverTimestamp, 
  updateDoc, 
  doc, 
  increment,
  deleteDoc,
  onSnapshot 
} from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');

  const [confessions, setConfessions] = useState([]);
  const [newContent, setNewContent] = useState('');
  const [category, setCategory] = useState('Campus Life');
  const [loading, setLoading] = useState(false);
  
  const [commentInputs, setCommentInputs] = useState({});
  const [activeComments, setActiveComments] = useState({});
  const [commentLoading, setCommentLoading] = useState({});

  const [replyInputs, setReplyInputs] = useState({});
  const [activeReplyBox, setActiveReplyBox] = useState({});
  const [replyLoading, setReplyLoading] = useState({});

  const [userReactions, setUserReactions] = useState({});
  const [likedComments, setLikedComments] = useState({});
  const [myComments, setMyComments] = useState({});
  const [myConfessions, setMyConfessions] = useState({});

  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [logoClicks, setLogoClicks] = useState(0);

  const handleLogoClick = () => {
    const newCount = logoClicks + 1;
    setLogoClicks(newCount);
    if (newCount >= 3) {
      setShowLogin(prev => !prev);
      setLogoClicks(0);
    }
  };

  const getCategoryStyle = (cat) => {
    switch (cat) {
      case 'Crushes and Romances': return { bg: '#fff1f2', color: '#e11d48', border: '#fecdd3' };
      case 'Academic Gripes': return { bg: '#fef3c7', color: '#d97706', border: '#fde68a' };
      case 'Campus Life': return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
      case 'Mental Health': return { bg: '#eef2ff', color: '#4f46e5', border: '#c7d2fe' };
      default: return { bg: '#f8fafc', color: '#475569', border: '#cbd5e1' };
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'confessions'), orderBy('createdAt', 'desc'));
    
    const unsubscribeConfessions = onSnapshot(q, (snapshot) => {
      const confessionsData = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        comments: []
      }));

      setConfessions(confessionsData);
    }, (error) => {
      console.error("Ralat real-time confessions: ", error);
    });

    const savedUserReactions = JSON.parse(localStorage.getItem('userReactions') || '{}');
    setUserReactions(savedUserReactions);

    const savedCommentLikes = JSON.parse(localStorage.getItem('likedComments') || '{}');
    setLikedComments(savedCommentLikes);

    const savedMyComments = JSON.parse(localStorage.getItem('myComments') || '{}');
    setMyComments(savedMyComments);

    const savedMyConfessions = JSON.parse(localStorage.getItem('myConfessions') || '{}');
    setMyConfessions(savedMyConfessions);

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeConfessions();
    };
  }, []);

  useEffect(() => {
    if (confessions.length === 0) return;

    const unsubsComments = confessions.map(confession => {
      const commentsQuery = query(collection(db, 'confessions', confession.id, 'comments'), orderBy('createdAt', 'asc'));
      
      return onSnapshot(commentsQuery, (commentSnapshot) => {
        const commentsData = commentSnapshot.docs.map(cDoc => ({
          id: cDoc.id,
          ...cDoc.data(),
          replies: []
        }));

        setConfessions(prevConfessions => 
          prevConfessions.map(c => c.id === confession.id ? { ...c, comments: commentsData } : c)
        );
      });
    });

    return () => {
      unsubsComments.forEach(unsub => unsub());
    };
  }, [confessions.map(c => c.id).join(',')]);

  useEffect(() => {
    let allUnsubsReplies = [];

    confessions.forEach(confession => {
      if (confession.comments) {
        confession.comments.forEach(comment => {
          const repliesQuery = query(collection(db, 'confessions', confession.id, 'comments', comment.id, 'replies'), orderBy('createdAt', 'asc'));
          
          const unsubReply = onSnapshot(repliesQuery, (replySnapshot) => {
            const repliesData = replySnapshot.docs.map(rDoc => ({
              id: rDoc.id,
              ...rDoc.data()
            }));

            setConfessions(prevConfessions => 
              prevConfessions.map(c => {
                if (c.id === confession.id) {
                  const updatedComments = c.comments.map(cmt => {
                    if (cmt.id === comment.id) {
                      return { ...cmt, replies: repliesData };
                    }
                    return cmt;
                  });
                  return { ...c, comments: updatedComments };
                }
                return c;
              })
            );
          });

          allUnsubsReplies.push(unsubReply);
        });
      }
    });

    return () => {
      allUnsubsReplies.forEach(unsub => unsub());
    };
  }, [confessions.map(c => c.comments?.length).join('-')]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'confessions'), {
        content: newContent,
        category: category,
        reactions: { like: 0, haha: 0, laugh: 0, sad: 0, fire: 0 },
        createdAt: serverTimestamp()
      });

      const updatedMyConfessions = { ...myConfessions, [docRef.id]: true };
      setMyConfessions(updatedMyConfessions);
      localStorage.setItem('myConfessions', JSON.stringify(updatedMyConfessions));

      setNewContent('');
    } catch (error) {
      console.error("Ralat menghantar confession: ", error);
      alert("Gagal menghantar confession.");
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = async (id, reactionType) => {
    const currentReaction = userReactions[id];
    try {
      const confessionRef = doc(db, 'confessions', id);
      const updates = {};

      if (currentReaction === reactionType) {
        updates[`reactions.${reactionType}`] = increment(-1);
      } else {
        if (currentReaction) {
          updates[`reactions.${currentReaction}`] = increment(-1);
        }
        updates[`reactions.${reactionType}`] = increment(1);
      }

      await updateDoc(confessionRef, updates);

      const updatedUserReactions = { ...userReactions };
      if (currentReaction === reactionType) {
        delete updatedUserReactions[id];
      } else {
        updatedUserReactions[id] = reactionType;
      }

      setUserReactions(updatedUserReactions);
      localStorage.setItem('userReactions', JSON.stringify(updatedUserReactions));
    } catch (error) {
      console.error("Ralat kemas kini reaksi: ", error);
    }
  };

  const handleCommentLike = async (confessionId, commentId) => {
    const isAlreadyLiked = likedComments[commentId];
    try {
      const commentRef = doc(db, 'confessions', confessionId, 'comments', commentId);
      await updateDoc(commentRef, {
        likes: increment(isAlreadyLiked ? -1 : 1)
      });

      const updatedCommentLikes = { ...likedComments };
      if (isAlreadyLiked) {
        delete updatedCommentLikes[commentId];
      } else {
        updatedCommentLikes[commentId] = true;
      }

      setLikedComments(updatedCommentLikes);
      localStorage.setItem('likedComments', JSON.stringify(updatedCommentLikes));
    } catch (error) {
      console.error("Ralat kemas kini like komen: ", error);
    }
  };

  const handleCommentSubmit = async (confessionId, e) => {
    e.preventDefault();
    const commentText = commentInputs[confessionId] || '';
    if (!commentText.trim()) return;

    setCommentLoading({ ...commentLoading, [confessionId]: true });
    try {
      const docRef = await addDoc(collection(db, 'confessions', confessionId, 'comments'), {
        content: commentText,
        likes: 0,
        createdAt: serverTimestamp()
      });

      const updatedMyComments = { ...myComments, [docRef.id]: true };
      setMyComments(updatedMyComments);
      localStorage.setItem('myComments', JSON.stringify(updatedMyComments));

      setCommentInputs({ ...commentInputs, [confessionId]: '' });
    } catch (error) {
      console.error("Ralat menghantar komen: ", error);
      alert("Gagal menghantar komen.");
    } finally {
      setCommentLoading({ ...commentLoading, [confessionId]: false });
    }
  };

  const handleReplySubmit = async (confessionId, commentId, targetId, e) => {
    e.preventDefault();
    const replyText = replyInputs[targetId] || '';
    if (!replyText.trim()) return;

    setReplyLoading({ ...replyLoading, [targetId]: true });
    try {
      const docRef = await addDoc(collection(db, 'confessions', confessionId, 'comments', commentId, 'replies'), {
        content: replyText,
        createdAt: serverTimestamp()
      });

      const updatedMyComments = { ...myComments, [docRef.id]: true };
      setMyComments(updatedMyComments);
      localStorage.setItem('myComments', JSON.stringify(updatedMyComments));

      setReplyInputs({ ...replyInputs, [targetId]: '' });
      setActiveReplyBox({ ...activeReplyBox, [targetId]: false });
    } catch (error) {
      console.error("Ralat menghantar balasan: ", error);
      alert("Gagal menghantar balasan.");
    } finally {
      setReplyLoading({ ...replyLoading, [targetId]: false });
    }
  };

  const handleDeleteComment = async (confessionId, commentId) => {
    if (!window.confirm("Adakah anda pasti mahu memadam komen ini?")) return;

    try {
      await deleteDoc(doc(db, 'confessions', confessionId, 'comments', commentId));

      const updatedMyComments = { ...myComments };
      delete updatedMyComments[commentId];
      setMyComments(updatedMyComments);
      localStorage.setItem('myComments', JSON.stringify(updatedMyComments));
    } catch (error) {
      console.error("Ralat memadam komen: ", error);
    }
  };

  const handleDeleteReply = async (confessionId, commentId, replyId) => {
    if (!window.confirm("Adakah anda pasti mahu memadam balasan ini?")) return;

    try {
      await deleteDoc(doc(db, 'confessions', confessionId, 'comments', commentId, 'replies', replyId));

      const updatedMyComments = { ...myComments };
      delete updatedMyComments[replyId];
      setMyComments(updatedMyComments);
      localStorage.setItem('myComments', JSON.stringify(updatedMyComments));
    } catch (error) {
      console.error("Ralat memadam balasan: ", error);
    }
  };

  const handleDeleteConfession = async (id) => {
    if (!window.confirm("Adakah anda pasti mahu memadam confession ini?")) return;

    try {
      await deleteDoc(doc(db, 'confessions', id));

      const updatedMyConfessions = { ...myConfessions };
      delete updatedMyConfessions[id];
      setMyConfessions(updatedMyConfessions);
      localStorage.setItem('myConfessions', JSON.stringify(updatedMyConfessions));
    } catch (error) {
      console.error("Ralat memadam confession: ", error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setShowLogin(false);
      setEmail('');
      setPassword('');
      alert("Berjaya log masuk sebagai Admin!");
    } catch (error) {
      alert("Log masuk gagal. Sila semak emel & katalaluan.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    alert("Telah log keluar.");
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#fbf9f1', 
      color: '#0f172a', 
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      boxSizing: 'border-box'
    }}>
      
      {/* GLOBAL CSS STYLES UNTUK HOVER TRANSITION */}
      <style>{`
        .nav-button {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .nav-button:hover {
          transform: translateY(-2px);
          background-color: #cbd5e1 !important;
          color: #0f172a !important;
        }
        .nav-button-active:hover {
          transform: translateY(-2px);
          opacity: 0.95;
        }
        .nav-external:hover {
          transform: translateY(-2px);
          background-color: #f1f5f9 !important;
          border-color: #94a3b8 !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important;
        }
        .location-pill:hover {
          transform: translateY(-1px);
          border-color: #94a3b8 !important;
          background-color: #f8fafc !important;
        }
        /* Tambahan CSS untuk Butang Home Page */
        .home-primary-btn {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .home-primary-btn:hover {
          transform: translateY(-2px);
          background-color: #1e293b !important;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.3) !important;
        }
        .home-secondary-btn {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .home-secondary-btn:hover {
          transform: translateY(-2px);
          background-color: #f1f5f9 !important;
          border-color: #94a3b8 !important;
          box-shadow: 0 6px 16px rgba(0,0,0,0.06) !important;
        }
      `}</style>

      {/* NAVBAR DENGAN EFEK TRANSISI HOVER */}
      <nav style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '16px 24px', 
        backgroundColor: 'rgba(255, 255, 255, 0.9)', 
        backdropFilter: 'blur(12px)',
        borderBottom: '2px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 6px 25px rgba(11, 25, 44, 0.06)',
        gap: '15px',
        flexWrap: 'wrap'
      }}>
        {/* BAHAGIAN KIRI: LOGO & LOCATION PILL */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div 
            onClick={handleLogoClick}
            style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}
            title="Klik 3 kali untuk panel admin"
          >
            <div style={{ 
              height: '38px', 
              padding: '0 12px',
              borderRadius: '10px', 
              background: 'linear-gradient(135deg, #0b192c 0%, #1e3e62 100%)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#fbbf24', 
              fontWeight: '900', 
              fontSize: '14px',
              letterSpacing: '0.8px',
              boxShadow: '0 4px 10px rgba(11, 25, 44, 0.25)',
              border: '1.5px solid #fbbf24'
            }}>
              UMS
            </div>
            <span style={{ fontWeight: '900', fontSize: '15px', letterSpacing: '-0.3px', color: '#0f172a' }}>
               HUB <span style={{ color: '#e11d48' }}>CONFESSION</span>
            </span>
          </div>

          {/* LOCATION PILL DENGAN TRANSISI */}
          <div className="location-pill" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            padding: '6px 12px', 
            backgroundColor: '#ffffff', 
            border: '1.5px solid #cbd5e1', 
            borderRadius: '20px', 
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            fontSize: '12px',
            fontWeight: '800',
            color: '#0f172a',
            userSelect: 'none',
            transition: 'all 0.2s ease',
            cursor: 'default'
          }}>
            <span style={{ fontSize: '13px', lineHeight: 1 }}>📍</span>
            <span>Sabah</span>
            <span style={{ fontSize: '9px', color: '#64748b', marginLeft: '2px' }}>▼</span>
          </div>
        </div>

        {/* MENU TABS DENGAN EFEK TRANSISI HOVER */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          alignItems: 'center', 
          backgroundColor: '#e2e8f0', 
          padding: '5px', 
          borderRadius: '16px', 
          flexWrap: 'wrap',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)'
        }}>
          <button 
            onClick={() => setActiveTab('home')}
            className={activeTab === 'home' ? 'nav-button-active' : 'nav-button'}
            style={{ 
              background: activeTab === 'home' ? 'linear-gradient(135deg, #0b192c 0%, #1e3e62 100%)' : 'transparent', 
              border: 'none', 
              cursor: 'pointer', 
              fontWeight: '800', 
              fontSize: '13px', 
              color: activeTab === 'home' ? '#fbbf24' : '#475569',
              padding: '8px 18px', 
              borderRadius: '12px',
              boxShadow: activeTab === 'home' ? '0 4px 12px rgba(11, 25, 44, 0.25)' : 'none',
              letterSpacing: '0.3px'
            }}
          >
            🏠 Home
          </button>

          <button 
            onClick={() => setActiveTab('confession')}
            className={activeTab === 'confession' ? 'nav-button-active' : 'nav-button'}
            style={{ 
              background: activeTab === 'confession' ? 'linear-gradient(135deg, #0b192c 0%, #1e3e62 100%)' : 'transparent', 
              border: 'none', 
              cursor: 'pointer', 
              fontWeight: '800', 
              fontSize: '13px', 
              color: activeTab === 'confession' ? '#fbbf24' : '#475569',
              padding: '8px 18px', 
              borderRadius: '12px',
              boxShadow: activeTab === 'confession' ? '0 4px 12px rgba(11, 25, 44, 0.25)' : 'none',
              letterSpacing: '0.3px'
            }}
          >
            💬 Confession
          </button>

          <a 
            href="https://ehailingumsapp.netlify.app" 
            target="_blank" 
            rel="noopener noreferrer"
            className="nav-external"
            style={{ 
              textDecoration: 'none', 
              fontWeight: '800', 
              fontSize: '13px', 
              color: '#0f172a',
              backgroundColor: '#ffffff',
              padding: '8px 18px', 
              borderRadius: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              border: '1px solid #cbd5e1',
              letterSpacing: '0.3px',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            🚗 E-Hailing <span style={{ fontSize: '11px', color: '#e11d48' }}>↗</span>
          </a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
          {isAdmin && (
            <button onClick={handleLogout} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '6px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
              Keluar
            </button>
          )}
        </div>
      </nav>

      {showLogin && (
        <div style={{ maxWidth: '400px', margin: '20px auto', padding: '15px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>Log Masuk Admin (Hidden)</span>
            <input type="email" placeholder="Emel" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff', color: '#0f172a' }} />
            <input type="password" placeholder="Katalaluan" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff', color: '#0f172a' }} />
            <button type="submit" style={{ backgroundColor: '#0f172a', color: '#ffffff', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Masuk</button>
          </form>
        </div>
      )}

      {/* HOME LANDING PAGE */}
      {activeTab === 'home' ? (
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 16px', textAlign: 'center', boxSizing: 'border-box' }}>
          <div style={{ 
            backgroundColor: '#ffffff', 
            padding: '40px 24px', 
            borderRadius: '28px', 
            border: 'none', 
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.06)' 
          }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '20px', 
              backgroundColor: '#fef2f2', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '28px', 
              margin: '0 auto 16px auto',
              boxShadow: '0 8px 16px rgba(225, 29, 72, 0.08)'
            }}>
              🎓
            </div>
            
            <h1 style={{ 
              fontSize: '26px', 
              fontWeight: '900', 
              margin: '0 0 12px 0', 
              color: '#0f172a', 
              letterSpacing: '-0.5px',
              lineHeight: '1.3' 
            }}>
              Selamat Datang ke <br />
              <span style={{ color: '#e11d48', fontSize: '30px' }}>UMS HUB</span>
            </h1>

            <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.7', maxWidth: '500px', margin: '0 auto 25px auto', fontWeight: '500' }}>
              Gerbang digital eksklusif warga Universiti Malaysia Sabah.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* BUTANG JELAJAH CONFESSION DENGAN HOVER TRANSITION */}
              <button 
                onClick={() => setActiveTab('confession')}
                className="home-primary-btn"
                style={{ 
                  backgroundColor: '#0f172a', 
                  color: '#ffffff', 
                  border: 'none', 
                  padding: '12px 24px', 
                  borderRadius: '14px', 
                  fontWeight: '700', 
                  fontSize: '13px', 
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px rgba(15, 23, 42, 0.2)'
                }}
              >
                Jelajah Confession 💬
              </button>

              {/* PAUTAN E-HAILING UMS DENGAN HOVER TRANSITION */}
              <a 
                href="https://ehailingumsapp.netlify.app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="home-secondary-btn"
                style={{ 
                  backgroundColor: '#f8fafc', 
                  color: '#0f172a', 
                  border: '1px solid #e2e8f0', 
                  padding: '12px 24px', 
                  borderRadius: '14px', 
                  fontWeight: '700', 
                  fontSize: '13px', 
                  cursor: 'pointer', 
                  textDecoration: 'none', 
                  display: 'inline-block' 
                }}
              >
                E-Hailing UMS 🚗
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '30px 16px', boxSizing: 'border-box' }}>
          
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: '900', margin: '0 0 4px 0', letterSpacing: '-0.5px', color: '#0f172a' }}>Students Confessions</h2>
            <p style={{ color: '#334155', fontSize: '13px', margin: 0, fontWeight: '600' }}>UMS Sabah • Share, connect, explore safely</p>
          </div>

          <form onSubmit={handleSubmit} style={{ backgroundColor: '#ffffff', padding: '14px 18px', borderRadius: '16px', marginBottom: '25px', border: '2px solid #0f172a', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Pilih kategori luahan anda:</span>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#f8fafc', fontWeight: '700', color: '#0f172a' }}
              >
                <option value="Campus Life">Campus Life</option>
                <option value="Crushes and Romances">Crushes and Romances</option>
                <option value="Academic Gripes">Academic Gripes</option>
                <option value="Mental Health">Mental Health</option>
              </select>
            </div>

            <textarea 
              rows="2" 
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="What's on your mind? Share your confession..." 
              style={{ width: '100%', padding: '8px 0', border: 'none', borderBottom: '1px solid #f1f5f9', outline: 'none', resize: 'vertical', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit', backgroundColor: '#ffffff', color: '#0f172a' }}
              required
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button 
                type="submit" 
                disabled={loading}
                style={{ backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '20px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}
              >
                {loading ? 'Posting...' : 'Post Confession'}
              </button>
            </div>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {confessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <p style={{ color: '#475569', fontSize: '14px', margin: 0, fontWeight: '600' }}>Belum ada confession lagi. Jadilah yang pertama!</p>
              </div>
            ) : (
              confessions.map((item) => {
                const badge = getCategoryStyle(item.category);
                const isCommentsOpen = activeComments[item.id];
                const isSubmittingComment = commentLoading[item.id];
                const currentReaction = userReactions[item.id];
                const isMyPost = myConfessions[item.id];
                const reactions = item.reactions || { like: 0, haha: 0, laugh: 0, sad: 0, fire: 0 };

                return (
                  <div key={item.id} style={{ 
                    backgroundColor: '#ffffff', border: '2px solid #0f172a', borderRadius: '16px', padding: '18px', 
                    boxShadow: '0 4px 6px rgba(0,0,0,0.02)', position: 'relative', overflow: 'hidden', boxSizing: 'border-box'
                  }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                          👻
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>Anonymous</span>
                            {isMyPost && (
                              <span style={{ fontSize: '10px', backgroundColor: '#eef2ff', color: '#4f46e5', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>Anda</span>
                            )}
                          </div>
                          <span style={{ fontSize: '11px', color: '#475569', fontWeight: '600' }}>
                            {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' }) : 'Baru saja'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, padding: '3px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' }}>
                          {item.category || 'Campus Life'}
                        </span>
                        {(isMyPost || isAdmin) && (
                          <button 
                            onClick={() => handleDeleteConfession(item.id)}
                            style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            Padam
                          </button>
                        )}
                      </div>
                    </div>

                    <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#0f172a', lineHeight: '1.6', fontSize: '14px', marginBottom: '16px', marginTop: 0, fontWeight: '500' }}>
                      {item.content}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {[
                          { type: 'like', emoji: '👍' },
                          { type: 'haha', emoji: '😂' },
                          { type: 'laugh', emoji: '🤣' },
                          { type: 'sad', emoji: '😢' },
                          { type: 'fire', emoji: '🔥' }
                        ].map((r) => {
                          const isSelected = currentReaction === r.type;
                          return (
                            <button
                              key={r.type}
                              onClick={() => handleReaction(item.id, r.type)}
                              style={{
                                background: isSelected ? '#e2e8f0' : '#f8fafc',
                                border: isSelected ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
                                borderRadius: '20px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: '#0f172a',
                                transition: 'all 0.1s ease'
                              }}
                            >
                              <span>{r.emoji}</span>
                              <span style={{ fontSize: '11px' }}>{reactions[r.type] || 0}</span>
                            </button>
                          );
                        })}
                      </div>

                      <button 
                        onClick={() => setActiveComments({ ...activeComments, [item.id]: !isCommentsOpen })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0f172a', fontWeight: '700', fontSize: '13px' }}
                      >
                        💬 Comment ({item.comments?.length || 0})
                      </button>
                    </div>

                    {isCommentsOpen && (
                      <div style={{ marginTop: '14px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
                        <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {item.comments && item.comments.length > 0 ? (
                            item.comments.map((cmt) => {
                              const isMyComment = myComments[cmt.id];
                              const hasLikedComment = likedComments[cmt.id];
                              const isReplyingOpen = activeReplyBox[cmt.id];
                              const isSubmittingReply = replyLoading[cmt.id];

                              return (
                                <div key={cmt.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
                                  
                                  <div style={{ 
                                    backgroundColor: isMyComment ? '#eef2ff' : '#ffffff', 
                                    border: isMyComment ? '1px solid #c7d2fe' : '1px solid #e2e8f0',
                                    padding: '8px 12px', borderRadius: '12px', fontSize: '13px', boxSizing: 'border-box'
                                  }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', gap: '10px' }}>
                                      <span style={{ fontSize: '10px', fontWeight: '800', color: isMyComment ? '#4f46e5' : '#0f172a' }}>
                                        {isMyComment ? '👤 Anda' : '👻 Anonymous'}
                                      </span>
                                      {(isMyComment || isAdmin) && (
                                        <button 
                                          onClick={() => handleDeleteComment(item.id, cmt.id)}
                                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '9px', fontWeight: '600', padding: 0 }}
                                        >
                                          Padam
                                        </button>
                                      )}
                                    </div>
                                    <p style={{ margin: '0 0 6px 0', wordBreak: 'break-word', color: '#0f172a', lineHeight: '1.4', fontWeight: '500' }}>{cmt.content}</p>
                                    
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '11px', marginTop: '4px' }}>
                                      <button 
                                        onClick={() => handleCommentLike(item.id, cmt.id)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700', color: hasLikedComment ? '#e11d48' : '#475569', padding: 0 }}
                                      >
                                        {hasLikedComment ? '❤️' : '🤍'} {cmt.likes || 0}
                                      </button>
                                      <button 
                                        onClick={() => setActiveReplyBox({ ...activeReplyBox, [cmt.id]: !isReplyingOpen })}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700', color: '#4f46e5', padding: 0 }}
                                      >
                                        Reply
                                      </button>
                                    </div>
                                  </div>

                                  {isReplyingOpen && (
                                    <form onSubmit={(e) => handleReplySubmit(item.id, cmt.id, cmt.id, e)} style={{ display: 'flex', gap: '6px', paddingLeft: '20px', marginTop: '4px' }}>
                                      <input 
                                        type="text" 
                                        value={replyInputs[cmt.id] || ''}
                                        onChange={(e) => setReplyInputs({ ...replyInputs, [cmt.id]: e.target.value })}
                                        placeholder="Write a reply..." 
                                        style={{ flex: 1, padding: '6px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', backgroundColor: '#ffffff', color: '#0f172a', boxSizing: 'border-box' }}
                                      />
                                      <button 
                                        type="submit" 
                                        disabled={isSubmittingReply}
                                        style={{ backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}
                                      >
                                        {isSubmittingReply ? '...' : 'Send'}
                                      </button>
                                    </form>
                                  )}

                                  {cmt.replies && cmt.replies.length > 0 && (
                                    <div style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      {cmt.replies.map((rep) => {
                                        const isMyReply = myComments[rep.id];
                                        const isReplyBoxOpenForRep = activeReplyBox[rep.id];
                                        const isSubmittingRepReply = replyLoading[rep.id];

                                        return (
                                          <div key={rep.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div style={{ backgroundColor: isMyReply ? '#eef2ff' : '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '10px', fontSize: '12px' }}>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                                <span style={{ fontSize: '9px', fontWeight: '800', color: isMyReply ? '#4f46e5' : '#0f172a' }}>
                                                  {isMyReply ? '👤 Anda' : '👻 Anonymous'}
                                                </span>
                                                {(isMyReply || isAdmin) && (
                                                  <button 
                                                    onClick={() => handleDeleteReply(item.id, cmt.id, rep.id)}
                                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '9px', fontWeight: '600', padding: 0 }}
                                                  >
                                                    Padam
                                                  </button>
                                                )}
                                              </div>
                                              <p style={{ margin: '0 0 4px 0', wordBreak: 'break-word', color: '#0f172a', fontWeight: '500' }}>{rep.content}</p>
                                              
                                              <div style={{ display: 'flex', alignItems: 'center', fontSize: '10px' }}>
                                                <button 
                                                  onClick={() => setActiveReplyBox({ ...activeReplyBox, [rep.id]: !isReplyBoxOpenForRep })}
                                                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700', color: '#4f46e5', padding: 0 }}
                                                >
                                                  Reply
                                                </button>
                                              </div>
                                            </div>

                                            {isReplyBoxOpenForRep && (
                                              <form onSubmit={(e) => handleReplySubmit(item.id, cmt.id, rep.id, e)} style={{ display: 'flex', gap: '6px', paddingLeft: '15px', marginTop: '2px' }}>
                                                <input 
                                                  type="text" 
                                                  value={replyInputs[rep.id] || ''}
                                                  onChange={(e) => setReplyInputs({ ...replyInputs, [rep.id]: e.target.value })}
                                                  placeholder="Write a reply..." 
                                                  style={{ flex: 1, padding: '5px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', outline: 'none', backgroundColor: '#ffffff', color: '#0f172a', boxSizing: 'border-box' }}
                                                />
                                                <button 
                                                  type="submit" 
                                                  disabled={isSubmittingRepReply}
                                                  style={{ backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '5px 8px', borderRadius: '8px', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}
                                                >
                                                  {isSubmittingRepReply ? '...' : 'Send'}
                                                </button>
                                              </form>
                                            )}

                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                </div>
                              );
                            })
                          ) : (
                            <p style={{ fontSize: '12px', color: '#475569', textAlign: 'center', margin: '4px 0', fontWeight: '600' }}>Belum ada komen lagi.</p>
                          )}
                        </div>

                        <form onSubmit={(e) => handleCommentSubmit(item.id, e)} style={{ display: 'flex', gap: '6px' }}>
                          <input 
                            type="text" 
                            value={commentInputs[item.id] || ''}
                            onChange={(e) => setCommentInputs({ ...commentInputs, [item.id]: e.target.value })}
                            placeholder="Write a comment as Anonymous..." 
                            style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', backgroundColor: '#ffffff', color: '#0f172a', boxSizing: 'border-box' }}
                          />
                          <button 
                            type="submit" 
                            disabled={isSubmittingComment}
                            style={{ backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}
                          >
                            {isSubmittingComment ? '...' : 'Reply'}
                          </button>
                        </form>
                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

    </div>
  );
}