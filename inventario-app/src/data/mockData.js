// Mock data para desarrollo y testing

export const mockUsers = [
  {
    id: 1,
    nombre_completo: 'Admin Global',
    email: 'admin@muqui.com',
    rol: 'ADMIN_GLOBAL',
    empresa_id: 1,
    ubicacion_nombre: 'Todas las ubicaciones',
    estado: 'ACTIVO'
  },
  {
    id: 2,
    nombre_completo: 'Gerente Operativo',
    email: 'gerente@muqui.com',
    rol: 'GERENTE_OPERATIVO',
    empresa_id: 1,
    ubicacion_nombre: 'Bodega Principal',
    estado: 'ACTIVO'
  },
  {
    id: 3,
    nombre_completo: 'Jefe de Punto',
    email: 'jefe@muqui.com',
    rol: 'JEFE_PUNTO',
    empresa_id: 1,
    ubicacion_nombre: 'Punto de Venta 1',
    estado: 'ACTIVO'
  }
]

export const mockProductos = [
  {
    id: 1,
    nombre: 'TAPIOCA',
    especificacion: '3 KG',
    unidad_medida: 'UNIDAD',
    presentacion: 'UNIDAD',
    concatenado: 'TAPIOCA (3 KG) - UNIDAD',
    stock_minimo_default: 5,
    frecuencia_inventario: 'DIARIO',
    categoria: 'TAPIOCA',
    estado: 'ACTIVO'
  },
  {
    id: 2,
    nombre: 'TAPIOCA MUQUI',
    especificacion: 'KG',
    unidad_medida: 'KG',
    presentacion: 'UNIDAD',
    concatenado: 'TAPIOCA MUQUI (KG) - UNIDAD',
    stock_minimo_default: 20,
    frecuencia_inventario: 'DIARIO',
    categoria: 'TAPIOCA',
    estado: 'ACTIVO'
  },
  {
    id: 3,
    nombre: 'NATA DE COCO',
    especificacion: '5 KG',
    unidad_medida: 'BOLSA',
    presentacion: 'BOLSA',
    concatenado: 'NATA DE COCO (5 KG) - BOLSA',
    stock_minimo_default: 2,
    frecuencia_inventario: 'SEMANAL',
    categoria: 'TOPPINGS',
    estado: 'ACTIVO'
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

export const mockInventario = [
  {
    id: 1,
    producto_id: 1,
    producto: 'TAPIOCA (3 KG) - UNIDAD',
    ubicacion_id: 1,
    ubicacion_nombre: 'Bodega Principal',
    tipo_ubicacion: 'BODEGA',
    stock_actual: 25,
    stock_minimo: 5,
    unidad_medida: 'UNIDAD',
    categoria: 'TAPIOCA',
    es_importante: true,
    ultima_actualizacion: new Date().toISOString()
  },
  {
    id: 2,
    producto_id: 2,
    producto: 'TAPIOCA MUQUI (KG) - UNIDAD',
    ubicacion_id: 1,
    ubicacion_nombre: 'Bodega Principal',
    tipo_ubicacion: 'BODEGA',
    stock_actual: 45,
    stock_minimo: 20,
    unidad_medida: 'KG',
    categoria: 'TAPIOCA',
    es_importante: true,
    ultima_actualizacion: new Date().toISOString()
  },
  {
    id: 3,
    producto_id: 4,
    producto: 'TÉ VERDE (1.2 KG) - UNIDAD',
    ubicacion_id: 1,
    ubicacion_nombre: 'Bodega Principal',
    tipo_ubicacion: 'BODEGA',
    stock_actual: 3,
    stock_minimo: 5,
    unidad_medida: 'UNIDAD',
    categoria: 'TÉ',
    es_importante: true,
    ultima_actualizacion: new Date().toISOString()
  },
  {
    id: 4,
    producto_id: 6,
    producto: 'LECHE EN POLVO (25 KG) - BULTO',
    ubicacion_id: 1,
    ubicacion_nombre: 'Bodega Principal',
    tipo_ubicacion: 'BODEGA',
    stock_actual: 0,
    stock_minimo: 2,
    unidad_medida: 'BULTO',
    categoria: 'LÁCTEOS',
    es_importante: true,
    ultima_actualizacion: new Date().toISOString()
  },
  {
    id: 5,
    producto_id: 7,
    producto: 'LECHE LIQUIDA (900 ML) - UNIDAD',
    ubicacion_id: 2,
    ubicacion_nombre: 'Punto de Venta 1',
    tipo_ubicacion: 'PUNTO_VENTA',
    stock_actual: 8,
    stock_minimo: 16,
    unidad_medida: 'UNIDAD',
    categoria: 'LÁCTEOS',
    es_importante: true,
    ultima_actualizacion: new Date().toISOString()
  },
  {
    id: 6,
    producto_id: 8,
    producto: 'OREO (4 KG) - UNIDAD',
    ubicacion_id: 2,
    ubicacion_nombre: 'Punto de Venta 1',
    tipo_ubicacion: 'PUNTO_VENTA',
    stock_actual: 5,
    stock_minimo: 3,
    unidad_medida: 'UNIDAD',
    categoria: 'TOPPINGS',
    es_importante: false,
    ultima_actualizacion: new Date().toISOString()
  }
]

export const mockTransferencias = [
  {
    id: 1,
    origen_id: 1,
    origen_nombre: 'Bodega Principal',
    tipo_origen: 'BODEGA',
    destino_id: 2,
    destino_nombre: 'Punto de Venta 1',
    tipo_destino: 'PUNTO_VENTA',
    estado: 'PENDIENTE',
    usuario_creacion: 'Gerente Operativo',
    fecha_creacion: new Date().toISOString(),
    observaciones_creacion: 'Transferencia semanal de productos básicos',
    total_productos: 5,
    productos: [
      {
        producto_id: 1,
        producto_nombre: 'TAPIOCA (3 KG) - UNIDAD',
        cantidad_enviada: 10,
        cantidad_recibida: null
      },
      {
        producto_id: 7,
        producto_nombre: 'LECHE LIQUIDA (900 ML) - UNIDAD',
        cantidad_enviada: 24,
        cantidad_recibida: null
      }
    ]
  },
  {
    id: 2,
    origen_id: 1,
    origen_nombre: 'Bodega Principal',
    tipo_origen: 'BODEGA',
    destino_id: 3,
    destino_nombre: 'Punto de Venta 2',
    tipo_destino: 'PUNTO_VENTA',
    estado: 'CONFIRMADA',
    usuario_creacion: 'Gerente Operativo',
    usuario_confirmacion: 'Jefe de Punto 2',
    fecha_creacion: new Date(Date.now() - 86400000).toISOString(),
    fecha_confirmacion: new Date(Date.now() - 43200000).toISOString(),
    observaciones_creacion: 'Reabastecimiento urgente',
    observaciones_confirmacion: 'Recibido completo',
    total_productos: 3,
    productos: [
      {
        producto_id: 2,
        producto_nombre: 'TAPIOCA MUQUI (KG) - UNIDAD',
        cantidad_enviada: 15,
        cantidad_recibida: 15,
        diferencia: 0
      }
    ]
  }
]

export const mockConteos = [
  {
    id: 1,
    ubicacion_id: 2,
    ubicacion_nombre: 'Punto de Venta 1',
    tipo_ubicacion: 'PUNTO_VENTA',
    tipo_conteo: 'DIARIO',
    estado: 'PENDIENTE',
    usuario_responsable: 'Jefe de Punto 1',
    fecha_programada: new Date().toISOString(),
    observaciones: 'Conteo diario de productos importantes'
  },
  {
    id: 2,
    ubicacion_id: 1,
    ubicacion_nombre: 'Bodega Principal',
    tipo_ubicacion: 'BODEGA',
    tipo_conteo: 'SEMANAL',
    estado: 'COMPLETADO',
    usuario_responsable: 'Gerente Operativo',
    usuario_ejecutor: 'Gerente Operativo',
    fecha_programada: new Date(Date.now() - 86400000).toISOString(),
    fecha_inicio: new Date(Date.now() - 82800000).toISOString(),
    fecha_completado: new Date(Date.now() - 79200000).toISOString(),
    observaciones: 'Conteo semanal completo',
    productos: [
      {
        producto_id: 1,
        producto_nombre: 'TAPIOCA (3 KG) - UNIDAD',
        cantidad_sistema: 25,
        cantidad_fisica: 25,
        diferencia: 0,
        contado: true
      },
      {
        producto_id: 4,
        producto_nombre: 'TÉ VERDE (1.2 KG) - UNIDAD',
        cantidad_sistema: 5,
        cantidad_fisica: 3,
        diferencia: -2,
        contado: true
      }
    ]
  }
]

export const mockAlertas = [
  {
    id: 1,
    tipo: 'STOCK_MINIMO',
    prioridad: 'CRITICA',
    entidad_relacionada_id: 4,
    tipo_entidad: 'INVENTARIO',
    ubicacion_id: 1,
    ubicacion_nombre: 'Bodega Principal',
    mensaje: 'LECHE EN POLVO (25 KG) - SIN STOCK',
    estado: 'ACTIVA',
    fecha_creacion: new Date().toISOString()
  },
  {
    id: 2,
    tipo: 'STOCK_MINIMO',
    prioridad: 'ALTA',
    entidad_relacionada_id: 3,
    tipo_entidad: 'INVENTARIO',
    ubicacion_id: 1,
    ubicacion_nombre: 'Bodega Principal',
    mensaje: 'TÉ VERDE (1.2 KG) - Stock por debajo del mínimo (3/5)',
    estado: 'ACTIVA',
    fecha_creacion: new Date().toISOString()
  },
  {
    id: 3,
    tipo: 'TRANSFERENCIA_SIN_CONFIRMAR',
    prioridad: 'MEDIA',
    entidad_relacionada_id: 1,
    tipo_entidad: 'TRANSFERENCIA',
    ubicacion_id: 2,
    ubicacion_nombre: 'Punto de Venta 1',
    mensaje: 'Transferencia #1 pendiente de confirmación',
    estado: 'ACTIVA',
    fecha_creacion: new Date().toISOString()
  },
  {
    id: 4,
    tipo: 'CONTEO_PENDIENTE',
    prioridad: 'MEDIA',
    entidad_relacionada_id: 1,
    tipo_entidad: 'CONTEO',
    ubicacion_id: 2,
    ubicacion_nombre: 'Punto de Venta 1',
    mensaje: 'Conteo diario programado para hoy',
    estado: 'ACTIVA',
    fecha_creacion: new Date().toISOString()
  },
  {
    id: 5,
    tipo: 'STOCK_MINIMO',
    prioridad: 'ALTA',
    entidad_relacionada_id: 5,
    tipo_entidad: 'INVENTARIO',
    ubicacion_id: 2,
    ubicacion_nombre: 'Punto de Venta 1',
    mensaje: 'LECHE LIQUIDA (900 ML) - Stock por debajo del mínimo (8/16)',
    estado: 'ACTIVA',
    fecha_creacion: new Date().toISOString()
  }
]

export const mockUbicaciones = [
  {
    id: 1,
    nombre: 'Bodega Principal',
    tipo: 'BODEGA',
    empresa_id: 1,
    empresa_nombre: 'Corporativo Muqui',
    direccion: 'Calle Principal 123',
    responsable: 'Gerente Operativo',
    estado: 'ACTIVO'
  },
  {
    id: 2,
    nombre: 'Punto de Venta 1',
    tipo: 'PUNTO_VENTA',
    empresa_id: 1,
    empresa_nombre: 'Corporativo Muqui',
    bodega_principal_id: 1,
    direccion: 'Centro Comercial A, Local 15',
    responsable: 'Jefe de Punto 1',
    estado: 'ACTIVO'
  },
  {
    id: 3,
    nombre: 'Punto de Venta 2',
    tipo: 'PUNTO_VENTA',
    empresa_id: 1,
    empresa_nombre: 'Corporativo Muqui',
    bodega_principal_id: 1,
    direccion: 'Avenida Principal 456',
    responsable: 'Jefe de Punto 2',
    estado: 'ACTIVO'
  }
]

// Helper para login mock
export const mockLogin = (email, password) => {
  // Contraseña por defecto: admin123
  if (password !== 'admin123') {
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
  mockProductos,
  mockInventario,
  mockTransferencias,
  mockConteos,
  mockAlertas,
  mockUbicaciones,
  mockLogin
}
