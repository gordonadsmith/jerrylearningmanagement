import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCwVVi34Iukb4o0gdx5LEFfAHfTxy-LNLA",
  authDomain: "jerry-lms.firebaseapp.com",
  projectId: "jerry-lms",
  storageBucket: "jerry-lms.firebasestorage.app",
  messagingSenderId: "273096505728",
  appId: "1:273096505728:web:836c68fd331fcc4c0b2965",
  measurementId: "G-7D0GGTQLMR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// EXPORT the services so other files can use them
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);