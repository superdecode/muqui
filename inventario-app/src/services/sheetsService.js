// Google Sheets Service - FASE 1
// Este servicio maneja la comunicación directa con Google Sheets

import { API_CONFIG } from '../config/api.config'

export const sheetsService = {
  // Leer datos desde Google Sheets público
  fetchSheetData: async () => {
    try {
      const response = await fetch(API_CONFIG.GOOGLE_SHEETS_DB)
      const csvData = await response.text()
      return parseCSV(csvData)
    } catch (error) {
      console.error('Error fetching sheet data:', error)
      throw error
    }
  },

  // Parsear CSV a JSON
  parseCSV: (csvText) => {
    const lines = csvText.split('\n')
    const headers = lines[0].split(',')
    const data = []

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',')
        const row = {}
        headers.forEach((header, index) => {
          row[header.trim()] = values[index]?.trim() || ''
        })
        data.push(row)
      }
    }

    return data
  }
}

// Función helper para parsear CSV
function parseCSV(csvText) {
  const lines = csvText.split('\n')
  if (lines.length === 0) return []

  const headers = lines[0].split(',').map(h => h.trim())
  const data = []

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(',')
      const row = {}
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || ''
      })
      data.push(row)
    }
  }

  return data
}

export default sheetsService
