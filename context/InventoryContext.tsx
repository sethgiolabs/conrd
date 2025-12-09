import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth, firebaseConfig } from '../firebaseConfig'; // Import config
import { initializeApp } from 'firebase/app'; // Need to init secondary app
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  setDoc, 
  getDoc,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  getAuth,
  User as FirebaseUser 
} from 'firebase/auth';
import { Product, Worker, Movement, AppUser } from '../types';

interface InventoryContextType {
  // Data
  products: Product[];
  workers: Worker[];
  movements: Movement[];
  appUsers: AppUser[];
  loading: boolean;
  
  // Auth
  currentUser: FirebaseUser | null;
  userData: AppUser | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;

  // Actions
  addItem: (product: Omit<Product, 'id'>) => Promise<void>;
  updateItem: (id: string, data: Partial<Product>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  addWorker: (worker: Omit<Worker, 'id'>) => Promise<void>;
  updateWorker: (id: string, data: Partial<Worker>) => Promise<void>;
  deleteWorker: (id: string) => Promise<void>; // Added deleteWorker
  addTransaction: (movement: Omit<Movement, 'id'>) => Promise<void>;
  
  // User Management Actions
  addSystemUser: (user: Omit<AppUser, 'id'>, password?: string) => Promise<void>;
  updateAppUser: (id: string, data: Partial<AppUser>) => Promise<void>;
  deleteAppUser: (id: string) => Promise<void>;

  getHistoryByDate: (
    productId: string | null,
    startDate: string, 
    endDate: string, 
    lastDoc?: QueryDocumentSnapshot<DocumentData> | null
  ) => Promise<{ data: Movement[], lastVisible: QueryDocumentSnapshot<DocumentData> | null }>;

  clearHistory: (type: 'IN' | 'OUT') => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(null);

  // --- AUTH LISTENER ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setUserData({ id: userDoc.id, ...userDoc.data() } as AppUser);
          }
        } catch (e) {
          console.error("Error fetching user profile", e);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- DATA LISTENERS ---
  
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "items"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const itemsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      setProducts(itemsData);
    });
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "workers"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const workersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Worker[];
      setWorkers(workersData);
    });
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "transactions"), orderBy("date", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const transactionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Movement[];
      setMovements(transactionsData);
    });
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AppUser[];
      setAppUsers(usersData);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // --- ACTIONS ---

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const register = async (email: string, pass: string, name: string) => {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    await setDoc(doc(db, "users", res.user.uid), {
      name,
      email,
      role: 'Editor',
      status: 'Active',
      lastActive: new Date().toISOString()
    });
  };

  const logout = async () => {
    await signOut(auth);
    setUserData(null);
  };

  const addItem = async (product: Omit<Product, 'id'>) => {
    await addDoc(collection(db, "items"), product);
  };

  const updateItem = async (id: string, data: Partial<Product>) => {
    const docRef = doc(db, "items", id);
    await updateDoc(docRef, data);
  };

  const deleteItem = async (id: string) => {
    await deleteDoc(doc(db, "items", id));
  };

  const addWorker = async (worker: Omit<Worker, 'id'>) => {
    await addDoc(collection(db, "workers"), worker);
  };

  const updateWorker = async (id: string, data: Partial<Worker>) => {
    const docRef = doc(db, "workers", id);
    await updateDoc(docRef, data);
  };

  const deleteWorker = async (id: string) => {
    await deleteDoc(doc(db, "workers", id));
  };

  const addTransaction = async (movement: Omit<Movement, 'id'>) => {
    await addDoc(collection(db, "transactions"), movement);
  };

  // --- ADMIN USER CREATION LOGIC ---
  const addSystemUser = async (user: Omit<AppUser, 'id'>, password?: string) => {
    if (!password) {
      throw new Error("Password is required to create a new system user");
    }

    // 1. Initialize a secondary Firebase app instance.
    // This allows creating a user without logging out the current admin.
    const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
    const secondaryAuth = getAuth(secondaryApp);

    try {
      // 2. Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, user.email, password);
      const uid = userCredential.user.uid;

      // 3. Create the user document in Firestore (Main DB) with the specific Role
      // We use setDoc to ensure the Document ID matches the Auth UID
      await setDoc(doc(db, "users", uid), {
        name: user.name,
        email: user.email,
        role: user.role, // Admin, Editor, Empleado
        status: user.status,
        lastActive: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      // 4. Sign out the secondary user to clean up
      await signOut(secondaryAuth);
      
    } catch (error: any) {
      console.error("Error creating system user:", error);
      throw error; // Re-throw to handle in UI
    }
    // Note: The secondary app instance will be garbage collected or can be deleted if using specific SDK methods,
    // but simply signing out is sufficient for this flow in JS SDK.
  };

  const updateAppUser = async (id: string, data: Partial<AppUser>) => {
    const docRef = doc(db, "users", id);
    await updateDoc(docRef, data);
  };

  const deleteAppUser = async (id: string) => {
    await deleteDoc(doc(db, "users", id));
  };

  const getHistoryByDate = async (
    productId: string | null,
    startDate: string, 
    endDate: string, 
    lastDoc: QueryDocumentSnapshot<DocumentData> | null = null
  ) => {
    const constraints = [
      orderBy("date", "desc"),
      where("date", ">=", startDate),
      where("date", "<=", endDate),
      limit(20)
    ];

    if (productId) {
      constraints.push(where("productId", "==", productId));
    }

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const q = query(collection(db, "transactions"), ...constraints);
    const snapshot = await getDocs(q);

    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Movement[];
    const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

    return { data, lastVisible };
  };

  const clearHistory = async (type: 'IN' | 'OUT') => {
    // Queries all documents of the specified type
    const q = query(collection(db, "transactions"), where("type", "==", type));
    const snapshot = await getDocs(q);
    
    // Deletes them one by one (Promise.all for concurrency)
    const promises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(promises);
  };

  return (
    <InventoryContext.Provider value={{
      products,
      workers,
      movements,
      appUsers,
      loading,
      currentUser,
      userData,
      login,
      register,
      logout,
      addItem,
      updateItem,
      deleteItem,
      addWorker,
      updateWorker,
      deleteWorker,
      addTransaction,
      addSystemUser,
      updateAppUser,
      deleteAppUser,
      getHistoryByDate,
      clearHistory
    }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};