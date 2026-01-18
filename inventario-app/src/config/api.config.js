// Configuración centralizada de API
export const API_CONFIG = {
  // Google Sheets API (FASE 1)
  SHEETS_API_URL: import.meta.env.VITE_GOOGLE_SHEETS_API_URL || '',

  // API Key y OAuth 2.0 Client IDs
  API_KEY: import.meta.env.VITE_GOOGLE_API_KEY || '',
  OAUTH_CLIENT_ID: import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || '',
  OAUTH_CLIENT_SECRET: import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_SECRET || '',

  // Base datos de Google Sheets (lectura)
  GOOGLE_SHEETS_DB: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ_aMuS5pJgbQ4ua-a1sGhvW5TbqwkjnFukuDxXelcn-k9KeT1wHl79hSMpLnhO2-3KPB0pnKFxG-8g/pub?output=csv',

  // Firebase (FASE 2 - preparado)
  FIREBASE_ENABLED: import.meta.env.VITE_ENABLE_FIREBASE === 'true',

  // Timeouts
  REQUEST_TIMEOUT: 30000,

  // Endpoints
  ENDPOINTS: {
    LOGIN: '?action=login',
    GET_PRODUCTOS: '?action=getProductos',
    GET_INVENTARIO: '?action=getInventario',
    CREATE_TRANSFERENCIA: '?action=createTransferencia',
    CONFIRMAR_TRANSFERENCIA: '?action=confirmarTransferencia',
    GET_MOVIMIENTOS: '?action=getMovimientos',
    CREATE_CONTEO: '?action=createConteo',
    GET_CONTEOS: '?action=getConteos',
    EJECUTAR_CONTEO: '?action=ejecutarConteo',
    GET_ALERTAS: '?action=getAlertas',
    GET_REPORTE_STOCK: '?action=getReporteStock'
  }
}
