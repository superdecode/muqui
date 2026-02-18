/**
 * Script para poblar la colección razones_merma con datos iniciales
 * Ejecutar desde la consola del navegador: window.seedRazonesMerma()
 */

import { collection, doc, setDoc, getDocs, serverTimestamp } from 'firebase/firestore'
import { getDB } from '../config/firebase.config'

const RAZONES_INICIALES = [
  { nombre: 'DAÑO', descripcion: 'Producto dañado físicamente' },
  { nombre: 'PRODUCTO VENCIDO', descripcion: 'Producto que ha superado su fecha de vencimiento' },
  { nombre: 'MERMA', descripcion: 'Pérdida natural del producto' },
  { nombre: 'ROBO', descripcion: 'Producto robado o extraviado' }
]

export async function seedRazonesMerma() {
  try {
    const db = getDB()
    const razonesMermaRef = collection(db, 'razones_merma')
    
    // Verificar si ya existen razones
    const existingDocs = await getDocs(razonesMermaRef)
    if (existingDocs.size > 0) {
      console.log('⚠️ La colección razones_merma ya contiene datos. No se sobrescribirán.')
      console.log(`Razones existentes: ${existingDocs.size}`)
      return { success: false, message: 'La colección ya tiene datos' }
    }
    
    console.log('📝 Creando razones de merma iniciales...')
    
    for (const razon of RAZONES_INICIALES) {
      const razonRef = doc(razonesMermaRef)
      await setDoc(razonRef, {
        nombre: razon.nombre,
        descripcion: razon.descripcion,
        fecha_creacion: serverTimestamp(),
        estado: 'ACTIVO'
      })
      console.log(`✅ Creada: ${razon.nombre}`)
    }
    
    console.log('✅ Razones de merma creadas exitosamente!')
    return { success: true, message: 'Razones de merma creadas exitosamente' }
  } catch (error) {
    console.error('❌ Error al crear razones de merma:', error)
    return { success: false, message: error.message }
  }
}

// Hacer disponible en window para ejecutar desde consola
if (typeof window !== 'undefined') {
  window.seedRazonesMerma = seedRazonesMerma
}
