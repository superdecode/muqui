/**
 * Script para inicializar configuración de notificaciones en Firestore
 * Ejecutar: node scripts/init-config-notificaciones.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Configurar credenciales - ajustar ruta según tu proyecto
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');

try {
  const serviceAccount = require(serviceAccountPath);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log('✅ Firebase Admin inicializado correctamente');
} catch (error) {
  console.error('❌ Error inicializando Firebase Admin:', error.message);
  console.log('\n📝 INSTRUCCIONES:');
  console.log('1. Descarga tu Service Account Key desde Firebase Console');
  console.log('2. Guárdalo como serviceAccountKey.json en la raíz del proyecto');
  console.log('3. Vuelve a ejecutar este script\n');
  process.exit(1);
}

const db = admin.firestore();

async function initConfig() {
  try {
    console.log('\n🔧 Creando configuración de notificaciones...\n');
    
    // Configuración global de notificaciones
    const configData = {
      // Notificaciones de conteo
      horario_notificaciones_conteo: "08:00",
      frecuencia_conteo_dias: 7,
      notificaciones_conteo_activas: true,
      
      // Configuración general
      timezone: "America/Mexico_City",
      
      // Metadatos
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      version: "1.0.0"
    };
    
    await db.collection('configuracion_notificaciones').doc('global').set(configData);
    
    console.log('✅ Configuración creada exitosamente:');
    console.log('   - Horario de notificaciones: 08:00 AM');
    console.log('   - Frecuencia de conteos: 7 días');
    console.log('   - Notificaciones activas: Sí');
    console.log('   - Zona horaria: America/Mexico_City\n');
    
    // Verificar que se creó correctamente
    const doc = await db.collection('configuracion_notificaciones').doc('global').get();
    if (doc.exists) {
      console.log('✅ Verificación exitosa - Documento creado en Firestore\n');
      console.log('📋 Datos guardados:');
      console.log(JSON.stringify(doc.data(), null, 2));
    }
    
    console.log('\n🎉 Inicialización completada exitosamente\n');
    console.log('📝 Próximos pasos:');
    console.log('1. Desplegar Cloud Functions: cd functions && npm install && firebase deploy --only functions');
    console.log('2. Verificar logs: firebase functions:log --only verificarConteosPendientes');
    console.log('3. Probar manualmente: firebase functions:shell\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creando configuración:', error);
    process.exit(1);
  }
}

// Ejecutar
initConfig();
