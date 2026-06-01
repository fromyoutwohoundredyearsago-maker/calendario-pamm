// =============================================================================
// CONFIGURACIÓN DE FIREBASE
// =============================================================================
// 
// INSTRUCCIONES:
// 1. Crea un proyecto en Firebase Console: https://console.firebase.google.com/
// 2. Habilita Authentication (Email/Password)
// 3. Habilita Firestore Database
// 4. Ve a Configuración del proyecto > General > Tus apps > Web
// 5. Copia las credenciales y reemplaza los valores de abajo
//
// IMPORTANTE: Nunca compartas este archivo con credenciales reales en repositorios públicos

const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO_ID",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

// =============================================================================
// INICIALIZACIÓN DE FIREBASE
// =============================================================================

// Importar Firebase SDK (versión modular)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Inicializar Firebase
let app, auth, db;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  console.log('Firebase inicializado correctamente');
} catch (error) {
  console.error('Error al inicializar Firebase:', error);
  console.warn('La aplicación funcionará en modo localStorage hasta que configures Firebase');
}

// Exportar para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { app, auth, db };
}
