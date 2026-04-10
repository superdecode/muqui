# Setup Rápido: Integración Odoo ↔ Muqui Inventario

## 🎯 ¿Qué hace?

Cuando confirmas una venta en Odoo:
1. Odoo envía un webhook a Firebase Functions
2. Las Functions consultan el recetario (BoM) de Odoo
3. Se crean automáticamente movimientos de SALIDA en tu app
4. El inventario se decrementa automáticamente

**No necesitas hacer nada en Odoo después de confirmar la venta.**

---

## 📋 Checklist de Setup

### Paso 1: Preparar Odoo

- [ ] Módulo MRP (Manufacturing) activado
- [ ] Recetarios (BoM) configurados para productos vendibles
  - Ve a **Manufacturing → Products**
  - Para cada producto que vendes, crea un BoM con los ingredientes
  - Ejemplo: Pizza = Harina 500g + Queso 200g + Tomate 300g

### Paso 2: Configurar Credenciales

**Option A: Local Development**

```bash
cd functions
cp .env.example .env.local
# Editar .env.local con tus credenciales de Odoo:
# - ODOO_URL: https://tu-odoo.com
# - ODOO_DB: nombre_bd
# - ODOO_USER: usuario@email.com
# - ODOO_PASSWORD: contraseña
# - ODOO_WEBHOOK_SECRET: secreto-aleatorio-fuerte
```

**Option B: Firebase Production**

```bash
firebase functions:config:set \
  odoo.url="https://tu-odoo.com" \
  odoo.db="nombre_bd" \
  odoo.user="usuario@email.com" \
  odoo.password="contraseña" \
  odoo.webhook_secret="secreto-aleatorio-fuerte"
```

### Paso 3: Deploy de Functions

```bash
cd functions
npm install
firebase deploy --only functions
```

Guarda la URL que aparece:
```
odooWebhook: https://us-central1-TU_PROYECTO.cloudfunctions.net/odooWebhook
```

### Paso 4: Configurar Webhook en Odoo

En Odoo, ve a **Ajustes → Automatización → Acciones Automáticas**

**Crear nueva acción automática:**

| Campo | Valor |
|---|---|
| Nombre | `Webhook Inventario Muqui` |
| Modelo | `Sale Order` |
| Trigger | `On Update` |
| Trigger Fields | `state` |
| Apply when | `Document is Updated` |
| When to Run | `Code Executes` |

**En el campo "Python Code", pega:**

```python
import requests
import json

if record.state == 'sale':
    try:
        headers = {
            'Content-Type': 'application/json',
            'X-Odoo-Secret': 'secreto-aleatorio-fuerte'  # MISMO secreto que arriba
        }

        payload = {
            'sale_order_id': record.id,
            'ubicacion_id': 'tienda_principal'  # Cambiar si tu ubicación tiene otro nombre
        }

        requests.post(
            'https://us-central1-TU_PROYECTO.cloudfunctions.net/odooWebhook',  # URL de arriba
            json=payload,
            headers=headers,
            timeout=10
        )

        log(f'✅ Webhook enviado para orden {record.id}')
    except Exception as e:
        log(f'❌ Error webhook: {str(e)}')
```

Guardar la acción.

---

## 🧪 Pruebas

### Test 1: Local (emulador)

```bash
cd functions
npm run serve
```

En otra terminal:
```bash
curl -X POST http://localhost:5001/TU_PROYECTO/us-central1/odooWebhook \
  -H "Content-Type: application/json" \
  -H "X-Odoo-Secret: secreto-aleatorio-fuerte" \
  -d '{"sale_order_id": 123, "ubicacion_id": "tienda_principal"}'
```

Verificar que aparezca en `Firestore → movimientos` un nuevo documento con `origen: 'ODOO_VENTA'`.

### Test 2: Producción

1. Confirmar una orden en Odoo (cambiar state a "sale")
2. Esperar 5-10 segundos
3. Ve a **Firebase Console → Functions → Logs**
4. Busca líneas que digan `Procesando venta Odoo`
5. Ve a **Firestore → movimientos** y verifica que aparezca el movimiento

---

## 📁 Archivos Nuevos

```
functions/
├── src/
│   ├── odooClient.js         ← Cliente XML-RPC de Odoo
│   └── procesarVenta.js      ← Lógica de crear salidas
├── .env.example              ← Template de variables
├── test-odoo-webhook.js      ← Script para testear
└── package.json              ← xmlrpc agregado

src/pages/
└── SalidasOdoo.jsx           ← (Opcional) Componente para ver salidas

ODOO_INTEGRATION.md           ← Documentación completa
ODOO_SETUP.md                 ← Este archivo
```

---

## 🔧 Troubleshooting

### ❌ "Unauthorized" (401)

El secreto no coincide. Verifica:
- En Odoo Python Code: `'X-Odoo-Secret': 'XXX'`
- En `.env.local` o Firebase Config: `ODOO_WEBHOOK_SECRET=XXX`
- Deben ser idénticos

### ❌ "Odoo auth failed"

Las credenciales son incorrectas. Verifica:
- `ODOO_URL` — sin trailing slash, ej: `https://tu-odoo.com`
- `ODOO_DB` — nombre exacto de la base de datos
- `ODOO_USER` — usuario válido en Odoo (puede ser email)
- `ODOO_PASSWORD` — contraseña correcta

### ❌ No aparece movimiento en Firestore

Causas posibles:
1. **BoM no configurado** — ve a Manufacturing → Products y crea BoM
2. **Acción automática no ejecutada** — verifica que `record.state == 'sale'` en Python
3. **Webhook no llamado** — ve a Firebase Logs para ver errores

### ⚠️ Stock negativo

Si ves stock negativo en `cantidad_actual`:
- Es normal si vendiste más de lo que tenías
- Implementar validación de stock mínimo si es necesario

---

## 📚 Referencias

- [ODOO_INTEGRATION.md](./ODOO_INTEGRATION.md) — Documentación completa
- Firebase Console: https://console.firebase.google.com
- Odoo XML-RPC API: https://www.odoo.com/documentation/17.0/developer/reference/external_api.html

---

## ✅ Validación Final

Cuando todo esté listo:

- [ ] Credenciales de Odoo configuradas en `.env.local` o Firebase
- [ ] Functions desplegadas: `firebase deploy --only functions`
- [ ] Acción automática creada en Odoo
- [ ] Recetarios (BoM) configurados en Odoo
- [ ] Test exitoso: confirmar orden y ver movimiento en Firestore
- [ ] Stock decrementado correctamente en `inventario`

---

¡Listo! 🎉 Tu sistema de inventario está integrado con Odoo.
