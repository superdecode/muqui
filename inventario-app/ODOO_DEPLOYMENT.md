# 🚀 Guía de Ejecución: Integración Odoo

## Resumen Rápido

```
Odoo (confirma venta)
    ↓ webhook HTTP
Firebase Function (odooWebhook)
    ↓ llama Odoo XML-RPC
Obtiene recetario (BoM)
    ↓ multiplica ingredientes
Crea movimientos SALIDA en Firestore
    ↓ decrementa stock
Inventario actualizado automáticamente
```

---

## Phase 1: Setup Local

### 1.1 Instalar dependencias

```bash
cd inventario-app/functions
npm install
```

Verifica que se instaló `xmlrpc`:
```bash
npm list xmlrpc
# Debe mostrar: xmlrpc@1.3.2
```

### 1.2 Crear archivo `.env.local`

```bash
cd inventario-app/functions
cp .env.example .env.local
```

Editar `.env.local` (reemplazar con tus valores reales):

```env
ODOO_URL=https://demo.odoo.com
ODOO_DB=demo_database
ODOO_USER=demo@example.com
ODOO_PASSWORD=demo_password
ODOO_WEBHOOK_SECRET=secreto-muy-fuerte-aleatorio-12345
```

⚠️ **Nunca** commitear `.env.local` a Git

### 1.3 Probar emulador local

```bash
cd functions
npm run serve
```

Salida esperada:
```
⚡ emulator started at ...
✔ functions emulator started on port 5001
```

### 1.4 Enviar webhook de prueba

En otra terminal:

```bash
node functions/test-odoo-webhook.js 123 tienda_principal
```

Salida esperada:
```
🚀 Enviando webhook de prueba...
   URL: https://us-central1-...
   Orden: 123
   Ubicación: tienda_principal

📨 Respuesta (200):
{"success": true, "message": "Procesando venta", "orderId": 123}

✅ Webhook enviado exitosamente
```

---

## Phase 2: Configurar Odoo

### 2.1 Instalar módulo MRP

En Odoo Admin:
1. **Apps → Search** → busca "Manufacturing"
2. **Install** (si no está instalado)

### 2.2 Crear recetarios (BoM)

Para cada producto que se venda:

1. **Manufacturing → Products**
2. Selecciona un producto vendible
3. **Create Bill of Materials**
4. Agrega componentes (ingredientes) con cantidades
5. **Save**

**Ejemplo:**
```
Producto: Pizza Margherita (se vende)
  ├─ Harina (ingrediente): 500g
  ├─ Queso (ingrediente): 200g
  └─ Tomate (ingrediente): 300g
```

### 2.3 Crear Acción Automática

En Odoo:
1. **Settings → Automation → Automated Actions**
2. **Create**

Completar form:

| Campo | Valor |
|---|---|
| Name | `Webhook Inventario Muqui` |
| Model | `Sale Order` |
| Trigger | `On Update` |
| Trigger Fields | `state` |
| Apply when | `Document is Updated` |
| When to Run | `Code Executes` |
| Python Code | *(ver abajo)* |

**Python Code:**

```python
import requests
import json

# Solo ejecutar cuando se confirma la orden (state = sale)
if record.state == 'sale':
    try:
        headers = {
            'Content-Type': 'application/json',
            'X-Odoo-Secret': 'secreto-muy-fuerte-aleatorio-12345'  # MISMO que .env.local
        }

        payload = {
            'sale_order_id': record.id,
            'ubicacion_id': 'tienda_principal'  # O tu ubicación real
        }

        response = requests.post(
            'https://us-central1-TU_PROYECTO.cloudfunctions.net/odooWebhook',
            json=payload,
            headers=headers,
            timeout=10
        )

        log(f'✅ Webhook enviado para orden {record.id}')
    except Exception as e:
        log(f'❌ Error webhook: {str(e)}')
```

Reemplazar:
- `secreto-muy-fuerte-aleatorio-12345` con tu secreto real
- `TU_PROYECTO` con tu project ID de Firebase

---

## Phase 3: Deploy a Producción

### 3.1 Configurar variables en Firebase

```bash
firebase functions:config:set \
  odoo.url="https://tu-odoo.com" \
  odoo.db="nombre_bd" \
  odoo.user="usuario@email.com" \
  odoo.password="contraseña" \
  odoo.webhook_secret="secreto-muy-fuerte-aleatorio-12345"
```

Verificar:
```bash
firebase functions:config:get
```

### 3.2 Deploy de Functions

```bash
cd functions
firebase deploy --only functions
```

Salida esperada:
```
✔ Deploy complete!

Function URL (odooWebhook):
https://us-central1-TU_PROYECTO.cloudfunctions.net/odooWebhook
```

**Guardar esta URL** — la necesitarás en Odoo.

### 3.3 Actualizar Python Code en Odoo

En Odoo, editar la Acción Automática que creaste en 2.3:

Reemplazar:
```python
'https://us-central1-TU_PROYECTO.cloudfunctions.net/odooWebhook'
```

Con la URL real de tu deploy.

---

## Phase 4: Validación End-to-End

### 4.1 Confirmar venta de prueba en Odoo

1. Ve a **Sales → Orders**
2. Crea una orden de prueba
3. Agrega un producto que tiene BoM
4. **Confirm**

### 4.2 Verificar en Firebase

Ir a **Firebase Console → Functions → Logs**

Buscar líneas como:
```
🎯 Webhook recibido - Orden: 123
📦 Procesando venta Odoo: 123
  ✅ Líneas obtenidas: 1
  📌 Producto: Pizza Margherita (qty: 1)
    ✅ Recetario con 3 componentes
      ✅ Movimiento creado: abc123def
      📊 Stock decrementado: 1000 → 500
...
✅ Venta procesada: 3 movimientos creados
```

### 4.3 Verificar en Firestore

**Firestore → movimientos**

Debe haber nuevos documentos:
- `tipo: "SALIDA"`
- `origen: "ODOO_VENTA"`
- `sale_order_id: 123`
- `cantidad: 500` (ingrediente × cantidad vendida)

**Firestore → inventario**

Verificar que `cantidad_actual` decrementó:
- Antes: 1000
- Después: 500 (1000 - 500)

---

## 🐛 Troubleshooting

### ❌ Webhook devuelve 401 (Unauthorized)

**Causa:** Secreto incorrecto

**Solución:**
1. Verificar `ODOO_WEBHOOK_SECRET` en `.env.local`
2. Verificar `'X-Odoo-Secret': '...'` en Python Code de Odoo
3. Deben ser idénticos (carácter por carácter)

### ❌ Webhook devuelve 400 (Bad Request)

**Causa:** Falta `sale_order_id` en payload

**Solución:** Verificar que Python Code en Odoo está completo y usa `record.id`

### ❌ Error "Odoo auth failed"

**Causa:** Credenciales incorrectas

**Solución:**
1. Verificar ODOO_URL (sin trailing slash)
2. Verificar ODOO_DB (nombre exacto)
3. Verificar ODOO_USER (email o login válido)
4. Verificar ODOO_PASSWORD (contraseña correcta)
5. Probar en terminal:
   ```bash
   curl https://tu-odoo.com/xmlrpc/2 -X POST \
     -d "<?xml...?>" \
     -H "Content-Type: application/xml"
   ```

### ❌ Error "No BoM found"

**Causa:** Producto no tiene recetario

**Solución:**
1. Ve a **Manufacturing → Products**
2. Selecciona el producto vendido
3. Crea un Bill of Materials con ingredientes
4. Guarda y reinicia

### ⚠️ Stock negativo después de venta

**Es normal** si vendiste más de lo que tenías en stock.

**Opcional:** Agregar validación en `procesarVenta.js`:
```javascript
if (nuevoStock < 0) {
  // Crear alerta de stock negativo
  // O rechazar el movimiento
}
```

---

## 📊 Monitoreo

### Ver logs en tiempo real

```bash
firebase functions:log --follow
```

### Ver movimientos creados

Firebase Console:
1. **Firestore → movimientos**
2. Filtrar: `origen == 'ODOO_VENTA'`
3. Ordenar por: `fecha_creacion (descendente)`

### Alertas recomendadas

Configurar alertas en Firebase si:
- Webhook retorna 5xx errors
- Latencia > 10 segundos
- Más de 10 fallos en 5 minutos

---

## ✅ Checklist Final

- [ ] `npm install` completado en `functions/`
- [ ] `.env.local` configurado con credenciales Odoo
- [ ] Test local exitoso: `node test-odoo-webhook.js 123`
- [ ] Módulo MRP instalado en Odoo
- [ ] BoM creado para al menos un producto
- [ ] Acción Automática creada en Odoo
- [ ] `firebase deploy --only functions` completado
- [ ] Variables de entorno configuradas en Firebase
- [ ] Python Code en Odoo actualizado con URL real
- [ ] Test en producción: confirmada venta → movimiento en Firestore
- [ ] Stock decrementado correctamente

---

## 🎓 Próximos pasos

1. **Visualizar salidas:** Usar componente `SalidasOdoo.jsx` en frontend
2. **Revisar movimientos:** Agregar opción para revertir salidas erróneas
3. **Alertas:** Notificar si stock queda bajo
4. **Sincronización inversa:** Enviar cambios de Muqui de vuelta a Odoo (opcional)

---

¡Listo! Si todo va bien, tu inventario estará sincronizado con Odoo. 🎉
