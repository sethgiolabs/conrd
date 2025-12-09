import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Configuración de Firebase
export const firebaseConfig = {
  apiKey: "AIzaSyD7Q6m_lnEUL5vloDl7x6l1UgQMLneJIOw",
  authDomain: "inventario-epps-550f0.firebaseapp.com",
  databaseURL: "https://inventario-epps-550f0-default-rtdb.firebaseio.com",
  projectId: "inventario-epps-550f0",
  storageBucket: "inventario-epps-550f0.firebasestorage.app",
  messagingSenderId: "850183931400",
  appId: "1:850183931400:web:badeb55fc91e42da4cf3bd",
  measurementId: "G-42WQXVRM3S"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };