// Archivo de configuración Firebase — Con variables de entorno (Vite)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, orderBy, limit, addDoc, setDoc, updateDoc, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getStorage, ref, listAll, getDownloadURL, uploadBytes, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Cargar configuración desde variables de entorno (Vite)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validar que las credenciales estén disponibles
if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes('your_')) {
  console.warn('⚠️ Firebase credentials not found in .env file');
  console.warn('⚠️ Please create a .env file with VITE_FIREBASE_* variables');
}

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const provider = new GoogleAuthProvider();
export { signInWithPopup, onAuthStateChanged, signOut, collection, getDocs, query, where, orderBy, limit, addDoc, setDoc, updateDoc, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, ref, listAll, getDownloadURL, uploadBytes, deleteObject };
