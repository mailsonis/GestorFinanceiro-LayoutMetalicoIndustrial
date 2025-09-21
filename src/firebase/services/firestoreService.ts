
import { db } from '@/firebase/client';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  setDoc,
  getDoc,
  getCountFromServer,
  limit as firestoreLimit
} from 'firebase/firestore';
import type { TransactionFormData } from '@/components/finances/add-transaction-modal';
import type { Category as CategoryData } from '@/components/finances/manage-categories-modal';
import { formatISO, parseISO as dateFnsParseISO } from 'date-fns';
import { addMonths } from 'date-fns/addMonths';

// Types adjusted for Firestore
export interface StoredTransaction {
  id: string;
  userId: string;
  description: string;
  value: number;
  type: 'income' | 'expense';
  categoryId: string;
  date: string; // ISO string yyyy-MM-dd
}

export interface StoredCategory {
  id: string;
  userId: string;
  name: string;
  color: string;
}

export interface AppSettings {
  systemName: string;
  allowNewRegistrations: boolean;
  contactWhatsapp: string;
}

export interface UserData {
    id: string;
    email: string;
}


const defaultAppSettings: AppSettings = {
  systemName: "Gestor Financeiro",
  allowNewRegistrations: true,
  contactWhatsapp: "5584999999999", // Default placeholder
};

// App Settings Services
const appSettingsDocRef = doc(db, 'appSettings', 'global');

export const getAppSettings = async (): Promise<AppSettings> => {
  const docSnap = await getDoc(appSettingsDocRef);
  if (docSnap.exists()) {
    return { ...defaultAppSettings, ...docSnap.data() };
  } else {
    try {
      await setDoc(appSettingsDocRef, defaultAppSettings);
      return defaultAppSettings;
    } catch (error) {
      console.error("Failed to create default app settings. Check Firestore rules for appSettings/global write access for admins or initial setup.", error);
      return defaultAppSettings;
    }
  }
};

export const updateAppSettings = async (settings: Partial<AppSettings>): Promise<void> => {
  await setDoc(appSettingsDocRef, settings, { merge: true });
};

// User Data Services
export const setUserData = async (userId: string, data: { email: string }) => {
    const userDocRef = doc(db, `users`, userId);
    await setDoc(userDocRef, { ...data, id: userId }, { merge: true });
};

export const getUserData = async (userId: string): Promise<UserData | null> => {
    const userDocRef = doc(db, `users`, userId);
    const docSnap = await getDoc(userDocRef);
    if(docSnap.exists()) {
        return docSnap.data() as UserData;
    }
    return null;
}

export const updateUserData = async (userId: string, data: Partial<UserData>) => {
    const userDocRef = doc(db, `users`, userId);
    await updateDoc(userDocRef, data);
};


const getCategoriesCollection = (userId: string) => {
  return collection(db, `users/${userId}/categories`);
};

const getTransactionsCollection = (userId: string) => {
  return collection(db, `users/${userId}/transactions`);
};

// Category Services
export const addCategory = async (userId: string, categoryData: Omit<StoredCategory, 'id' | 'userId'>): Promise<StoredCategory> => {
  const docRef = await addDoc(getCategoriesCollection(userId), { ...categoryData, userId });
  return { ...categoryData, id: docRef.id, userId };
};

export const getCategories = async (userId: string): Promise<StoredCategory[]> => {
  const q = query(getCategoriesCollection(userId), orderBy("name"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StoredCategory));
};

export const updateCategory = async (userId: string, categoryId: string, categoryData: Partial<Omit<StoredCategory, 'id' | 'userId'>>): Promise<void> => {
  const categoryDoc = doc(db, `users/${userId}/categories`, categoryId);
  await updateDoc(categoryDoc, categoryData);
};

export const deleteCategory = async (userId: string, categoryId: string): Promise<void> => {
  const categoryDoc = doc(db, `users/${userId}/categories`, categoryId);
  await deleteDoc(categoryDoc);
};

// Transaction Services
export const addTransaction = async (userId: string, transactionData: TransactionFormData): Promise<void> => {
  const transactionsCollection = getTransactionsCollection(userId);

  if (transactionData.isInstallment && transactionData.installments && transactionData.installments >= 2) {
    // Installment logic
    const { description, value, type, categoryId, date, installments } = transactionData;
    const batch = writeBatch(db);

    for (let i = 0; i < installments; i++) {
      const installmentDate = addMonths(date, i);
      const installmentDescription = `${description} (${i + 1}/${installments})`;
      
      const newTransactionRef = doc(transactionsCollection); // Auto-generate ID
      
      const dataToStore = {
        userId,
        description: installmentDescription,
        value: value, // Use the installment value directly
        type,
        categoryId,
        date: formatISO(installmentDate, { representation: 'date' }),
      };
      batch.set(newTransactionRef, dataToStore);
    }
    await batch.commit();
  } else if (transactionData.isFixedIncome && transactionData.fixedIncomeMonths && transactionData.fixedIncomeMonths >= 2) {
    // Fixed recurring income logic
    const { description, value, type, categoryId, date, fixedIncomeMonths } = transactionData;
    const batch = writeBatch(db);

    for (let i = 0; i < fixedIncomeMonths; i++) {
        const recurringDate = addMonths(date, i);
        const recurringDescription = `${description} (Mês ${i + 1}/${fixedIncomeMonths})`;
        const newTransactionRef = doc(transactionsCollection); // Auto-generate ID
        const dataToStore = {
            userId,
            description: recurringDescription,
            value: value, // The value is fixed, not divided
            type,
            categoryId,
            date: formatISO(recurringDate, { representation: 'date' }),
        };
        batch.set(newTransactionRef, dataToStore);
    }
    await batch.commit();
  } else {
    // Single transaction logic
    const dataToStore = {
      userId,
      description: transactionData.description,
      value: transactionData.value,
      type: transactionData.type,
      categoryId: transactionData.categoryId,
      date: formatISO(transactionData.date, { representation: 'date' }),
    };
    await addDoc(transactionsCollection, dataToStore);
  }
};


export const getTransactions = async (
  userId: string, 
  month?: string, 
  year?: number, 
  limit?: number,
  day?: Date | null
): Promise<StoredTransaction[]> => {
  const collRef = getTransactionsCollection(userId);
  const constraints = [];

  constraints.push(where('userId', '==', userId));

  if (day) {
    const specificDate = formatISO(day, { representation: 'date' });
    constraints.push(where('date', '==', specificDate));
  } else if (month && year) {
    const monthIndex = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].indexOf(month);
    if (monthIndex === -1) return []; 

    const startDate = formatISO(new Date(year, monthIndex, 1), { representation: 'date' });
    const endDate = formatISO(new Date(year, monthIndex + 1, 0), { representation: 'date' });

    constraints.push(where('date', '>=', startDate));
    constraints.push(where('date', '<=', endDate));
  } else if (year) { 
    const startDate = formatISO(new Date(year, 0, 1), { representation: 'date' });
    const endDate = formatISO(new Date(year, 11, 31), { representation: 'date' });
    constraints.push(where('date', '>=', startDate));
    constraints.push(where('date', '<=', endDate));
  }
  
  constraints.push(orderBy('date', 'desc'));

  if (limit) {
      constraints.push(firestoreLimit(limit));
  }
  
  const q = query(collRef, ...constraints);

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StoredTransaction));
};


export const getTransactionsCount = async (userId: string): Promise<number> => {
    const transactionsCollection = getTransactionsCollection(userId);
    const q = query(transactionsCollection, where('userId', '==', userId));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
};


export const updateTransaction = async (userId: string, transactionId: string, transactionData: TransactionFormData): Promise<void> => {
  const transactionDoc = doc(db, `users/${userId}/transactions`, transactionId);
  const dataToUpdate = {
    description: transactionData.description,
    value: transactionData.value,
    type: transactionData.type,
    categoryId: transactionData.categoryId,
    date: formatISO(transactionData.date, { representation: 'date' }),
  };
  await updateDoc(transactionDoc, dataToUpdate);
};

export const deleteTransaction = async (userId: string, transactionId: string): Promise<void> => {
  const transactionDoc = doc(db, `users/${userId}/transactions`, transactionId);
  await deleteDoc(transactionDoc);
};

export const deleteFutureInstallments = async (userId: string, currentTransaction: StoredTransaction): Promise<void> => {
  const match = currentTransaction.description.match(/^(.*)\s\((\d+)\/(\d+)\)$/);
  if (!match) {
    // Not an installment, fallback to single delete
    await deleteTransaction(userId, currentTransaction.id);
    return;
  }

  const baseDescription = match[1];
  const currentInstallmentNumber = parseInt(match[2], 10);

  const transactionsCollection = getTransactionsCollection(userId);
  const q = query(
    transactionsCollection,
    where('userId', '==', userId),
    where('description', '>=', `${baseDescription} (${currentInstallmentNumber}/`),
    where('description', '<=', `${baseDescription} (999/999)`) // Assuming max 999 installments
  );

  const snapshot = await getDocs(q);
  const batch = writeBatch(db);

  snapshot.docs.forEach(document => {
    const docData = document.data() as StoredTransaction;
    const docMatch = docData.description.match(/\((\d+)\/\d+\)$/);
    if (docMatch) {
      const installmentNumber = parseInt(docMatch[1], 10);
      if (docData.description.startsWith(baseDescription) && installmentNumber >= currentInstallmentNumber) {
        batch.delete(document.ref);
      }
    }
  });

  await batch.commit();
};


export const getDefaultCategories = (): Omit<StoredCategory, 'id' | 'userId'>[] => {
  return [
    { name: "Alimentação", color: "#FFD700" }, // Gold
    { name: "Transporte", color: "#4682B4" }, // SteelBlue
    { name: "Moradia", color: "#228B22" },    // ForestGreen
    { name: "Lazer", color: "#FF6347" },      // Tomato
    { name: "Saúde", color: "#8A2BE2" },      // BlueViolet
    { name: "Educação", color: "#D2691E" },   // Chocolate
    { name: "Outros", color: "#A9A9A9" },     // DarkGray
  ];
};

export const addDefaultCategoriesForUser = async (userId: string): Promise<void> => {
  const defaultCategories = getDefaultCategories();
  const batch = writeBatch(db);
  const categoriesCollection = getCategoriesCollection(userId);

  defaultCategories.forEach(category => {
    const newCategoryRef = doc(categoriesCollection); // Auto-generate ID
    batch.set(newCategoryRef, { ...category, userId });
  });

  await batch.commit();
};
