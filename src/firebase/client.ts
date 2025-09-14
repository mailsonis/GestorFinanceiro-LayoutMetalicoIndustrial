
// src/firebase/client.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// IMPORTANT: Replace these with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyB9Cpl77gG2V8fOV5nIITMjU9-uGIxPAaA",
  authDomain: "gestor-financeiro---industrial.firebaseapp.com",
  projectId: "gestor-financeiro---industrial",
  storageBucket: "gestor-financeiro---industrial.firebasestorage.app",
  messagingSenderId: "567599471276",
  appId: "1:567599471276:web:1db503581a61308819dd09",
};

// This streamlined pattern ensures a single, stable Firebase instance.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
