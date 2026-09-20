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
  onSnapshot,
  where 
} from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');

  const [confessions, setConfessions] = useState([]);
  const [pendingConfessions, setPendingConfessions] = useState([]);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [newContent, setNewContent] = useState('');
  const [category, setCategory] = useState('Campus Life');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
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
  const [myProducts, setMyProducts] = useState({});

  // State untuk Marketplace
  const [products, setProducts] = useState([]);
  const [productTitle, setProductTitle] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productCategory, setProductCategory] = useState('Makanan');
  const [productWhatsapp, setProductWhatsapp] = useState('');
  const [productImageFile, setProductImageFile] = useState(null);
  const [productImagePreview, setProductImagePreview] = useState(null);
  const [productLoading, setProductLoading] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [logoClicks, setLogoClicks] = useState(0);
  const [totalConfessionsCount, setTotalConfessionsCount] = useState(0);
  
  const [isScrolled, setIsScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogoClick = () => {
    const newCount = logoClicks + 1;
    setLogoClicks(newCount);
    if (newCount >= 3) {
      setShowLogin(prev => !prev);
      setLogoClicks(0);
    }
  };

  // Fungsi untuk membersihkan dan memformat nombor telefon ke format standard WhatsApp (601...)
  const formatWhatsappNumber = (number) => {
    if (!number) return '';
    // Buang semua karakter selain nombor (cth: +, -, jarak)
    let cleaned = number.replace(/\D/g, '');

    // Jika bermula dengan '0' (cth: 0123456789), tukar kepada '60123456789'
    if (cleaned.startsWith('0')) {
      cleaned = '6' + cleaned;
    }
    // Jika pengguna masukkan terus nombor tanpa 6 atau 0 di depan (cth: 123456789 dan panjang munasabah)
    else if (!cleaned.startsWith('60') && cleaned.length >= 9 && cleaned.length <= 10) {
      cleaned = '60' + cleaned;
    }

    return cleaned;
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1048576) {
        alert("Saiz fail terlalu besar. Sila pilih gambar di bawah 1MB.");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProductImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1048576) {
        alert("Saiz fail produk terlalu besar. Sila pilih gambar di bawah 1MB.");
        return;
      }
      setProductImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, 'confessions'), 
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribeConfessions = onSnapshot(q, (snapshot) => {
      const confessionsData = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        comments: []
      }));

      setConfessions(confessionsData);
      setTotalConfessionsCount(snapshot.size);
    }, (error) => {
      console.error("Ralat real-time confessions: ", error);
    });

    const qProducts = query(
      collection(db, 'products'),
      where('status', 'in', ['available', 'sold']),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      const productsData = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setProducts(productsData);
    }, (error) => {
      console.error("Ralat real-time products: ", error);
    });

    const savedUserReactions = JSON.parse(localStorage.getItem('userReactions') || '{}');
    setUserReactions(savedUserReactions);

    const savedCommentLikes = JSON.parse(localStorage.getItem('likedComments') || '{}');
    setLikedComments(savedCommentLikes);

    const savedMyComments = JSON.parse(localStorage.getItem('myComments') || '{}');
    setMyComments(savedMyComments);

    const savedMyConfessions = JSON.parse(localStorage.getItem('myConfessions') || '{}');
    setMyConfessions(savedMyConfessions);

    const savedMyProducts = JSON.parse(localStorage.getItem('myProducts') || '{}');
    setMyProducts(savedMyProducts);

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
      unsubscribeProducts();
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setPendingConfessions([]);
      setPendingProducts([]);
      return;
    }

    const qPending = query(
      collection(db, 'confessions'), 
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubPending = onSnapshot(qPending, (snapshot) => {
      const pendingData = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setPendingConfessions(pendingData);
    }, (error) => {
      console.error("Ralat pending confessions: ", error);
    });

    const qPendingProducts = query(
      collection(db, 'products'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubPendingProducts = onSnapshot(qPendingProducts, (snapshot) => {
      const pendingProdData = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setPendingProducts(pendingProdData);
    }, (error) => {
      console.error("Ralat pending products: ", error);
    });

    return () => {
      unsubPending();
      unsubPendingProducts();
    };
  }, [isAdmin]);

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
    if (!newContent.trim() && !imagePreview) return;

    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'confessions'), {
        content: newContent,
        category: category,
        imageUrl: imagePreview || null, 
        reactions: { like: 0, haha: 0, laugh: 0, sad: 0, fire: 0 },
        status: 'pending',
        createdAt: serverTimestamp()
      });

      const updatedMyConfessions = { ...myConfessions, [docRef.id]: true };
      setMyConfessions(updatedMyConfessions);
      localStorage.setItem('myConfessions', JSON.stringify(updatedMyConfessions));

      setNewContent('');
      setImageFile(null);
      setImagePreview(null);
      alert("Confession berjaya dihantar! Ia akan dipaparkan setelah diluluskan oleh Admin.");
    } catch (error) {
      console.error("Ralat menghantar confession: ", error);
      alert("Gagal menghantar confession.");
    } finally {
      setLoading(false);
    }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!productTitle.trim() || !productPrice.trim() || !productWhatsapp.trim()) {
      alert("Sila lengkapkan nama produk, harga, dan nombor WhatsApp.");
      return;
    }

    setProductLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'products'), {
        title: productTitle,
        price: productPrice,
        category: productCategory,
        whatsapp: productWhatsapp,
        imageUrl: productImagePreview || null,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      const updatedMyProducts = { ...myProducts, [docRef.id]: true };
      setMyProducts(updatedMyProducts);
      localStorage.setItem('myProducts', JSON.stringify(updatedMyProducts));

      setProductTitle('');
      setProductPrice('');
      setProductWhatsapp('');
      setProductImageFile(null);
      setProductImagePreview(null);
      alert("Iklan produk berjaya dihantar! Ia akan dipaparkan setelah diluluskan oleh Admin.");
    } catch (error) {
      console.error("Ralat menghantar produk: ", error);
      alert("Gagal menghantar iklan produk.");
    } finally {
      setProductLoading(false);
    }
  };

  const handleToggleProductStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'sold' ? 'available' : 'sold';
    try {
      const productRef = doc(db, 'products', id);
      await updateDoc(productRef, { status: newStatus });
    } catch (error) {
      console.error("Ralat menukar status produk:", error);
      alert("Gagal menukar status produk.");
    }
  };

  const handleApproveConfession = async (id) => {
    try {
      const confessionRef = doc(db, 'confessions', id);
      await updateDoc(confessionRef, { status: 'approved' });
      alert("Confession telah diluluskan dan kini dipaparkan di feed.");
    } catch (error) {
      console.error("Ralat meluluskan confession:", error);
      alert("Gagal meluluskan confession.");
    }
  };

  const handleApproveProduct = async (id) => {
    try {
      const productRef = doc(db, 'products', id);
      await updateDoc(productRef, { status: 'available' });
      alert("Produk telah diluluskan dan kini disiarkan di Marketplace.");
    } catch (error) {
      console.error("Ralat meluluskan produk:", error);
      alert("Gagal meluluskan produk.");
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Adakah anda pasti mahu memadam produk ini?")) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      alert("Produk berjaya dipadam.");
    } catch (error) {
      console.error("Ralat memadam produk:", error);
      alert("Gagal memadam produk.");
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
    setActiveTab('home');
    alert("Telah log keluar.");
  };

  const totalPendingCount = pendingConfessions.length + pendingProducts.length;

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#fbf9f1', 
      color: '#0f172a', 
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      boxSizing: 'border-box',
      scrollBehavior: 'smooth'
    }}>
      
      <style>{`
        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .fade-in-card {
          animation: fadeInSlide 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .nav-button {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          background-color: transparent;
          flex: 1 1 0% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
        }
        .nav-button:hover {
          transform: translateY(-2px);
          background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%) !important;
          color: #15803d !important;
          box-shadow: 0 6px 16px rgba(22, 163, 74, 0.15) !important;
          border-color: transparent !important;
        }

        .nav-button-active {
          background-color: transparent !important;
          color: #0f172a !important;
          font-weight: 900 !important;
          border: none !important;
          box-shadow: none !important;
          flex: 1 1 0% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
        }
        .nav-button-active:hover {
          transform: translateY(-2px);
          background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%) !important;
          color: #15803d !important;
        }

        .location-pill:hover {
          transform: translateY(-1px);
          border-color: #16a34a !important;
          background-color: #f0fdf4 !important;
          color: #15803d !important;
          box-shadow: 0 4px 12px rgba(22, 163, 74, 0.15) !important;
        }
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
        .quick-link-card:hover {
          transform: translateY(-2px);
          border-color: #0f172a !important;
          box-shadow: 0 6px 16px rgba(0,0,0,0.06) !important;
        }
        .scroll-top-btn {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .scroll-top-btn:hover {
          transform: translateY(-3px) scale(1.05);
          background-color: #1e293b !important;
          box-shadow: 0 10px 20px rgba(0,0,0,0.2) !important;
        }
      `}</style>

      {/* NAVBAR */}
      <nav style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: isScrolled ? '8px 16px' : '12px 16px', 
        backgroundColor: isScrolled ? 'rgba(255, 255, 255, 0.98)' : 'rgba(255, 255, 255, 0.95)', 
        backdropFilter: 'blur(12px)',
        borderBottom: '2px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: isScrolled ? '0 10px 25px rgba(11, 25, 44, 0.1)' : '0 4px 20px rgba(11, 25, 44, 0.05)',
        gap: '10px',
        flexWrap: 'wrap',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '100%' }}>
          <div 
            onClick={handleLogoClick}
            style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
            title="Klik 3 kali untuk panel admin"
          >
            <img 
              src="logo.png" 
              alt="Logo UMS" 
              style={{ height: '34px', maxHeight: '34px', objectFit: 'contain', borderRadius: '6px' }} 
            />
            <span style={{ fontWeight: '900', fontSize: '14px', letterSpacing: '-0.3px', color: '#0f172a' }}>
               CONFESSION <span style={{ color: '#e11d48' }}>HUB</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div 
              onClick={() => window.open('https://www.google.com/search?q=sabah+malaysia', '_blank')}
              className="location-pill" 
              style={{ 
                display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', backgroundColor: '#ffffff', 
                border: '1.5px solid #cbd5e1', borderRadius: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                fontSize: '11px', fontWeight: '800', color: '#0f172a', userSelect: 'none', transition: 'all 0.2s ease', cursor: 'pointer'
              }}
              title="Klik untuk info lanjut mengenai Sabah, Malaysia"
            >
              <span style={{ fontSize: '12px', lineHeight: 1 }}>📍</span>
              <span>Sabah, Malaysia</span>
            </div>

            {isAdmin && (
              <button onClick={handleLogout} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '5px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                Keluar
              </button>
            )}
          </div>
        </div>

        <div style={{ 
          display: 'flex', gap: '6px', alignItems: 'center', backgroundColor: '#e2e8f0', padding: '4px', 
          borderRadius: '14px', width: '100%', justifyContent: 'space-between', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)'
        }}>
          <button 
            onClick={() => setActiveTab('home')}
            className={activeTab === 'home' ? 'nav-button-active' : 'nav-button'}
            style={{ 
              flex: '1 1 0%', minWidth: '0', border: 'none', cursor: 'pointer', fontWeight: '800', fontSize: '12px', color: '#0f172a',
              padding: '8px 10px', borderRadius: '10px', textAlign: 'center', backgroundColor: 'transparent', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', boxSizing: 'border-box'
            }}
          >
            🏠 Home
          </button>

          <button 
            onClick={() => setActiveTab('confession')}
            className={activeTab === 'confession' ? 'nav-button-active' : 'nav-button'}
            style={{ 
              flex: '1 1 0%', minWidth: '0', border: 'none', cursor: 'pointer', fontWeight: '800', fontSize: '12px', color: '#0f172a',
              padding: '8px 10px', borderRadius: '10px', textAlign: 'center', backgroundColor: 'transparent', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', boxSizing: 'border-box'
            }}
          >
            💬 Confession
          </button>

          <button 
            onClick={() => setActiveTab('marketplace')}
            className={activeTab === 'marketplace' ? 'nav-button-active' : 'nav-button'}
            style={{ 
              flex: '1 1 0%', minWidth: '0', border: 'none', cursor: 'pointer', fontWeight: '800', fontSize: '12px', color: '#0f172a',
              padding: '8px 10px', borderRadius: '10px', textAlign: 'center', backgroundColor: 'transparent', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', boxSizing: 'border-box'
            }}
          >
            🛍️ Marketplace
          </button>

          {isAdmin && (
            <button 
              onClick={() => setActiveTab('admin')}
              className={activeTab === 'admin' ? 'nav-button-active' : 'nav-button'}
              style={{ 
                flex: '1 1 0%', minWidth: '0', border: 'none', cursor: 'pointer', fontWeight: '800', fontSize: '12px', color: '#0f172a',
                padding: '8px 10px', borderRadius: '10px', textAlign: 'center', backgroundColor: 'transparent', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', boxSizing: 'border-box'
              }}
            >
              🛡️ Admin {totalPendingCount > 0 && `(${totalPendingCount})`}
            </button>
          )}

          <button 
            onClick={() => window.open('https://ehailingumsapp.netlify.app', '_blank')}
            className="nav-button"
            style={{ 
              flex: '1 1 0%', minWidth: '0', border: 'none', cursor: 'pointer', fontWeight: '800', fontSize: '12px', color: '#0f172a',
              padding: '8px 10px', borderRadius: '10px', textAlign: 'center', backgroundColor: 'transparent', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', boxSizing: 'border-box'
            }}
          >
            🚗 E-Hailing <span style={{ fontSize: '10px', color: '#e11d48' }}>↗</span>
          </button>
        </div>
      </nav>

      {showLogin && (
        <div style={{ maxWidth: '400px', margin: '20px auto', padding: '15px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>Log Masuk Admin</span>
            <input type="email" id="adminEmail" name="email" placeholder="Emel" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff', color: '#0f172a' }} />
            <input type="password" id="adminPassword" name="password" placeholder="Katalaluan" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff', color: '#0f172a' }} />
            <button type="submit" style={{ backgroundColor: '#0f172a', color: '#ffffff', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Masuk</button>
          </form>
        </div>
      )}

      {/* PANEL ADMIN: MELULUSKAN CONFESSION & PRODUK MARKETPLACE */}
      {activeTab === 'admin' && isAdmin ? (
        <div className="fade-in-card" style={{ maxWidth: '720px', margin: '0 auto', padding: '30px 16px', boxSizing: 'border-box' }}>
          <div style={{ marginBottom: '25px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: '900', margin: '0 0 4px 0', color: '#0f172a' }}>🛡️ Panel Kelulusan Admin</h2>
            <p style={{ color: '#334155', fontSize: '13px', margin: 0, fontWeight: '600' }}>Semak dan luluskan hantaran confession serta iklan produk marketplace.</p>
          </div>

          {/* SECTION 1: PENDING CONFESSIONS */}
          <div style={{ marginBottom: '35px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
              💬 Confession Menunggu Kelulusan ({pendingConfessions.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {pendingConfessions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '25px', backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <p style={{ color: '#475569', fontSize: '13px', margin: 0, fontWeight: '600' }}>Tiada confession baharu.</p>
                </div>
              ) : (
                pendingConfessions.map((item) => {
                  const badge = getCategoryStyle(item.category);
                  return (
                    <div key={item.id} style={{ 
                      backgroundColor: '#ffffff', border: '2px solid #e11d48', borderRadius: '16px', padding: '18px', 
                      boxShadow: '0 4px 6px rgba(0,0,0,0.02)', position: 'relative', boxSizing: 'border-box'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, padding: '3px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' }}>
                          {item.category || 'Campus Life'}
                        </span>
                        <span style={{ fontSize: '11px', color: '#475569', fontWeight: '600' }}>
                          {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Baru saja'}
                        </span>
                      </div>

                      <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#0f172a', lineHeight: '1.6', fontSize: '14px', marginBottom: item.imageUrl ? '12px' : '16px', marginTop: 0, fontWeight: '500' }}>
                        {item.content}
                      </p>

                      {item.imageUrl && (
                        <div style={{ marginBottom: '16px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', textAlign: 'center' }}>
                          <img src={item.imageUrl} alt="Pending attachment" style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block', margin: '0 auto' }} />
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                        <button 
                          onClick={() => handleDeleteConfession(item.id)}
                          style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          Tolak / Padam
                        </button>
                        <button 
                          onClick={() => handleApproveConfession(item.id)}
                          style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          ✅ Luluskan (Publish)
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* SECTION 2: PENDING PRODUCTS (MARKETPLACE) */}
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
              🛍️ Iklan Marketplace Menunggu Kelulusan ({pendingProducts.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {pendingProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '25px', backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <p style={{ color: '#475569', fontSize: '13px', margin: 0, fontWeight: '600' }}>Tiada iklan produk baharu.</p>
                </div>
              ) : (
                pendingProducts.map((prod) => (
                  <div key={prod.id} style={{ 
                    backgroundColor: '#ffffff', border: '2px solid #16a34a', borderRadius: '16px', padding: '18px', 
                    boxShadow: '0 4px 6px rgba(0,0,0,0.02)', position: 'relative', boxSizing: 'border-box'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '3px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' }}>
                        {prod.category || 'Produk'}
                      </span>
                      <span style={{ fontSize: '11px', color: '#475569', fontWeight: '600' }}>
                        WhatsApp: {prod.whatsapp}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
                      {prod.imageUrl && (
                        <div style={{ width: '100px', height: '100px', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#f1f5f9', flexShrink: 0 }}>
                          <img src={prod.imageUrl} alt={prod.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                      )}
                      <div>
                        <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>{prod.title}</h4>
                        <p style={{ fontSize: '15px', fontWeight: '900', color: '#e11d48', margin: 0 }}>{prod.price}</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                      <button 
                        onClick={() => handleDeleteProduct(prod.id)}
                        style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Tolak / Padam
                      </button>
                      <button 
                        onClick={() => handleApproveProduct(prod.id)}
                        style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        ✅ Luluskan Iklan
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      ) : activeTab === 'home' ? (
        /* HOME PAGE */
        <div className="fade-in-card" style={{ maxWidth: '720px', margin: '0 auto', padding: '30px 16px', boxSizing: 'border-box' }}>
          
          <div style={{ 
            backgroundColor: '#ffffff', padding: '40px 24px', borderRadius: '28px', textAlign: 'center',
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.06)', marginBottom: '30px'
          }}>
            <div style={{ 
              width: '64px', height: '64px', borderRadius: '20px', backgroundColor: '#fef2f2', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 16px auto',
              boxShadow: '0 8px 16px rgba(225, 29, 72, 0.08)'
            }}>
              🎓
            </div>
            
            <h1 style={{ fontSize: '26px', fontWeight: '900', margin: '0 0 12px 0', color: '#0f172a', letterSpacing: '-0.5px', lineHeight: '1.3' }}>
              Selamat Datang ke <br />
              <span style={{ color: '#e11d48', fontSize: '30px' }}>UMS HUB</span>
            </h1>

            <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.7', maxWidth: '500px', margin: '0 auto 25px auto', fontWeight: '500' }}>
              Gerbang digital eksklusif warga Universiti Malaysia Sabah. 
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setActiveTab('confession')}
                className="home-primary-btn"
                style={{ backgroundColor: '#0f172a', color: '#ffffff', border: 'none', padding: '12px 24px', borderRadius: '14px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', boxShadow: '0 8px 20px rgba(15, 23, 42, 0.2)' }}
              >
                 Confession 💬
              </button>

              <button 
                onClick={() => setActiveTab('marketplace')}
                className="home-secondary-btn"
                style={{ backgroundColor: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0', padding: '12px 24px', borderRadius: '14px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
              >
                Marketplace 🛍️
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '30px' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '24px', fontWeight: '900', color: '#e11d48', display: 'block', marginBottom: '4px' }}>{totalConfessionsCount}</span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>Confession Disiarkan</span>
            </div>
            <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '24px', fontWeight: '900', color: '#16a34a', display: 'block', marginBottom: '4px' }}>UMS Sabah</span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>Komuniti Kampus Utama</span>
            </div>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: 0 }}>🔥 Confession Terkini</h3>
              <button onClick={() => setActiveTab('confession')} style={{ background: 'none', border: 'none', color: '#e11d48', fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}>
                Lihat Semua →
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {confessions.slice(0, 3).length === 0 ? (
                <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '14px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0, fontWeight: '600' }}>Belum ada confession tersedia.</p>
                </div>
              ) : (
                confessions.slice(0, 3).map((item) => {
                  const badge = getCategoryStyle(item.category);
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => setActiveTab('confession')}
                      style={{ backgroundColor: '#ffffff', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, padding: '2px 8px', borderRadius: '10px', fontSize: '9px', fontWeight: '800', textTransform: 'uppercase' }}>
                          {item.category || 'Campus Life'}
                        </span>
                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>
                          {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' }) : 'Baru'}
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontWeight: '500', lineHeight: '1.4' }}>
                        {item.content}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: '0 0 14px 0' }}>⚡ Pintas Pantas Kampus</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
              
              <div 
                onClick={() => window.open('https://ehailingumsapp.netlify.app', '_blank')}
                className="quick-link-card"
                style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                <span style={{ fontSize: '16px', display: 'block', marginBottom: '4px' }}>🚗</span>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', display: 'block' }}>E-Hailing UMS</span>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>Tempahan & info pengangkutan pelajar</span>
              </div>

              <div 
                onClick={() => setActiveTab('marketplace')}
                className="quick-link-card"
                style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                <span style={{ fontSize: '16px', display: 'block', marginBottom: '4px' }}>🛍️</span>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', display: 'block' }}>Marketplace</span>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>Jual beli barangan & servis pelajar</span>
              </div>

            </div>
          </div>

          <footer style={{ textAlign: 'center', padding: '20px 0 10px 0', borderTop: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px', fontWeight: '600' }}>
            <p style={{ margin: '0 0 6px 0' }}>UMS CONFESSION HUB &copy; 2026 • Platform Komuniti Pelajar UMS Sabah</p>
            <p style={{ margin: 0, fontSize: '11px' }}>Penafian: Segala hantaran dan luahan adalah pandangan peribadi individu dan tidak mencerminkan pendirian rasmi pihak pentadbir platform.</p>
          </footer>

        </div>
      ) : activeTab === 'marketplace' ? (
        /* MARKETPLACE PAGE */
        <div className="fade-in-card" style={{ maxWidth: '720px', margin: '0 auto', padding: '30px 16px', boxSizing: 'border-box' }}>
          
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: '900', margin: '0 0 4px 0', color: '#0f172a' }}>🛍️ UMS Student Marketplace</h2>
            <p style={{ color: '#334155', fontSize: '13px', margin: 0, fontWeight: '600' }}>Platform iklan pelbagai produk & perkhidmatan komuniti pelajar UMS.</p>
          </div>

          <form onSubmit={handleProductSubmit} style={{ backgroundColor: '#ffffff', padding: '16px 18px', borderRadius: '16px', marginBottom: '25px', border: '2px solid #0f172a', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '800', margin: '0 0 12px 0', color: '#0f172a' }}>Iklankan Produk / Servis Anda</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input 
                type="text" 
                id="productTitleInput"
                name="productTitle"
                placeholder="Nama Produk / Servis (Cth: Buku Kalkulus / Nasi Ayam)" 
                value={productTitle}
                onChange={(e) => setProductTitle(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff', color: '#0f172a' }}
                required
              />
              
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input 
                  type="text" 
                  id="productPriceInput"
                  name="productPrice"
                  placeholder="Harga (Cth: RM15.00)" 
                  value={productPrice}
                  onChange={(e) => setProductPrice(e.target.value)}
                  style={{ flex: 1, minWidth: '140px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff', color: '#0f172a' }}
                  required
                />
                
                <select 
                  id="productCategorySelect"
                  name="productCategory"
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value)}
                  style={{ flex: 1, minWidth: '140px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff', color: '#0f172a', fontWeight: '700' }}
                >
                  <option value="Makanan">🍱 Makanan & Minuman</option>
                  <option value="Buku / Nota">📚 Buku & Nota Kuliah</option>
                  <option value="Pakaian">👕 Pakaian & Bundle</option>
                  <option value="Elektronik">💻 Elektronik & Gadget</option>
                  <option value="Servis">🛠️ Servis / Perkhidmatan</option>
                  <option value="Lain-lain">📦 Lain-lain</option>
                </select>
              </div>

              <input 
                type="text" 
                id="productWhatsappInput"
                name="productWhatsapp"
                placeholder="No. WhatsApp (Cth: 0123456789 / 60123456789)" 
                value={productWhatsapp}
                onChange={(e) => setProductWhatsapp(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff', color: '#0f172a' }}
                required
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: '#475569', backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <span>📷 Upload Gambar Produk</span>
                  <input type="file" accept="image/*" onChange={handleProductImageChange} style={{ display: 'none' }} />
                </label>

                <button 
                  type="submit" 
                  disabled={productLoading}
                  style={{ backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                >
                  {productLoading ? 'Menghantar...' : 'Hantar Iklan'}
                </button>
              </div>

              {productImagePreview && (
                <div style={{ position: 'relative', marginTop: '10px', display: 'inline-block' }}>
                  <img src={productImagePreview} alt="Preview" style={{ width: '90px', height: '90px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }} />
                  <button 
                    type="button" 
                    onClick={() => { setProductImageFile(null); setProductImagePreview(null); }}
                    style={{ position: 'absolute', top: '4px', right: '4px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '10px', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </form>

          {/* SENARAI PRODUK */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            {products.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <p style={{ color: '#475569', fontSize: '14px', margin: 0, fontWeight: '600' }}>Belum ada produk diluluskan di marketplace.</p>
              </div>
            ) : (
              products.map((prod) => {
                const isSold = prod.status === 'sold';
                const isMyProd = myProducts[prod.id];

                return (
                  <div key={prod.id} style={{ 
                    backgroundColor: isSold ? '#f1f5f9' : '#ffffff', 
                    padding: '12px', borderRadius: '16px', 
                    border: isSold ? '1.5px solid #cbd5e1' : '1px solid #e2e8f0', 
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)', 
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    opacity: isSold ? 0.75 : 1
                  }}>
                    <div>
                      {prod.imageUrl ? (
                        <div style={{ 
                          width: '100%', height: '180px', borderRadius: '10px', overflow: 'hidden', 
                          marginBottom: '10px', backgroundColor: '#f8fafc', display: 'flex', 
                          alignItems: 'center', justifyContent: 'center', position: 'relative' 
                        }}>
                          <img 
                            src={prod.imageUrl} 
                            alt={prod.title} 
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                          />
                          {isSold && (
                            <div style={{ position: 'absolute', inset: '0', backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ backgroundColor: '#ef4444', color: '#ffffff', padding: '4px 12px', borderRadius: '8px', fontWeight: '900', fontSize: '13px', letterSpacing: '1px' }}>SOLD OUT</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ height: '180px', backgroundColor: '#e2e8f0', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '12px', marginBottom: '10px', position: 'relative' }}>
                          {isSold ? 'SOLD OUT' : 'Tiada Gambar'}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', backgroundColor: '#f0fdf4', color: '#16a34a', padding: '2px 6px', borderRadius: '6px', fontWeight: 'bold' }}>
                          {prod.category || 'Produk'}
                        </span>
                        {isSold && (
                          <span style={{ fontSize: '10px', backgroundColor: '#fee2e2', color: '#dc2626', padding: '2px 6px', borderRadius: '6px', fontWeight: 'bold' }}>Terjual</span>
                        )}
                      </div>

                      <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', margin: '4px 0 2px 0', textDecoration: isSold ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {prod.title}
                      </h4>
                      <p style={{ fontSize: '13px', fontWeight: '900', color: '#e11d48', margin: '0 0 10px 0' }}>{prod.price}</p>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {!isSold && (
                        <button 
                          onClick={() => {
                            const formattedPhone = formatWhatsappNumber(prod.whatsapp);
                            window.open(`https://wa.me/${formattedPhone}?text=Hai,%20saya%20berminat%20dengan%20produk%20${encodeURIComponent(prod.title)}%20yang%20diiklankan%20di%20UMS%20Marketplace.`, '_blank');
                          }}
                          style={{ width: '100%', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                        >
                          WhatsApp Penjual
                        </button>
                      )}

                      {(isMyProd || isAdmin) && (
                        <button 
                          onClick={() => handleToggleProductStatus(prod.id, prod.status)}
                          style={{ width: '100%', backgroundColor: isSold ? '#e2e8f0' : '#fef3c7', color: isSold ? '#0f172a' : '#d97706', border: 'none', padding: '6px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          {isSold ? 'Tukar ke Available' : 'Tukar ke SOLD'}
                        </button>
                      )}

                      {isAdmin && (
                        <button 
                          onClick={() => handleDeleteProduct(prod.id)}
                          style={{ width: '100%', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          Padam (Admin)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      ) : (
        /* CONFESSIONS PAGE */
        <div className="fade-in-card" style={{ maxWidth: '720px', margin: '0 auto', padding: '30px 16px', boxSizing: 'border-box' }}>
          
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: '900', margin: '0 0 4px 0', letterSpacing: '-0.5px', color: '#0f172a' }}>Students Confessions</h2>
            <p style={{ color: '#334155', fontSize: '13px', margin: 0, fontWeight: '600' }}>Universiti Malaysia Sabah • Share, connect, explore safely</p>
          </div>

          <form onSubmit={handleSubmit} style={{ backgroundColor: '#ffffff', padding: '14px 18px', borderRadius: '16px', marginBottom: '25px', border: '2px solid #0f172a', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Pilih kategori luahan anda:</span>
              <select 
                id="confessionCategorySelect"
                name="category"
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
            />

            {imagePreview && (
              <div style={{ position: 'relative', marginTop: '10px', display: 'inline-block' }}>
                <img src={imagePreview} alt="Preview" style={{ maxHeight: '120px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }} />
                <button 
                  type="button" 
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  style={{ position: 'absolute', top: '4px', right: '4px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  ✕
                </button>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: '#475569', backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <span>📷 Upload Gambar</span>
                <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
              </label>

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
                <p style={{ color: '#475569', fontSize: '14px', margin: 0, fontWeight: '600' }}>Belum ada confession. Jadilah yang pertama!</p>
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
                  <div key={item.id} className="fade-in-card" style={{ 
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

                    <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#0f172a', lineHeight: '1.6', fontSize: '14px', marginBottom: item.imageUrl ? '12px' : '16px', marginTop: 0, fontWeight: '500' }}>
                      {item.content}
                    </p>

                    {item.imageUrl && (
                      <div style={{ marginBottom: '16px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', textAlign: 'center' }}>
                        <img src={item.imageUrl} alt="Confession attachment" style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block', margin: '0 auto' }} />
                      </div>
                    )}

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
                                border: isSelected ? '1.5px solid #0f172a' : '1.5px solid #e2e8f0',
                                borderRadius: '20px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700',
                                display: 'flex', alignItems: 'center', gap: '4px', color: '#0f172a', transition: 'all 0.1s ease'
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
                                        id={`reply-${cmt.id}`}
                                        name="reply"
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
                                                  id={`reply-${rep.id}`}
                                                  name="reply"
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
                            id={`comment-${item.id}`}
                            name="comment"
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

      {/* BUTANG KEMBALI KE ATAS */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="scroll-top-btn"
          style={{
            position: 'fixed', bottom: '24px', right: '24px',
            backgroundColor: '#0f172a', color: '#ffffff', border: '2px solid #fbbf24',
            borderRadius: '50%', width: '42px', height: '42px', fontSize: '16px', fontWeight: 'bold',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 16px rgba(0,0,0,0.15)', zIndex: 999
          }}
          title="Kembali ke atas"
        >
          ↑
        </button>
      )}

    </div>
  );
}