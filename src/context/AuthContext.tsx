
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  type User 
} from 'firebase/auth';
import { auth } from '@/firebase/client';
import { useRouter } from 'next/navigation';
import { 
  getAppSettings, 
  updateAppSettings as updateFirestoreAppSettings, 
  getUserData,
  setUserData,
  type AppSettings,
  type UserData
} from '@/firebase/services/firestoreService';

const ADMIN_EMAIL = "mailsonrafaelg@gmail.com";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  userData: UserData | null;
  appSettings: AppSettings;
  signUp: (email: string, pass: string) => Promise<any>;
  signIn: (email: string, pass: string) => Promise<any>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  refreshAppSettings: () => Promise<void>;
  updateAppSettings: (settings: Partial<AppSettings>) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const defaultAppSettings: AppSettings = {
  systemName: "Gestor Financeiro",
  allowNewRegistrations: true,
  contactWhatsapp: "5584999999999",
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserDataState] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings);
  const router = useRouter();

  const fetchAndSetAppSettings = useCallback(async () => {
    try {
      const settings = await getAppSettings();
      setAppSettings(settings || defaultAppSettings);
    } catch (error) {
      console.error("Error fetching app settings:", error);
      setAppSettings(defaultAppSettings);
    }
  }, []);
  
  const fetchAndSetUserData = useCallback(async (currentUser: User | null) => {
    if (currentUser) {
        const fetchedUserData = await getUserData(currentUser.uid);
        setUserDataState(fetchedUserData);
    } else {
        setUserDataState(null);
    }
  }, []);

  useEffect(() => {
    fetchAndSetAppSettings();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAdmin(currentUser?.email === ADMIN_EMAIL);
      await fetchAndSetUserData(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchAndSetAppSettings, fetchAndSetUserData]);

  const signUp = async (email: string, pass: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const { user } = userCredential;
    await setUserData(user.uid, { email: user.email! });
    const fetchedUserData = await getUserData(user.uid);
    setUserDataState(fetchedUserData);
    return userCredential;
  };

  const signIn = (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setUserDataState(null);
    setIsAdmin(false);
    router.push('/login');
  };

  const sendPasswordReset = (email: string) => {
    return sendPasswordResetEmail(auth, email);
  };

  const handleUpdateAppSettings = async (settings: Partial<AppSettings>) => {
    if(!isAdmin) return;
    await updateFirestoreAppSettings(settings);
    await fetchAndSetAppSettings();
  };

  const value = {
    user,
    userData,
    loading,
    isAdmin,
    appSettings,
    signUp,
    signIn,
    signOut,
    sendPasswordReset,
    refreshAppSettings: fetchAndSetAppSettings,
    updateAppSettings: handleUpdateAppSettings,
    refreshUserData: () => fetchAndSetUserData(user),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
