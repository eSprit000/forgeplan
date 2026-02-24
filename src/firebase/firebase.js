// src/firebase/firebase.js

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase config (senin konsoldan aldığın)
const firebaseConfig = {
  apiKey: "AIzaSyCM09NZiOVVkpmLzZ65FEGsMvGTeKrH-vI",
  authDomain: "forgeplan-575a6.firebaseapp.com",
  projectId: "forgeplan-575a6",
  storageBucket: "forgeplan-575a6.firebasestorage.app",
  messagingSenderId: "1042234238583",
  appId: "1:1042234238583:web:4c38c55001c3793849c872",
  measurementId: "G-7DZH8RL1L7",
};

// Expo/React Native'de hot reload yüzünden initializeApp birden fazla çalışmasın diye:
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;