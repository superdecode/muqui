// Mock data para desarrollo y testing

export const mockUsers = [
  {
    id: 'USR001',
    nombre: 'Admin Global',
    email: 'muqui.coo@gmail.com',
    password: 'temporal123',
    rol: 'ADMIN_GLOBAL',
    empresa_id: 'MK001',
    ubicaciones_asignadas: ['LM001', 'LM002', 'LM003', 'LM004', 'LM005', 'LM006', 'LM007'],
    estado: 'ACTIVO',
    fecha_creacion: '2025-01-01'
  },
  {
    id: 'USR002',
    nombre: 'Gerente Operativo',
    email: 'gerente@muqui.com',
    password: 'temporal123',
    rol: 'GERENTE_OPERATIVO',
    empresa_id: 'MK001',
    ubicaciones_asignadas: ['LM001', 'LM004', 'LM005'],
    estado: 'ACTIVO',
    fecha_creacion: '2025-01-01'
  }
]

export const mockEmpresas = [
  {
    id: 'MK001',
    nombre: 'Muqui',
    tipo: 'CORPORATIVO',
    estado: 'ACTIVO',
    fecha_creacion: '2025-01-01'
  },
  {
    id: 'MK010',
    nombre: 'Quiron Elements',
    tipo: 'FRANQUICIADO',
    estado: 'ACTIVO',
    fecha_creacion: '2025-01-01'
  },
  {
    id: 'MK040',
    nombre: 'Capital Alliance',
    tipo: 'FRANQUICIADO',
    estado: 'ACTIVO',
    fecha_creacion: '2025-01-01'
  },
  {
    id: 'MK050',
    nombre: 'El Rancho de Solrach',
    tipo: 'FRANQUICIADO',
    estado: 'ACTIVO',
    fecha_creacion: '2025-01-01'
  }
]

export const mockProductos = [
  {
    id: 'PROD001',
    nombre: 'TAPIOCA',
    especificacion: '3 KG',
    unidad_medida: 'UNIDAD',
    concatenado: 'TAPIOCA (3 KG) - UNIDAD',
    stock_minimo: 5,
    frecuencia_inventario_Dias: 1,
    categoria: 'IMPORTANTE',
    estado: 'ACTIVO',
    ubicacion_id: ['LM001', 'LM004', 'LM005', 'LM006', 'LM007']
  },
  {
    id: 'PROD002',
    nombre: 'TAPIOCA MUQUI',
    especificacion: 'KG',
    unidad_medida: 'UNIDAD',
    concatenado: 'TAPIOCA MUQUI (KG) - UNIDAD',
    stock_minimo: 20,
    frecuencia_inventario_Dias: 1,
    categoria: 'IMPORTANTE',
    estado: 'ACTIVO',
    ubicacion_id: ['LM001', 'LM004', 'LM005']
  },
  {
    id: 'PROD003',
    nombre: 'NATA DE COCO',
    especificacion: '5 KG',
    unidad_medida: 'BOLSA',
    concatenado: 'NATA DE COCO (5 KG) - BOLSA',
    stock_minimo: 2,
    frecuencia_inventario_Dias: 7,
    categoria: 'TOPPINGS',
    estado: 'ACTIVO',
    ubicacion_id: ['LM001', 'LM004', 'LM005', 'LM006']
  },
  {
    id: 4,
    nombre: 'TÉ VERDE',
    especificacion: '1.2 KG',
    unidad_medida: 'UNIDAD',
    presentacion: 'UNIDAD',
    concatenado: 'TÉ VERDE (1.2 KG) - UNIDAD',
    stock_minimo_default: 5,
    frecuencia_inventario: 'SEMANAL',
    categoria: 'TÉ',
    estado: 'ACTIVO'
  },
  {
    id: 5,
    nombre: 'TÉ NEGRO',
    especificacion: '1.2 KG',
    unidad_medida: 'UNIDAD',
    presentacion: 'UNIDAD',
    concatenado: 'TÉ NEGRO (1.2 KG) - UNIDAD',
    stock_minimo_default: 5,
    frecuencia_inventario: 'SEMANAL',
    categoria: 'TÉ',
    estado: 'ACTIVO'
  },
  {
    id: 6,
    nombre: 'LECHE EN POLVO',
    especificacion: '25 KG',
    unidad_medida: 'BULTO',
    presentacion: 'BULTO',
    concatenado: 'LECHE EN POLVO (25 KG) - BULTO',
    stock_minimo_default: 2,
    frecuencia_inventario: 'QUINCENAL',
    categoria: 'LÁCTEOS',
    estado: 'ACTIVO'
  },
  {
    id: 7,
    nombre: 'LECHE LIQUIDA',
    especificacion: '900 ML',
    unidad_medida: 'UNIDAD',
    presentacion: 'UNIDAD',
    concatenado: 'LECHE LIQUIDA (900 ML) - UNIDAD',
    stock_minimo_default: 16,
    frecuencia_inventario: 'DIARIO',
    categoria: 'LÁCTEOS',
    estado: 'ACTIVO'
  },
  {
    id: 8,
    nombre: 'OREO',
    especificacion: '4 KG',
    unidad_medida: 'UNIDAD',
    presentacion: 'UNIDAD',
    concatenado: 'OREO (4 KG) - UNIDAD',
    stock_minimo_default: 3,
    frecuencia_inventario: 'SEMANAL',
    categoria: 'TOPPINGS',
    estado: 'ACTIVO'
  },
  {
    id: 9,
    nombre: 'CAFÉ LIOFILIZADO JUAN VALDEZ',
    especificacion: '250 GR',
    unidad_medida: 'UNIDAD',
    presentacion: 'UNIDAD',
    concatenado: 'CAFÉ LIOFILIZADO JUAN VALDEZ (250 GR) - UNIDAD',
    stock_minimo_default: 2,
    frecuencia_inventario: 'SEMANAL',
    categoria: 'CAFÉ',
    estado: 'ACTIVO'
  },
  {
    id: 10,
    nombre: 'AZÚCAR',
    especificacion: '1 LB',
    unidad_medida: 'BOLSA',
    presentacion: 'BOLSA',
    concatenado: 'AZÚCAR (1 LB) - BOLSA',
    stock_minimo_default: 6,
    frecuencia_inventario: 'DIARIO',
    categoria: 'OTROS',
    estado: 'ACTIVO'
  }
]

export const mockUbicaciones = [
  {
    id: 'LM001',
    nombre: 'Bodega Principal Corporativa',
    empresa_id: 'MK001',
    direccion: 'Dirección Bodega 1',
    responsable_id: 'USR001',
    tipo_ubicacion: 'BODEGA',
    estado: 'ACTIVO',
    fecha_creacion: '2025-01-01'
  },
  {
    id: 'LM004',
    nombre: 'San Pedro Plaza',
    empresa_id: 'MK010',
    direccion: 'Neiva, Huila',
    responsable_id: 'USR002',
    tipo_ubicacion: 'PUNTO_VENTA',
    estado: 'ACTIVO',
    fecha_creacion: '2025-01-01'
  },
  {
    id: 'LM005',
    nombre: 'Santa Lucia',
    empresa_id: 'MK001',
    direccion: 'Neiva, Huila',
    responsable_id: 'USR002',
    tipo_ubicacion: 'PUNTO_VENTA',
    estado: 'ACTIVO',
    fecha_creacion: '2025-01-01'
  },
  {
    id: 'LM006',
    nombre: 'Unico',
    empresa_id: 'MK010',
    direccion: 'Neiva, Huila',
    responsable_id: 'USR002',
    tipo_ubicacion: 'PUNTO_VENTA',
    estado: 'ACTIVO',
    fecha_creacion: '2025-01-01'
  },
  {
    id: 'LM007',
    nombre: 'Megamall',
    empresa_id: 'MK040',
    direccion: 'Bucaramanga, Stder',
    responsable_id: 'USR002',
    tipo_ubicacion: 'PUNTO_VENTA',
    estado: 'ACTIVO',
    fecha_creacion: '2025-01-01'
  }
]

export const mockInventario = [
  {
    id: 'INV001',
    producto_id: 'PROD001',
    producto: 'TAPIOCA',
    ubicacion_id: 'LM001',
    ubicacion: 'Bodega Principal Corporativa',
    stock_actual: 50,
    especificacion: '3KG',
    unidad_medida: 'UNIDAD',
    categoria: 'IMPORTANTE',
    ultima_actualizacion: '2025-01-15 10:00:00'
  },
  {
    id: 'INV002',
    producto_id: 'PROD002',
    producto: 'TAPIOCA MUQUI',
    ubicacion_id: 'LM001',
    ubicacion: 'Bodega Principal Corporativa',
    stock_actual: 45,
    especificacion: 'KG',
    unidad_medida: 'UNIDAD',
    categoria: 'IMPORTANTE',
    ultima_actualizacion: '2025-01-15 10:00:00'
  },
  {
    id: 'INV003',
    producto_id: 'PROD003',
    producto: 'NATA DE COCO',
    ubicacion_id: 'LM001',
    ubicacion: 'Bodega Principal Corporativa',
    stock_actual: 12,
    especificacion: '5KG',
    unidad_medida: 'BOLSA',
    categoria: 'TOPPINGS',
    ultima_actualizacion: '2025-01-15 10:00:00'
  },
  {
    id: 'INV004',
    producto_id: 'PROD001',
    producto: 'TAPIOCA',
    ubicacion_id: 'LM005',
    ubicacion: 'Santa Lucia',
    stock_actual: 8,
    especificacion: '3KG',
    unidad_medida: 'UNIDAD',
    categoria: 'IMPORTANTE',
    ultima_actualizacion: '2025-01-15 10:00:00'
  }
]

export const mockTransferencias = [
  {
    id: 'MV001',
    tipo_movimiento: 'TRANSFERENCIA',
    origen_id: 'LM001',
    destino_id: 'LM005',
    estado: 'PENDIENTE',
    usuario_creacion_id: 'USR002',
    fecha_creacion: new Date().toISOString(),
    observaciones_creacion: 'Pedido semanal',
    total_productos: 2,
    productos: [
      { nombre: 'TAPIOCA', cantidad: 10 },
      { nombre: 'TAPIOCA MUQUI', cantidad: 15 }
    ]
  },
  {
    id: 'MV002',
    tipo_movimiento: 'TRANSFERENCIA',
    origen_id: 'LM001',
    destino_id: 'LM004',
    estado: 'CONFIRMADA',
    usuario_creacion_id: 'USR002',
    usuario_confirmacion_id: 'USR002',
    fecha_creacion: new Date(Date.now() - 86400000).toISOString(),
    fecha_confirmacion: new Date(Date.now() - 43200000).toISOString(),
    observaciones_creacion: 'Reabastecimiento',
    observaciones_confirmacion: 'Recibido completo',
    total_productos: 1,
    productos: [
      { nombre: 'NATA DE COCO', cantidad: 5 }
    ]
  }
]

export const mockConteos = [
  {
    id: 'CONT001',
    ubicacion_id: 'LM004',
    tipo_ubicacion: 'PUNTO_VENTA',
    tipo_conteo: 'SEMANAL',
    estado: 'PENDIENTE',
    usuario_responsable_id: 'USR002',
    fecha_programada: new Date().toISOString(),
    observaciones: 'Conteo semanal rutinario',
    productos: [
      { nombre: 'TAPIOCA', stock_sistema: 8, stock_fisico: null },
      { nombre: 'TAPIOCA MUQUI', stock_sistema: 12, stock_fisico: null }
    ]
  },
  {
    id: 'CONT002',
    ubicacion_id: 'LM001',
    tipo_ubicacion: 'BODEGA',
    tipo_conteo: 'SEMANAL',
    estado: 'COMPLETADO',
    usuario_responsable_id: 'USR002',
    usuario_ejecutor_id: 'USR002',
    fecha_programada: new Date(Date.now() - 86400000).toISOString(),
    fecha_inicio: new Date(Date.now() - 82800000).toISOString(),
    fecha_completado: new Date(Date.now() - 79200000).toISOString(),
    observaciones: 'Conteo semanal completo',
    productos: [
      { nombre: 'TAPIOCA', stock_sistema: 50, stock_fisico: 50 },
      { nombre: 'TAPIOCA MUQUI', stock_sistema: 45, stock_fisico: 43 }
    ]
  }
]

export const mockAlertas = [
  {
    id: 'ALERT001',
    tipo: 'TRANSFERENCIA_SIN_CONFIRMAR',
    prioridad: 'MEDIA',
    entidad_relacionada_id: 'MV001',
    tipo_entidad: 'TRANSFERENCIA',
    ubicacion_id: 'LM005',
    mensaje: 'Transferencia MV001 pendiente de confirmación',
    estado: 'ACTIVA',
    usuarios_notificados: ['USR002'],
    fecha_creacion: new Date().toISOString(),
    fecha_resolucion: null
  },
  {
    id: 'ALERT002',
    tipo: 'STOCK_BAJO',
    prioridad: 'ALTA',
    entidad_relacionada_id: 'INV004',
    tipo_entidad: 'INVENTARIO',
    ubicacion_id: 'LM005',
    mensaje: 'TAPIOCA - Stock bajo (8 unidades)',
    estado: 'ACTIVA',
    usuarios_notificados: ['USR002'],
    fecha_creacion: new Date().toISOString(),
    fecha_resolucion: null
  },
  {
    id: 'ALERT003',
    tipo: 'CONTEO_PENDIENTE',
    prioridad: 'MEDIA',
    entidad_relacionada_id: 'CONT001',
    tipo_entidad: 'CONTEO',
    ubicacion_id: 'LM004',
    mensaje: 'Conteo diario programado para hoy',
    estado: 'ACTIVA',
    fecha_creacion: new Date().toISOString()
  },
  {
    id: 'ALERT004',
    tipo: 'STOCK_BAJO',
    prioridad: 'ALTA',
    entidad_relacionada_id: 'INV003',
    tipo_entidad: 'INVENTARIO',
    ubicacion_id: 'LM001',
    mensaje: 'NATA DE COCO - Stock disponible',
    estado: 'ACTIVA',
    usuarios_notificados: ['USR002'],
    fecha_creacion: new Date().toISOString(),
    fecha_resolucion: null
  }
]

// Helper para login mock
export const mockLogin = (email, password) => {
  // Contraseña por defecto: temporal123
  if (password !== 'temporal123' && password !== 'admin123') {
    return {
      success: false,
      message: 'Contraseña incorrecta'
    }
  }

  const user = mockUsers.find(u => u.email === email)

  if (!user) {
    return {
      success: false,
      message: 'Usuario no encontrado'
    }
  }

  return {
    success: true,
    user: user,
    token: `mock_token_${user.id}_${Date.now()}`
  }
}

export default {
  mockUsers,
  mockEmpresas,
  mockProductos,
  mockInventario,
  mockTransferencias,
  mockConteos,
  mockAlertas,
  mockUbicaciones,
  mockLogin
}
