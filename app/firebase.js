// app/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

// Aapki asli Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCqfEOxEKdQfml5vj6AwbgOnjoe1j_luxc",
  authDomain: "q-news-hub.firebaseapp.com",
  projectId: "q-news-hub",
  storageBucket: "q-news-hub.firebasestorage.app",
  messagingSenderId: "849940244819",
  appId: "1:849940244819:web:82e0558ef9fa0a471b19a6",
  measurementId: "G-3C85V5KRJQ"
};

// Initialize Firebase (Ek hi baar bina kisi redundancy ke)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();

// Google Login Function
export const loginWithProvider = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Database me user check aur save karein (Wallet ke sath)
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        name: user.displayName || "User",
        email: user.email || "",
        photoURL: user.photoURL || "",
        followers: 0,
        following: 0,
        walletBalance: 0.00, // Real-time Earning Wallet
        createdAt: new Date().toISOString()
      });
    }
    return user;
  } catch (error) {
    console.error("Login Error: ", error.message);
    alert(`Login failed: ${error.message}`);
  }
};
