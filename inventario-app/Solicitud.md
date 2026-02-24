SISTEMA DE SOLICITUDES DE TRANSFERENCIA - ESPECIFICACIÓN COMPLETA

═══════════════════════════════════════════════════════════════════════════════

RESTRUCTURACIÓN DE MÓDULOS

ACTUALMENTE:
Módulo "Movimientos" con tabs: Salidas | Recepciones

NUEVA ESTRUCTURA:
1. Módulo "Solicitudes" (nuevo)
   - Tab: Creadas
   - Tab: Recibidas

2. Módulo "Recepciones" (separado)
   - Tarjetas superiores: Pendientes | Completadas
   - Tabla con todas las recepciones

3. Módulo "Salidas" (separado)
   - Tarjetas superiores: Pendientes | Completadas
   - Tabla con todas las salidas

ORDEN EN MENÚ: Solicitudes → Recepciones → Salidas
preservar toda la logica y funcionalidades, por ejemplo tarjetas superiores son reactivas 

═══════════════════════════════════════════════════════════════════════════════

MÓDULO SOLICITUDES - LÓGICA Y FLUJO

PESTAÑA: Mis Solicitudes

Muestra solicitudes creadas por el usuario actual.

CREAR NUEVA SOLICITUD:
- Botón "Nueva Solicitud"
- Formulario similar a crear transferencia/salida: (solo aplica trasnferiencia en tipo de movimiento)
* Fecha de creacion y usuario creacion
  * Ubicación Destino: ubicación actual del usuario (desde donde solicita) ( en los demas modulos seria ubicacion origen aqui solo cambia el nombre ya que se invierte logica)
  * Ubicación Origen: selector filtrado por empresas asignadas al usuario (en otros modulos seria ubicacion destino aqui solo cambia el nombre ya que se invierte logica)
    - Si usuario tiene todas las empresas: mostrar todas las ubicaciones
    - Si usuario tiene empresas limitadas: solo ubicaciones de esas empresas
* Una vez confirmada desde (recibidas) Fecha Confirmacion y Usuario Confirmacion o de cancelacion
  * Productos: multi-selección con cantidades (igual que trasnferencia salida)

VALIDACIONES:
- Usuario debe tener ubicación destino en ubicaciones_asignadas (es la ubicacion del usuario donde llegara los productos)
- Usuario debe tener permiso "crear_solicitudes" permisos nivel escritura hacia arriba
- Productos deben estar en ubicaciones_permitidas de ubicación destino
- Ubicacion origen deben estar disponibles todas las de las empresas asignadas al usuario ( es desde donde se despachara los prodcutos)

ESTADOS EN Mis solicitudes:
1. "Iniciada" - Solicitud guardada pero no enviada (puede editar)
2. "Enviada" - Solicitud confirmada y enviada (no puede editar)
3. Canceladas - Solicitud cancelada por el usuario que la creo

FLUJO:
Usuario crea solicitud → estado "Iniciada" → puede editar → Botón "Enviar Solicitud" → cambia a estado "enviada" → genera notificación → aparece en tab Recibidas de usuarios destino ya no se puede editar
Boton cancelar solo cuando esta en estado "Iniciada"
───────────────────────────────────────────────────────────────────────────────

PESTAÑA: Recibidas

Muestra solicitudes recibidas donde ubicación destino está en ubicaciones_asignadas del usuario.

ESTADOS EN RECIBIDAS:
1. "recibida" - Solicitud enviada, pendiente de procesar
2. "procesada" - Solicitud convertida en salida/transferencia
3. "cancelada" - Solicitud cancelada por el usuario

ACCIONES DISPONIBLES:

Para solicitud en estado "recibida":
- Botón "Procesar Solicitud"
- Abre modal/formulario pre-llenado con datos de solicitud:
  * Ubicación Origen: ubicacionDestino de solicitud (desde donde sale)
  * Ubicación Destino: ubicacionOrigen de solicitud (hacia donde va)
  * Productos con cantidades solicitadas
  * Campos editables:
    - Cantidad Solicitada (read-only, referencia)
    - Cantidad a Enviar (prepoblada con datos de cantidad solicitada, editable, puede ser diferente)

- Usuario puede ajustar cantidades
- Boton Cancelar 
- Botón "Confirmar"
- Al confirmar:
  * Crea documento en colección "salidas" con datos procesados de tipo transferencia
  * Crea documento en colección "recepciones" vinculado (lógica normal)
  * Actualiza estado de solicitud a "procesada"
  * Vincula solicitud_id en documentos de salida para trazabilidad

Para solicitud en estado "procesada":
- Solo visualización
- Muestra tabla con detalles
- Muestra codigo de movimiento de salida en la cabezera claramente con icono SVG de salida (enlace a salida/transferencia generada )
- No permite edición

Para solicitud en estado "cancelada"
- Solo visualización
- No permite edición
═══════════════════════════════════════════════════════════════════════════════

MODELO DE DATOS

COLECCIÓN: solicitudes

Debes crear las colecciones segun correspondan teniendo enc uanta toda la logica descrita
═══════════════════════════════════════════════════════════════════════════════

NOTIFICACIONES

AL ENVIAR SOLICITUD:
- Tipo: "solicitud_recibida"
- Destinatarios: usuarios con ubicacionDestino en ubicaciones_asignadas
- Mensaje: "Nueva solicitud de {producto} desde {ubicacionOrigen}"
- accionUrl: "/solicitudes?tab=recibidas&filtro=recibida"
- Click lleva a módulo Solicitudes, tab Recibidas, filtro recibida

═══════════════════════════════════════════════════════════════════════════════

SEPARACIÓN DE MÓDULOS EXISTENTES
Desde crear submodulos en el sidebar para modulo principal de movimientos

MÓDULO RECEPCIONES (extraído de Movimientos)

TARJETAS SUPERIORES:
1. Recepciones Pendientes - contador donde estado == "pendiente"
2. Recepciones Completadas - contador donde estado == "completada"
Click en tarjeta aplica filtro correspondiente

CONTENIDO:
- Tabla con todas las recepciones del usuario según ubicaciones_asignadas
- Filtros: estado, fecha, ubicación
- Acciones: Ver detalles, Completar recepción (si pendiente)

───────────────────────────────────────────────────────────────────────────────

MÓDULO SALIDAS (extraído de Movimientos)

TARJETAS SUPERIORES:
1. Salidas Pendientes - contador donde estado == "pendiente"
2. Salidas Completadas - contador donde estado == "completada"
Click en tarjeta aplica filtro correspondiente

CONTENIDO:
- Tabla con todas las salidas del usuario según ubicaciones_asignadas
- Filtros: estado, fecha, ubicación
- Acciones: Ver detalles, Crear salida nueva


Se elimina las tabs Salida/Recepciones del módulo Movimientos ya que se migran cada uno a submodulos
═══════════════════════════════════════════════════════════════════════════════

INTERFAZ MÓDULO SOLICITUDES

LAYOUT:

Header con título "Solicitudes"
Tabs: [Mis solicitudes] [Recibidas]



TAB Mis solicitudes:
- Botón "Nueva Solicitud" (superior derecha)
- Tabla con columnas:
  - SubTab de estatus: Iniciadas | Enviadas | Canceladas
    - * ID Solicitud ( codigo consecutivo tipo RM0001)
    - * Fecha Creación (ordenas descendente)
    - * Ubicación Destino (a quien solicito)
    - * Estado (badge con color)
    - * Acciones: Ver | Editar (si creada) | Enviar (si creada) | Eliminar (si creada y tiene permisos adminsitrador global)

TAB RECIBIDAS:
- Tabla con columnas:  
- SubTab de estatus: Recibidas | Procesadas | Canceladas
  * ID Solicitud ( codigo consecutivo tipo RM0001)
  * Fecha Recepción (ordenas descendente)
  * Ubicación Solicita (quien solicita)
  * Responsable (quien solicita)
  * Estado (badge)
  * Acciones: Ver | Procesar (si recibida) | Eliminar (si creada y tiene permisos adminsitrador global)

  mantener coherencia con los demas modulos las logicas de ordenmiento y los diseños e iconos, y fucniones de ordenado 

═══════════════════════════════════════════════════════════════════════════════

FLUJO COMPLETO EJEMPLO

1. Usuario A en Bodega Principal crea solicitud
  - Selecciona Bodega Solicita (solo las disponibles )
   - Selecciona Bodega Secundaria como origen
   - Agrega productos con cantidades
   - Guarda como "creada"

2. Usuario A revisa y envía solicitud
   - Click "Enviar Solicitud"
   - Estado cambia a "enviada"
   - Notificación enviada a usuarios de Bodega Secundaria

3. Usuario B en Bodega Secundaria recibe notificación
   - Click lleva a Solicitudes → tab Recibidas
   - Ve solicitud en estado "recibida"

4. Usuario B procesa solicitud
   - Click "Procesar Solicitud"
   - Revisa productos y cantidades
   - Ajusta cantidad_enviada si necesario
   - Click "Crear Movimiento de Salida"
   - Estatus cambia a procesada

5. Sistema crea automáticamente:
   - Salida en Bodega Secundaria (Ubicacion origen) hacia Bodega Solicita (Ubicacion Destino)
   - Recepción en Bodega Principal (destino) en estado pendiente
   - Actualiza solicitud a estado "procesada"
   - Vincula IDs de Solicitud RM al movimiento de salida para trazabilidad para diferencia que fue una transferencia creada desde solcitudes submodulo

6. Usuario A ve en Recepciones la recepción pendiente
   - Completa recepción cuando mercancía llega
   - Flujo normal de transferencias continúa

═══════════════════════════════════════════════════════════════════════════════

PERMISOS REQUERIDOS

CREAR SOLICITUDES:
- Permiso: "crear_solicitudes"
- Ubicación origen en ubicaciones_asignadas

PROCESAR SOLICITUDES (convertir en salida):
- Permiso: "gestionar_salidas" o "procesar_solicitudes"
- Ubicación destino en ubicaciones_asignadas

VER SOLICITUDES:
- Permiso: "ver_solicitudes"
- Filtradas por ubicaciones_asignadas

═══════════════════════════════════════════════════════════════════════════════

VALIDACIONES CRÍTICAS

AL CREAR SOLICITUD:
- Verificar productos están en ubicaciones_permitidas de destino ( desde donde enviaran los productos)
- Verificar usuario tiene permiso crear_solicitudes
- Verificar ubicación origen está en ubicaciones_asignadas a usuario

AL PROCESAR SOLICITUD:
- Verificar cantidad_enviada <= stock disponible en origen
- Verificar usuario tiene permiso gestionar_salidas
- Validar que solicitud no haya sido procesada previamente
- Vincular correctamente IDs de solicitud, salida

═══════════════════════════════════════════════════════════════════════════════

CHECKLIST IMPLEMENTACIÓN

RESTRUCTURACIÓN:
□ Separar componente Recepciones como submódulo independiente en modulo movimientos sidebar
□ Separar componente Salidas como submódulo independiente en modulo movimientos sidebar

□ Agregar tarjetas superiores en Recepciones y Salidas
□ Actualizar navegación: Solicitudes → Recepciones → Salidas

MÓDULO SOLICITUDES:
Crear submodulo en modulo movimientos
□ Crear componente base con tabs Creadas/Recibidas
□ Implementar formulario crear solicitud
□ Implementar funcionalidad enviar solicitud
□ Implementar vista Recibidas con filtros
□ Implementar modal/formulario procesar solicitud
□ Crear función convertir solicitud en salida/recepción

NOTIFICACIONES:
□ Configurar notificación tipo "solicitud_recibida"
□ Integrar con sistema de notificaciones existente
□ Validar navegación correcta al click

VALIDACIONES:
□ Filtros por ubicaciones_asignadas en ambos tabs
□ Permisos correctos en cada acción
□ Productos validados contra ubicaciones_permitidas
□ Estados y transiciones funcionando correctamente

═══════════════════════════════════════════════════════════════════════════════