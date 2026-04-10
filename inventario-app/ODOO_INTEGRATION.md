# Integración Odoo → Muqui Inventario App

## Descripción

Cuando se **confirma una orden de venta en Odoo**, se envía automáticamente un webhook a Firebase Functions que:
1. Obtiene los ingredientes del recetario (BoM) de Odoo
2. Multiplica ingredientes × cantidad vendida
3. Crea movimientos de **SALIDA** en Firestore
4. Decrementa automáticamente el inventario

## Prerequisitos

- [ ] Instancia de Odoo con módulo **MRP** (Manufacturing) activado
- [ ] Recetarios (Bills of Materials / BoM) configurados para tus productos vendibles
- [ ] Usuario en Odoo con permisos de lectura en `sale.order`, `mrp.bom`, `product.product`
- [ ] Firebase Functions desplegadas
- [ ] Secreto compartido generado

## Pasos de Configuración

### 1️⃣ Configurar variables de entorno

En Firebase Console o vía `firebase functions:config:set`:

```bash
firebase functions:config:set \
  odoo.url="https://tu-odoo.com" \
  odoo.db="nombre_bd" \
  odoo.user="usuario@email.com" \
  odoo.password="contraseña" \
  odoo.webhook_secret="secreto-muy-fuerte"
```

**O** crear archivo `functions/.env.local`:
```
ODOO_URL=https://tu-odoo.com
ODOO_DB=nombre_db
ODOO_USER=usuario@email.com
ODOO_PASSWORD=contraseña
ODOO_WEBHOOK_SECRET=secreto-muy-fuerte
```

### 2️⃣ Deploy de Firebase Functions

```bash
cd functions
npm install
firebase deploy --only functions
```

Obtendrás una URL como:
```
https://us-central1-TU_PROYECTO.cloudfunctions.net/odooWebhook
```

### 3️⃣ Crear Acción Automática en Odoo

En Odoo, ve a **Ajustes → Automatización → Acciones Automáticas**

**Crear nueva acción:**

| Campo | Valor |
|-------|-------|
| **Nombre** | `Webhook Inventario Muqui` |
| **Modelo** | `Sale Order` |
| **Trigger** | `On Update` |
| **Trigger Fields** | `state` |
| **Apply when** | `Document is Updated` |
| **When to Run** | `Code Executes` |

**Python Code:**
```python
import requests
import json

# Solo ejecutar cuando se confirma la orden (state = sale)
if record.state == 'sale':
    try:
        headers = {
            'Content-Type': 'application/json',
            'X-Odoo-Secret': 'secreto-muy-fuerte'  # Mismo secreto que en Firebase
        }

        payload = {
            'sale_order_id': record.id,
            'ubicacion_id': 'tienda_principal'  # O el ID de tu ubicación
        }

        response = requests.post(
            'https://us-central1-TU_PROYECTO.cloudfunctions.net/odooWebhook',
            json=payload,
            headers=headers,
            timeout=10
        )

        if response.status_code == 200:
            _logger.info(f'✅ Webhook enviado para orden {record.id}')
        else:
            _logger.warning(f'⚠️ Webhook falló: {response.status_code} - {response.text}')
    except Exception as e:
        _logger.error(f'❌ Error en webhook: {str(e)}')
```

### 4️⃣ Configurar Recetarios en Odoo

Cada producto que se venda debe tener un **Bill of Materials (BoM)** configurado:

1. Ve a **Manufacturing → Products**
2. Selecciona un producto vendible
3. Ve a **Recipes & Costs** (si existe) o crea un BoM
4. Agrega componentes (ingredientes) con cantidades
5. Ejemplo:
   - Producto: **Pizza Margherita** (venta)
   - Ingredientes:
     - Harina: 500g
     - Queso: 200g
     - Tomate: 300g

Cuando se vende 1x Pizza Margherita, se descontarán automáticamente:
- Harina: 500g
- Queso: 200g
- Tomate: 300g

## Prueba del Webhook

### Test Local (Emulador)

```bash
cd functions
npm run serve
```

En otra terminal:
```bash
curl -X POST http://localhost:5001/TU_PROYECTO/us-central1/odooWebhook \
  -H "Content-Type: application/json" \
  -H "X-Odoo-Secret: tu-secreto" \
  -d '{"sale_order_id": 123, "ubicacion_id": "tienda_principal"}'
```

### Test en Producción

Confirma una orden en Odoo y verifica:
1. **Firestore** → `movimientos`: debe aparecer con `origen: 'ODOO_VENTA'`
2. **Firestore** → `inventario`: stock de ingredientes debe decrementar
3. **Firebase Console** → Logs: busca `Procesando venta Odoo`

## Estructura de Datos

### Movimiento creado
```javascript
{
  tipo: "SALIDA",
  origen: "ODOO_VENTA",
  sale_order_id: 123,
  producto_id: 456,        // ID del ingrediente
  sku: "HAR-001",
  nombre_producto: "Harina",
  cantidad: 500,
  ubicacion_id: "tienda_principal",
  fecha_creacion: Timestamp,
  estado: "PENDIENTE",
  descripcion: "Salida automática: Pizza Margherita (1 x 500)"
}
```

### Update en Inventario
```javascript
{
  cantidad_actual: 950,    // Decrementado
  ultima_actualizacion: Timestamp
}
```

## Troubleshooting

### ❌ "Unauthorized" (401)
- Verificar que `X-Odoo-Secret` coincida en Odoo y Firebase
- Verificar que la variable de entorno está configurada

### ❌ "Odoo auth failed"
- Verificar credenciales en `.env.local`
- Verificar que el usuario existe en Odoo
- Verificar que Odoo está accesible desde internet (Firebase Functions)

### ❌ No aparece movimiento en Firestore
- Verificar que la orden en Odoo tiene `state = 'sale'` (confirmada)
- Verificar que el producto tiene un BoM configurado
- Ver logs de Firebase: `firebase functions:log`

### ⚠️ Stock negativo
- Verificar que `cantidad_actual` en Firestore es del tipo `number`, no `string`
- Implementar validación de stock mínimo si es necesario

## Frontend: Ver Salidas Odoo (Opcional)

En la app, puedes filtrar movimientos de Odoo:

```javascript
// En useMovimientos.js o similar
const movimientosOdoo = movimientos.filter(m => m.origen === 'ODOO_VENTA');
```

## Desactivar Temporalmente

Si necesitas pausar la integración:

1. **En Odoo:** Desactiva la Acción Automática
2. **En Firebase:** Comenta el `exports.odooWebhook` en `index.js` y redeploy

## Seguridad

⚠️ **IMPORTANTE:**
- Nunca commitear `.env.local` a Git
- Usar Firebase Secrets Manager en producción, no variables de entorno locales
- Cambiar el `ODOO_WEBHOOK_SECRET` regularmente
- Limitar permisos del usuario Odoo solo a lectura

## Soporte

Si hay errores, revisar:
1. `firebase functions:log` — logs en tiempo real
2. **Firestore** → Colección `movimientos` — verificar que se creó el registro
3. **Firestore** → Colección `inventario` → verificar `cantidad_actual`
