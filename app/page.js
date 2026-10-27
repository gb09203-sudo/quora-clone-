// app/page.js
'use client';
import { useState, useEffect } from 'react';
import { FaGoogle } from 'react-icons/fa';
import { loginWithProvider, auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, getDocs, query, orderBy, updateDoc } from 'firebase/firestore';

export default function Home() {
  const [user, setUser] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0.0000);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('News');
  const [posts, setPosts] = useState([]);

  // 1. Fetch posts securely from Cloud Database
  const fetchPosts = async () => {
    try {
      const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const postsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(postsData);
    } catch (error) {
      console.error("Error fetching posts: ", error);
    }
  };

  // 2. Fetch User Wallet with High-Precision (4 Decimal Points)
  const fetchWallet = async (uid) => {
    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const rawBalance = userSnap.data().walletBalance;
        setWalletBalance(parseFloat(rawBalance) || 0.0000);
      }
    } catch (error) {
      console.error("Wallet loading error: ", error);
    }
  };

  useEffect(() => {
    fetchPosts();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await fetchWallet(currentUser.uid);
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleInputFocus = () => {
    if (!user) setShowLoginModal(true);
  };

  const handleGoogleLogin = async () => {
    const loggedInUser = await loginWithProvider();
    if (loggedInUser) setShowLoginModal(false);
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (!newTitle.trim()) return;
    
    try {
      await addDoc(collection(db, "posts"), {
        title: newTitle,
        author: user.displayName || "Anonymous User",
        authorId: user.uid,
        category: newCategory,
        impressions: 0,
        earnings: 0.0000,
        createdAt: new Date().toISOString()
      });

      setNewTitle('');
      fetchPosts();
    } catch (error) {
      console.error("Error adding post: ", error);
    }
  };

  // 3. 🎯 PURE IMPRESSION SYSTEM: 1 Impression = ₹0.0250 (₹25 per 1000)
  const handleImpressionClick = async (postId, authorId, currentImpressions, currentEarnings) => {
    try {
      const postRef = doc(db, "posts", postId);
      const newImpressions = (parseInt(currentImpressions) || 0) + 1;
      const ratePerImpression = 0.0250; 
      const newEarnings = (parseFloat(currentEarnings) || 0) + ratePerImpression;

      // Update Post Impressions data inside Firestore Cloud
      await updateDoc(postRef, {
        impressions: newImpressions,
        earnings: newEarnings
      });

      // Update Creator's Core Account Wallet
      const creatorRef = doc(db, "users", authorId);
      const creatorSnap = await getDoc(creatorRef);
      
      if (creatorSnap.exists()) {
        const creatorCurrentWallet = parseFloat(creatorSnap.data().walletBalance) || 0.0000;
        await updateDoc(creatorRef, {
          walletBalance: creatorCurrentWallet + ratePerImpression
        });
      }

      // Live Refresh UI Data
      fetchPosts();
      if (user) {
        await fetchWallet(user.uid);
      }
    } catch (error) {
      console.error("Impression update error: ", error);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen text-gray-900 font-sans relative">
      {/* Navbar */}
      <nav className="bg-white shadow-md p-4 sticky top-0 z-40 border-b border-gray-200">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-red-600 tracking-tight">Q-News Hub</h1>
          <div className="flex gap-4 items-center">
            <button className="text-gray-600 font-medium hover:text-red-600">Home</button>
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-700 hidden sm:inline">{user.displayName}</span>
                <button className="bg-green-600 text-white px-4 py-2 rounded-full font-mono font-bold shadow-sm text-sm tracking-wide">
                  Wallet (₹{walletBalance.toFixed(4)})
                </button>
              </div>
            ) : (
              <button 
                type="button"
                onClick={() => setShowLoginModal(true)} 
                className="bg-red-600 text-white px-5 py-2 rounded-full font-medium hover:bg-red-700 transition text-sm"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 p-4">
        {/* Left Sidebar */}
        <div className="md:col-span-1 bg-white p-4 rounded-xl shadow-sm border border-gray-200 h-fit">
          <h2 className="font-bold text-gray-800 text-lg mb-3">Trending Spaces</h2>
          <ul className="space-y-2.5 text-gray-600 font-medium text-sm">
            <li className="hover:text-red-600 cursor-pointer p-1.5 hover:bg-red-50 rounded transition">🔥 Breaking News</li>
            <li className="hover:text-red-600 cursor-pointer p-1.5 hover:bg-red-50 rounded transition">💻 Technology</li>
          </ul>
        </div>

        {/* Center Post Feed */}
        <div className="md:col-span-2 space-y-6">
          {/* Create Post Form */}
          <form onSubmit={handlePostSubmit} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-2 text-sm">Create News Post / Ask Question</h3>
            <textarea 
              value={newTitle} 
              onFocus={handleInputFocus} 
              onChange={(e) => setNewTitle(e.target.value)} 
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50 text-sm" 
              placeholder="Write something valuable..." 
              rows="3" 
            />
            <div className="flex justify-between items-center mt-3">
              <select 
                value={newCategory} 
                onChange={(e) => setNewCategory(e.target.value)} 
                className="border border-gray-200 p-2 rounded-lg bg-white text-sm font-medium text-gray-600 focus:outline-none"
              >
                <option value="News">News</option>
                <option value="Question">Question</option>
              </select>
              <button type="submit" className="bg-red-600 text-white px-5 py-2 rounded-full font-semibold text-sm hover:bg-red-700 transition">Post</button>
            </div>
          </form>

          {/* Cloud Impressions Feed */}
          <div className="space-y-4">
            {posts.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-8">No content yet. Create the first post!</p>
            ) : (
              posts.map(post => (
                <div key={post.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                  <span className="text-xs font-bold uppercase px-2 py-1 bg-red-50 text-red-600 rounded-md">
                    {post.category}
                  </span>
                  
                  {/* Dynamic Impression Simulation Trigger */}
                  <h2 
                    onClick={() => handleImpressionClick(post.id, post.authorId, post.impressions, post.earnings)}
                    className="text-xl font-bold mt-2.5 text-gray-900 hover:text-red-600 cursor-pointer transition underline decoration-dotted"
                  >
                    {post.title}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">Posted by <span className="font-semibold text-gray-700">{post.author}</span></p>
                  
                  {/* Metrics Footer */}
                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 font-medium">
                    <span className="flex items-center gap-1">📊 <b>{post.impressions || 0}</b> Impressions</span>
                    <span className="text-green-600 font-mono font-bold bg-green-50 px-3 py-1 rounded-full border border-green-100">
                      Earned: ₹{parseFloat(post.earnings || 0).toFixed(4)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* LOGIN MODAL */}
           {/* LOGIN MODAL (POORA COMPLETE CODE) */}
           {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative border border-gray-100">
            <button 
              type="button"
              onClick={() => setShowLoginModal(false)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              ✕
            </button>
            <h3 className="text-xl font-bold text-gray-800 text-center mb-2">Login Required</h3>
            <p className="text-xs text-gray-500 text-center mb-4">Post upload karne aur wallet update ke liye continue karein.</p>
            <div className="space-y-3.5 mt-4">
              <button 
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-700 font-bold p-3 rounded-xl hover:bg-gray-50 transition text-sm shadow-sm"
              >
                <FaGoogle className="text-red-500 text-lg" />
                Continue with Google
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
