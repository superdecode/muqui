# 🚀 Implementación de Firebase - Guía Completa

## 📋 PLAN DE IMPLEMENTACIÓN

### **FASE 1: CONFIGURACIÓN INICIAL**
1. Crear proyecto Firebase
2. Instalar dependencias
3. Configurar variables de entorno
4. Conectar aplicación a Firebase

### **FASE 2: MIGRACIÓN DE DATOS**
1. Estructurar base de datos Firestore
2. Migrar datos desde Google Sheets
3. Implementar servicios Firebase
4. Actualizar dataService

### **FASE 3: AUTENTICACIÓN**
1. Configurar Firebase Auth
2. Migrar usuarios existentes
3. Implementar login con Firebase
4. Gestionar sesiones

### **FASE 4: TESTING Y DEPLOY**
1. Pruebas de integración
2. Actualizar producción
3. Monitoreo y errores

---

## 🔧 PASOS DETALLADOS

### **PASO 1: CREAR PROYECTO FIREBASE**

#### 1.1 Ir a Firebase Console
```
https://console.firebase.google.com/
```

#### 1.2 Crear Nuevo Proyecto
- Nombre: `Sistema Inventario Muqui`
- Habilitar Google Analytics: ✅
- Seleccionar cuenta existente o crear nueva

#### 1.3 Configurar Servicios
- ✅ **Authentication** (Email/Password)
- ✅ **Firestore Database** 
- ✅ **Storage** (para archivos futuros)
- ✅ **Hosting** (opcional, ya tienes Vercel)

#### 1.4 Obtener Credenciales
- Ir a Project Settings → General
- Copiar configuración web
- Guardar para variables de entorno

---

### **PASO 2: INSTALAR DEPENDENCIAS**

```bash
cd inventario-app
npm install firebase
npm install @firebase/firestore
```

#### Actualizar package.json
```json
{
  "dependencies": {
    "firebase": "^10.7.1",
    "@firebase/firestore": "^4.6.4",
    // ... otras dependencias
  }
}
```

---

### **PASO 3: CONFIGURACIÓN FIREBASE**

#### 3.1 Crear archivo de configuración
```javascript
// src/config/firebase.js
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig)

// Servicios
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

export default app
```

#### 3.2 Actualizar variables de entorno
```bash
# .env
VITE_USE_FIREBASE=true
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
VITE_FIREBASE_MEASUREMENT_ID=tu_measurement_id
```

---

### **PASO 4: ESTRUCTURA DE DATOS FIRESTORE**

#### 4.1 Colecciones Principales
```
/firestore/
├── empresas/
│   ├── MK001 (document)
│   ├── MK010 (document)
│   └── MK040 (document)
├── usuarios/
│   ├── USR001 (document)
│   ├── USR002 (document)
│   └── ...
├── ubicaciones/
│   ├── LM001 (document)
│   ├── LM004 (document)
│   └── ...
├── productos/
│   ├── PROD001 (document)
│   ├── PROD002 (document)
│   └── ...
├── inventario/
│   ├── INV001 (document)
│   ├── INV002 (document)
│   └── ...
├── movimientos/
│   ├── MV001 (document)
│   ├── MV002 (document)
│   └── ...
├── movimientos_detalle/
│   ├── DM001 (document)
│   ├── DM002 (document)
│   └── ...
├── conteos/
│   ├── CONT001 (document)
│   ├── CONT002 (document)
│   └── ...
├── conteos_detalle/
│   ├── DC001 (document)
│   ├── DC002 (document)
│   └── ...
└── alertas/
    ├── ALERT001 (document)
    ├── ALERT002 (document)
    └── ...
```

#### 4.2 Reglas de Seguridad Firestore
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuarios solo pueden ver sus datos
    match /usuarios/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Empresas: lectura pública, escritura solo admin
    match /empresas/{empresaId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.rol == 'ADMIN_GLOBAL';
    }
    
    // Ubicaciones: según asignaciones
    match /ubicaciones/{ubicacionId} {
      allow read: if request.auth != null && 
        request.auth.token.ubicaciones_asignadas.has(ubicacionId);
      allow write: if request.auth != null && 
        (request.auth.token.rol == 'ADMIN_GLOBAL' || 
         request.auth.token.ubicaciones_asignadas.has(ubicacionId));
    }
    
    // Productos: lectura para todos, escritura admin
    match /productos/{productoId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.rol in ['ADMIN_GLOBAL', 'GERENTE_OPERATIVO'];
    }
    
    // Inventario: según ubicaciones asignadas
    match /inventario/{inventarioId} {
      allow read, write: if request.auth != null && 
        request.auth.token.ubicaciones_asignadas.has(resource.data.ubicacion_id);
    }
    
    // Movimientos: según ubicaciones involucradas
    match /movimientos/{movimientoId} {
      allow read, write: if request.auth != null && 
        (request.auth.token.ubicaciones_asignadas.has(resource.data.origen_id) ||
         request.auth.token.ubicaciones_asignadas.has(resource.data.destino_id) ||
         request.auth.token.rol == 'ADMIN_GLOBAL');
    }
    
    // Alertas: personalizadas por usuario
    match /alertas/{alertaId} {
      allow read: if request.auth != null && 
        resource.data.usuarios_notificados.has(request.auth.uid);
      allow write: if request.auth != null;
    }
  }
}
```

---

### **PASO 5: SERVICIOS FIREBASE**

#### 5.1 Crear servicio Firebase
```javascript
// src/services/firebaseService.js
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot 
} from 'firebase/firestore'
import { db } from '../config/firebase'

// Helper para crear referencias
const createRef = (collectionName, docId = null) => {
  return docId ? doc(db, collectionName, docId) : collection(db, collectionName)
}

// Helper para manejar errores
const handleFirestoreError = (error) => {
  console.error('Firestore Error:', error)
  throw new Error(`Error en Firestore: ${error.message}`)
}

// ============= EMPRESAS =============
export const getEmpresas = async () => {
  try {
    const q = query(createRef('empresas'), orderBy('nombre'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    handleFirestoreError(error)
  }
}

export const getEmpresa = async (empresaId) => {
  try {
    const docRef = createRef('empresas', empresaId)
    const docSnap = await getDoc(docRef)
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null
  } catch (error) {
    handleFirestoreError(error)
  }
}

// ============= USUARIOS =============
export const getUsuarios = async () => {
  try {
    const q = query(createRef('usuarios'), orderBy('nombre'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    handleFirestoreError(error)
  }
}

export const getUsuarioPorEmail = async (email) => {
  try {
    const q = query(createRef('usuarios'), where('email', '==', email))
    const snapshot = await getDocs(q)
    if (!snapshot.empty) {
      const doc = snapshot.docs[0]
      return { id: doc.id, ...doc.data() }
    }
    return null
  } catch (error) {
    handleFirestoreError(error)
  }
}

export const createUsuario = async (userData) => {
  try {
    const docRef = await addDoc(createRef('usuarios'), userData)
    return { id: docRef.id, ...userData }
  } catch (error) {
    handleFirestoreError(error)
  }
}

export const updateUsuario = async (userId, userData) => {
  try {
    const docRef = createRef('usuarios', userId)
    await updateDoc(docRef, userData)
    return { id: userId, ...userData }
  } catch (error) {
    handleFirestoreError(error)
  }
}

// ============= UBICACIONES =============
export const getUbicaciones = async (empresaId = null) => {
  try {
    let q = query(createRef('ubicaciones'), orderBy('nombre'))
    if (empresaId) {
      q = query(q, where('empresa_id', '==', empresaId))
    }
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    handleFirestoreError(error)
  }
}

// ============= PRODUCTOS =============
export const getProductos = async () => {
  try {
    const q = query(createRef('productos'), where('estado', '==', 'ACTIVO'), orderBy('nombre'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    handleFirestoreError(error)
  }
}

export const createProducto = async (productoData) => {
  try {
    const docRef = await addDoc(createRef('productos'), productoData)
    return { id: docRef.id, ...productoData }
  } catch (error) {
    handleFirestoreError(error)
  }
}

export const updateProducto = async (productoId, productoData) => {
  try {
    const docRef = createRef('productos', productoId)
    await updateDoc(docRef, productoData)
    return { id: productoId, ...productoData }
  } catch (error) {
    handleFirestoreError(error)
  }
}

export const deleteProducto = async (productoId) => {
  try {
    const docRef = createRef('productos', productoId)
    await updateDoc(docRef, { estado: 'ELIMINADO' })
    return { success: true }
  } catch (error) {
    handleFirestoreError(error)
  }
}

// ============= INVENTARIO =============
export const getInventario = async (ubicacionId = null) => {
  try {
    let q = query(createRef('inventario'))
    if (ubicacionId) {
      q = query(q, where('ubicacion_id', '==', ubicacionId))
    }
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    handleFirestoreError(error)
  }
}

export const updateInventario = async (inventarioId, stockData) => {
  try {
    const docRef = createRef('inventario', inventarioId)
    await updateDoc(docRef, {
      ...stockData,
      ultima_actualizacion: new Date().toISOString()
    })
    return { success: true }
  } catch (error) {
    handleFirestoreError(error)
  }
}

// ============= MOVIMIENTOS =============
export const getMovimientos = async (ubicacionId = null) => {
  try {
    let q = query(createRef('movimientos'), orderBy('fecha_creacion', 'desc'))
    if (ubicacionId) {
      q = query(q, where('origen_id', '==', ubicacionId))
    }
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    handleFirestoreError(error)
  }
}

export const createMovimiento = async (movimientoData) => {
  try {
    const docRef = await addDoc(createRef('movimientos'), movimientoData)
    
    // Crear detalles del movimiento
    if (movimientoData.productos && movimientoData.productos.length > 0) {
      const detallesRef = createRef('movimientos_detalle')
      for (const producto of movimientoData.productos) {
        await addDoc(detallesRef, {
          movimiento_id: docRef.id,
          producto_id: producto.producto_id,
          cantidad: producto.cantidad,
          observaciones: producto.observaciones || ''
        })
      }
    }
    
    return { id: docRef.id, ...movimientoData }
  } catch (error) {
    handleFirestoreError(error)
  }
}

export const confirmarMovimiento = async (movimientoId, confirmData) => {
  try {
    const docRef = createRef('movimientos', movimientoId)
    await updateDoc(docRef, {
      ...confirmData,
      estado: 'CONFIRMADA',
      fecha_confirmacion: new Date().toISOString().split('T')[0]
    })
    return { success: true }
  } catch (error) {
    handleFirestoreError(error)
  }
}

// ============= CONTEOS =============
export const getConteos = async (ubicacionId = null) => {
  try {
    let q = query(createRef('conteos'), orderBy('fecha_programada', 'desc'))
    if (ubicacionId) {
      q = query(q, where('ubicacion_id', '==', ubicacionId))
    }
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    handleFirestoreError(error)
  }
}

export const createConteo = async (conteoData) => {
  try {
    const docRef = await addDoc(createRef('conteos'), conteoData)
    return { id: docRef.id, ...conteoData }
  } catch (error) {
    handleFirestoreError(error)
  }
}

export const ejecutarConteo = async (conteoId, ejecucionData) => {
  try {
    const docRef = createRef('conteos', conteoId)
    await updateDoc(docRef, {
      ...ejecucionData,
      estado: 'COMPLETADO',
      fecha_completado: new Date().toISOString().split('T')[0]
    })
    
    // Guardar detalles del conteo
    if (ejecucionData.productos && ejecucionData.productos.length > 0) {
      const detallesRef = createRef('conteos_detalle')
      for (const producto of ejecucionData.productos) {
        await addDoc(detallesRef, {
          conteo_id: conteoId,
          ...producto
        })
      }
    }
    
    return { success: true }
  } catch (error) {
    handleFirestoreError(error)
  }
}

// ============= ALERTAS =============
export const getAlertas = async (usuarioId = null) => {
  try {
    let q = query(createRef('alertas'), orderBy('fecha_creacion', 'desc'))
    if (usuarioId) {
      q = query(q, where('usuarios_notificados', 'array-contains', usuarioId))
    }
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    handleFirestoreError(error)
  }
}

export const createAlerta = async (alertaData) => {
  try {
    const docRef = await addDoc(createRef('alertas'), alertaData)
    return { id: docRef.id, ...alertaData }
  } catch (error) {
    handleFirestoreError(error)
  }
}

// ============= REAL-TIME LISTENERS =============
export const subscribeToAlertas = (usuarioId, callback) => {
  const q = query(
    createRef('alertas'), 
    where('usuarios_notificados', 'array-contains', usuarioId),
    where('estado', '==', 'ACTIVA')
  )
  
  return onSnapshot(q, (snapshot) => {
    const alertas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    callback(alertas)
  })
}

export const subscribeToInventario = (ubicacionId, callback) => {
  const q = query(createRef('inventario'), where('ubicacion_id', '==', ubicacionId))
  
  return onSnapshot(q, (snapshot) => {
    const inventario = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    callback(inventario)
  })
}

export default {
  // Empresas
  getEmpresas,
  getEmpresa,
  
  // Usuarios
  getUsuarios,
  getUsuarioPorEmail,
  createUsuario,
  updateUsuario,
  
  // Ubicaciones
  getUbicaciones,
  
  // Productos
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto,
  
  // Inventario
  getInventario,
  updateInventario,
  
  // Movimientos
  getMovimientos,
  createMovimiento,
  confirmarMovimiento,
  
  // Conteos
  getConteos,
  createConteo,
  ejecutarConteo,
  
  // Alertas
  getAlertas,
  createAlerta,
  
  // Real-time
  subscribeToAlertas,
  subscribeToInventario
}
```

---

### **PASO 6: AUTENTICACIÓN FIREBASE**

#### 6.1 Servicio de autenticación
```javascript
// src/services/authService.js
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth'
import { auth } from '../config/firebase'
import { getUsuarioPorEmail } from './firebaseService'

export const loginConEmailPassword = async (email, password) => {
  try {
    // 1. Autenticar con Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const firebaseUser = userCredential.user
    
    // 2. Obtener datos adicionales del usuario desde Firestore
    const userData = await getUsuarioPorEmail(email)
    
    if (!userData) {
      throw new Error('Usuario no encontrado en el sistema')
    }
    
    // 3. Combinar datos de Firebase Auth y Firestore
    return {
      success: true,
      user: {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        ...userData
      },
      token: await firebaseUser.getIdToken()
    }
  } catch (error) {
    console.error('Error en login:', error)
    return {
      success: false,
      message: mapFirebaseError(error.code)
    }
  }
}

export const registrarUsuario = async (userData) => {
  try {
    // 1. Crear usuario en Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      userData.email, 
      userData.password
    )
    const firebaseUser = userCredential.user
    
    // 2. Actualizar perfil
    await updateProfile(firebaseUser, {
      displayName: userData.nombre
    })
    
    // 3. Guardar datos adicionales en Firestore
    const firestoreData = {
      ...userData,
      firebase_uid: firebaseUser.uid,
      fecha_creacion: new Date().toISOString().split('T')[0]
    }
    
    delete firestoreData.password // No guardar password en Firestore
    
    await createUsuario(firestoreData)
    
    return {
      success: true,
      user: {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: userData.nombre,
        ...firestoreData
      }
    }
  } catch (error) {
    console.error('Error en registro:', error)
    return {
      success: false,
      message: mapFirebaseError(error.code)
    }
  }
}

export const logout = async () => {
  try {
    await signOut(auth)
    return { success: true }
  } catch (error) {
    console.error('Error en logout:', error)
    return { success: false, message: 'Error al cerrar sesión' }
  }
}

export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      // Usuario autenticado, obtener datos completos
      const userData = await getUsuarioPorEmail(firebaseUser.email)
      callback({
        isAuthenticated: true,
        user: {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          ...userData
        }
      })
    } else {
      // Usuario no autenticado
      callback({
        isAuthenticated: false,
        user: null
      })
    }
  })
}

const mapFirebaseError = (errorCode) => {
  const errorMap = {
    'auth/user-not-found': 'Usuario no encontrado',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/email-already-in-use': 'El email ya está registrado',
    'auth/weak-password': 'La contraseña es muy débil',
    'auth/invalid-email': 'Email inválido',
    'auth/too-many-requests': 'Demasiados intentos, intenta más tarde',
    'auth/network-request-failed': 'Error de conexión',
    'default': 'Error desconocido'
  }
  
  return errorMap[errorCode] || errorMap['default']
}

export default {
  loginConEmailPassword,
  registrarUsuario,
  logout,
  onAuthStateChange
}
```

---

### **PASO 7: ACTUALIZAR DATASERVICE**

#### 7.1 Modificar dataService.js
```javascript
// src/services/dataService.js (modificaciones)

import * as firebaseService from './firebaseService'
import localStorageService from './localStorageService'

// Nueva constante para Firebase
const USE_FIREBASE = import.meta.env.VITE_USE_FIREBASE === 'true'

// Modificar cada función para incluir Firebase

// Ejemplo para getEmpresas
const dataService = {
  getEmpresas: async () => {
    if (USE_FIREBASE) {
      return await firebaseService.getEmpresas()
    }
    
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 300))
      return mockEmpresas
    }
    
    if (USE_GOOGLE_SHEETS) {
      return await googleSheetsAPI.getEmpresas()
    }
    
    return await api.getEmpresas()
  },
  
  // Login con Firebase
  login: async (email, password) => {
    if (USE_FIREBASE) {
      return await authService.loginConEmailPassword(email, password)
    }
    
    if (USE_MOCK_DATA) {
      return mockLogin(email, password)
    }
    
    if (USE_GOOGLE_SHEETS) {
      return await googleSheetsAPI.loginWithSheets(email, password)
    }
    
    return await api.login(email, password)
  },
  
  // ... actualizar todas las demás funciones
}
```

---

### **PASO 8: MIGRACIÓN DE DATOS**

#### 8.1 Script de migración
```javascript
// scripts/migrarDatos.js
import { 
  getEmpresas as getEmpresasSheets,
  getUsuarios as getUsuariosSheets,
  getProductos as getProductosSheets,
  getUbicaciones as getUbicacionesSheets,
  getInventario as getInventarioSheets
} from '../src/services/googleSheetsAPI.js'

import {
  createEmpresa,
  createUsuario,
  createProducto,
  createUbicacion,
  createInventario
} from '../src/services/firebaseService.js'

const migrarDatos = async () => {
  console.log('🚀 Iniciando migración de datos...')
  
  try {
    // 1. Migrar Empresas
    console.log('Migrando empresas...')
    const empresas = await getEmpresasSheets()
    for (const empresa of empresas) {
      await createEmpresa(empresa)
    }
    console.log(`✅ ${empresas.length} empresas migradas`)
    
    // 2. Migrar Usuarios
    console.log('Migrando usuarios...')
    const usuarios = await getUsuariosSheets()
    for (const usuario of usuarios) {
      await createUsuario(usuario)
    }
    console.log(`✅ ${usuarios.length} usuarios migrados`)
    
    // 3. Migrar Ubicaciones
    console.log('Migrando ubicaciones...')
    const ubicaciones = await getUbicacionesSheets()
    for (const ubicacion of ubicaciones) {
      await createUbicacion(ubicacion)
    }
    console.log(`✅ ${ubicaciones.length} ubicaciones migradas`)
    
    // 4. Migrar Productos
    console.log('Migrando productos...')
    const productos = await getProductosSheets()
    for (const producto of productos) {
      await createProducto(producto)
    }
    console.log(`✅ ${productos.length} productos migrados`)
    
    // 5. Migrar Inventario
    console.log('Migrando inventario...')
    const inventario = await getInventarioSheets()
    for (const item of inventario) {
      await createInventario(item)
    }
    console.log(`✅ ${inventario.length} items de inventario migrados`)
    
    console.log('🎉 Migración completada exitosamente!')
    
  } catch (error) {
    console.error('❌ Error en migración:', error)
  }
}

// Ejecutar migración
migrarDatos()
```

---

## 🎯 BENEFICIOS DE FIREBASE

### **✅ Ventajas Inmediatas**
- **Real-time**: Actualizaciones instantáneas
- **Offline**: Soporte offline automático
- **Escalabilidad**: Infraestructura gestionada
- **Seguridad**: Reglas granulares de acceso
- **Hosting**: Integrado con Vercel

### **📈 Mejoras Técnicas**
- Eliminar dependencia de Google Sheets
- Sincronización bidireccional
- Mejor rendimiento
- Mayor seguridad
- Soporte para múltiples usuarios simultáneos

---

## 🚀 SIGUIENTES PASOS

1. **Crear proyecto Firebase** (30 min)
2. **Instalar dependencias** (5 min)
3. **Configurar variables de entorno** (10 min)
4. **Implementar servicios** (2-3 horas)
5. **Migrar datos** (1 hora)
6. **Testing** (2 horas)
7. **Deploy a producción** (30 min)

**Tiempo total estimado: 6-8 horas**

---

## 📞 SOPORTE Y RECURSOS

- **Documentación Firebase**: https://firebase.google.com/docs
- **Firestore Rules**: https://firebase.google.com/docs/firestore/security/get-started
- **Firebase Auth**: https://firebase.google.com/docs/auth
- **Soporte**: Disponible para resolver dudas durante la implementación
