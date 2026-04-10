import { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { useRecetarios } from '../hooks/useRecetarios'
import { useToastStore } from '../stores/toastStore'

// ─── Utils ────────────────────────────────────────────────────────────────────

function calcularCostoTotal(ingredientes = []) {
  return ingredientes.reduce((s, i) => s + (i.costo_unitario || 0) * (i.cantidad || 0), 0)
}

function fmtCosto(n) {
  return typeof n === 'number' ? `$${n.toFixed(2)}` : '$0.00'
}

/**
 * Parsea un archivo Excel con el formato:
 * Producto | SKU_Odoo | Ingrediente | SKU_Ing | Cantidad | Unidad | Costo_Unit
 *
 * Agrupa por SKU_Odoo y retorna array de recetarios.
 */
function parseExcelRecetarios(buffer) {
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  // Saltar encabezado (primera fila)
  const dataRows = rows.slice(1).filter(r => r[0] || r[1])

  const map = new Map()

  for (const row of dataRows) {
    const nombre    = String(row[0] || '').trim()
    const skuOdoo   = String(row[1] || '').trim().toUpperCase()
    const ingNombre = String(row[2] || '').trim()
    const ingSku    = String(row[3] || '').trim().toUpperCase()
    const cantidad  = parseFloat(row[4]) || 0
    const unidad    = String(row[5] || '').trim()
    const costo     = parseFloat(row[6]) || 0

    if (!skuOdoo || !ingNombre) continue

    if (!map.has(skuOdoo)) {
      map.set(skuOdoo, { nombre, sku_odoo: skuOdoo, ingredientes: [] })
    }

    map.get(skuOdoo).ingredientes.push({
      nombre: ingNombre,
      sku: ingSku || null,
      producto_id: null,
      cantidad,
      unidad_medida: unidad,
      costo_unitario: costo
    })
  }

  return Array.from(map.values())
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Recetarios() {
  const { recetarios, isLoading, crearRecetario, actualizarRecetario, eliminarRecetario, importarRecetarios } = useRecetarios()
  const { addToast } = useToastStore()

  const [busqueda, setBusqueda] = useState('')
  const [expandido, setExpandido] = useState(null)
  const [modalForm, setModalForm]   = useState(false)
  const [modalImport, setModalImport] = useState(false)
  const [editando, setEditando] = useState(null)
  const [preview, setPreview] = useState(null)
  const [importando, setImportando] = useState(false)

  const fileRef = useRef()

  // Filtrado
  const recetariosFiltrados = (recetarios || []).filter(r => {
    if (!busqueda) return r.activo !== false
    const b = busqueda.toLowerCase()
    return r.activo !== false && (
      r.nombre?.toLowerCase().includes(b) ||
      r.sku_odoo?.toLowerCase().includes(b)
    )
  })

  // Stats para sección de costos
  const costoPromedio = recetariosFiltrados.length
    ? recetariosFiltrados.reduce((s, r) => s + (r.costo_total || 0), 0) / recetariosFiltrados.length
    : 0

  const top5 = [...recetariosFiltrados]
    .sort((a, b) => (b.costo_total || 0) - (a.costo_total || 0))
    .slice(0, 5)

  // Handlers
  const handleEliminar = async (id, nombre) => {
    if (!confirm(`¿Eliminar recetario "${nombre}"?`)) return
    try {
      await eliminarRecetario.mutateAsync(id)
      addToast({ type: 'success', message: `Recetario "${nombre}" eliminado` })
    } catch {
      addToast({ type: 'error', message: 'Error al eliminar' })
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const buf = await file.arrayBuffer()
    try {
      const parsed = parseExcelRecetarios(buf)
      setPreview(parsed)
    } catch (err) {
      addToast({ type: 'error', message: `Error al leer Excel: ${err.message}` })
    }
  }

  const handleConfirmarImport = async () => {
    if (!preview?.length) return
    setImportando(true)
    try {
      await importarRecetarios.mutateAsync(preview)
      addToast({ type: 'success', message: `${preview.length} recetarios importados` })
      setModalImport(false)
      setPreview(null)
    } catch {
      addToast({ type: 'error', message: 'Error al importar recetarios' })
    } finally {
      setImportando(false)
    }
  }

  const handleDescargarPlantilla = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Producto', 'SKU_Odoo', 'Ingrediente', 'SKU_Ing', 'Cantidad', 'Unidad', 'Costo_Unit'],
      ['Pizza Margherita', 'PIZZA-MAR', 'Harina', 'HAR-001', 500, 'g', 0.005],
      ['Pizza Margherita', 'PIZZA-MAR', 'Queso', 'QUE-001', 200, 'g', 0.08],
      ['Hamburguesa', 'HAMB-001', 'Pan', 'PAN-001', 1, 'pz', 4.5],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Recetarios')
    XLSX.writeFile(wb, 'plantilla_recetarios.xlsx')
  }

  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, system-ui, sans-serif', maxWidth: 1100, margin: '0 auto' }}>

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>Recetarios</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Gestión de BOM — ingredientes por producto de Odoo
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { setModalImport(true); setPreview(null) }} style={btnSecondary}>
            📥 Importar Excel
          </button>
          <button onClick={() => { setEditando(null); setModalForm(true) }} style={btnPrimary}>
            + Nuevo Recetario
          </button>
        </div>
      </div>

      {/* ─── Barra de búsqueda ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Buscar por nombre o SKU Odoo..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* ─── Tabla principal ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: 40 }}>Cargando recetarios...</p>
      ) : recetariosFiltrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <p style={{ fontSize: 40, margin: 0 }}>📋</p>
          <p>No hay recetarios. Importa desde Excel o crea uno nuevo.</p>
        </div>
      ) : (
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Nombre', 'SKU Odoo', 'SKU Template', 'Ingredientes', 'Costo Total', 'Acciones'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recetariosFiltrados.map((rec, i) => (
                <>
                  <tr
                    key={rec.id}
                    style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', cursor: 'pointer' }}
                    onClick={() => setExpandido(expandido === rec.id ? null : rec.id)}
                  >
                    <td style={tdStyle}>
                      <strong>{rec.nombre}</strong>
                    </td>
                    <td style={tdStyle}>
                      <span style={chip('#dbeafe', '#1e40af')}>{rec.sku_odoo}</span>
                    </td>
                    <td style={tdStyle}>
                      {rec.sku_template
                        ? <span style={chip('#f0fdf4', '#166534')}>{rec.sku_template}</span>
                        : <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={chip('#fef3c7', '#92400e')}>
                        {rec.ingredientes?.length || 0} ing.
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#0f172a' }}>
                      {fmtCosto(rec.costo_total)}
                    </td>
                    <td style={tdStyle} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { setEditando(rec); setModalForm(true) }}
                        style={{ ...btnIcono, color: '#3b82f6' }}
                      >✏️</button>
                      <button
                        onClick={() => handleEliminar(rec.id, rec.nombre)}
                        style={{ ...btnIcono, color: '#ef4444' }}
                      >🗑️</button>
                    </td>
                  </tr>

                  {/* Fila expandida con ingredientes */}
                  {expandido === rec.id && (
                    <tr key={`${rec.id}-ing`}>
                      <td colSpan={6} style={{ padding: '0 16px 16px', background: '#f8fafc' }}>
                        <div style={{ borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden', marginTop: 4 }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ background: '#e0f2fe' }}>
                                {['Ingrediente', 'SKU', 'Cantidad', 'Unidad', 'Costo/u', 'Subtotal'].map(h => (
                                  <th key={h} style={{ ...thStyle, fontSize: 12, padding: '8px 12px' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(rec.ingredientes || []).map((ing, j) => (
                                <tr key={j} style={{ background: j % 2 === 0 ? '#fff' : '#f0f9ff' }}>
                                  <td style={{ ...tdStyle, fontSize: 13 }}>{ing.nombre}</td>
                                  <td style={{ ...tdStyle, fontSize: 12, color: '#64748b' }}>{ing.sku || '—'}</td>
                                  <td style={{ ...tdStyle, textAlign: 'right', fontSize: 13 }}>{ing.cantidad}</td>
                                  <td style={{ ...tdStyle, fontSize: 12, color: '#64748b' }}>{ing.unidad_medida}</td>
                                  <td style={{ ...tdStyle, textAlign: 'right', fontSize: 13 }}>
                                    {fmtCosto(ing.costo_unitario)}
                                  </td>
                                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, fontSize: 13 }}>
                                    {fmtCosto((ing.costo_unitario || 0) * (ing.cantidad || 0))}
                                  </td>
                                </tr>
                              ))}
                              <tr style={{ background: '#e0f2fe' }}>
                                <td colSpan={5} style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontSize: 13 }}>
                                  Costo total recetario:
                                </td>
                                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                                  {fmtCosto(rec.costo_total)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Sección de costos ───────────────────────────────────────────────── */}
      {recetariosFiltrados.length > 0 && (
        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Resumen general */}
          <div style={card}>
            <h3 style={cardTitle}>Resumen de Costos</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Stat label="Recetarios activos" value={recetariosFiltrados.length} />
              <Stat label="Costo promedio" value={fmtCosto(costoPromedio)} />
              <Stat
                label="Más barato"
                value={fmtCosto(Math.min(...recetariosFiltrados.map(r => r.costo_total || 0)))}
              />
              <Stat
                label="Más caro"
                value={fmtCosto(Math.max(...recetariosFiltrados.map(r => r.costo_total || 0)))}
              />
            </div>
          </div>

          {/* Top 5 */}
          <div style={card}>
            <h3 style={cardTitle}>Top 5 — Mayor Costo</h3>
            <ol style={{ margin: 0, padding: '0 0 0 20px' }}>
              {top5.map((r, i) => (
                <li key={r.id} style={{ padding: '6px 0', borderBottom: i < 4 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: '#334155' }}>{r.nombre}</span>
                    <strong style={{ fontSize: 13, color: '#0f172a' }}>{fmtCosto(r.costo_total)}</strong>
                  </div>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{r.sku_odoo}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* ─── Modal: Nuevo / Editar Recetario ─────────────────────────────────── */}
      {modalForm && (
        <ModalRecetario
          recetario={editando}
          onClose={() => { setModalForm(false); setEditando(null) }}
          onCreate={async (data) => {
            await crearRecetario.mutateAsync(data)
            addToast({ type: 'success', message: 'Recetario creado' })
            setModalForm(false)
          }}
          onUpdate={async (id, data) => {
            await actualizarRecetario.mutateAsync({ id, data })
            addToast({ type: 'success', message: 'Recetario actualizado' })
            setModalForm(false)
            setEditando(null)
          }}
        />
      )}

      {/* ─── Modal: Importar Excel ────────────────────────────────────────────── */}
      {modalImport && (
        <div style={overlay}>
          <div style={{ ...modalBox, maxWidth: 700 }}>
            <h2 style={modalTitle}>📥 Importar desde Excel</h2>

            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>
              El archivo debe tener 7 columnas en este orden:
              <br />
              <strong>Producto | SKU_Odoo | Ingrediente | SKU_Ing | Cantidad | Unidad | Costo_Unit</strong>
            </p>

            <button onClick={handleDescargarPlantilla} style={{ ...btnSecondary, marginBottom: 16, fontSize: 13 }}>
              📄 Descargar plantilla
            </button>

            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              style={{ display: 'block', marginBottom: 16 }}
            />

            {preview && (
              <div>
                <p style={{ fontWeight: 600, marginBottom: 8 }}>
                  ✅ {preview.length} recetarios detectados
                </p>
                <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                        {['Nombre', 'SKU Odoo', '# Ingredientes', 'Costo Total'].map(h => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((r, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                          <td style={tdStyle}>{r.nombre}</td>
                          <td style={tdStyle}>{r.sku_odoo}</td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>{r.ingredientes.length}</td>
                          <td style={tdStyle}>{fmtCosto(calcularCostoTotal(r.ingredientes))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button onClick={() => { setModalImport(false); setPreview(null) }} style={btnSecondary}>
                Cancelar
              </button>
              <button
                onClick={handleConfirmarImport}
                disabled={!preview?.length || importando}
                style={{ ...btnPrimary, opacity: !preview?.length || importando ? 0.5 : 1 }}
              >
                {importando ? 'Importando...' : `Confirmar importación (${preview?.length || 0})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Modal Crear/Editar Recetario ─────────────────────────────────────────────

function ModalRecetario({ recetario, onClose, onCreate, onUpdate }) {
  const initial = recetario || { nombre: '', sku_odoo: '', sku_template: '', ingredientes: [] }

  const [form, setForm] = useState({
    nombre: initial.nombre || '',
    sku_odoo: initial.sku_odoo || '',
    sku_template: initial.sku_template || '',
    ingredientes: initial.ingredientes?.length ? initial.ingredientes : []
  })

  const [guardando, setGuardando] = useState(false)

  const costoTotal = calcularCostoTotal(form.ingredientes)

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const addIngrediente = () => {
    setForm(f => ({
      ...f,
      ingredientes: [
        ...f.ingredientes,
        { nombre: '', sku: '', producto_id: null, cantidad: 0, unidad_medida: '', costo_unitario: 0 }
      ]
    }))
  }

  const updateIngrediente = (i, k, v) => {
    setForm(f => {
      const ings = f.ingredientes.map((ing, idx) =>
        idx === i ? { ...ing, [k]: k === 'cantidad' || k === 'costo_unitario' ? parseFloat(v) || 0 : v } : ing
      )
      return { ...f, ingredientes: ings }
    })
  }

  const removeIngrediente = (i) => {
    setForm(f => ({ ...f, ingredientes: f.ingredientes.filter((_, idx) => idx !== i) }))
  }

  const handleSubmit = async () => {
    if (!form.nombre || !form.sku_odoo) return
    setGuardando(true)
    try {
      if (recetario) {
        await onUpdate(recetario.id, form)
      } else {
        await onCreate(form)
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div style={overlay}>
      <div style={{ ...modalBox, maxWidth: 680 }}>
        <h2 style={modalTitle}>{recetario ? '✏️ Editar Recetario' : '+ Nuevo Recetario'}</h2>

        {/* Datos del producto Odoo */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Nombre del producto</label>
            <input
              style={inputStyle}
              value={form.nombre}
              onChange={e => setField('nombre', e.target.value)}
              placeholder="ej: Pizza Margherita"
            />
          </div>
          <div>
            <label style={labelStyle}>SKU Odoo (variante)</label>
            <input
              style={inputStyle}
              value={form.sku_odoo}
              onChange={e => setField('sku_odoo', e.target.value.toUpperCase())}
              placeholder="ej: PIZZA-MAR-M"
            />
          </div>
          <div>
            <label style={labelStyle}>SKU Template (padre, opcional)</label>
            <input
              style={inputStyle}
              value={form.sku_template}
              onChange={e => setField('sku_template', e.target.value.toUpperCase())}
              placeholder="ej: PIZZA-MAR"
            />
          </div>
        </div>

        {/* Ingredientes */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h4 style={{ margin: 0, color: '#334155' }}>Ingredientes</h4>
          <button onClick={addIngrediente} style={{ ...btnPrimary, padding: '6px 14px', fontSize: 13 }}>
            + Agregar
          </button>
        </div>

        <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 16 }}>
          {form.ingredientes.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', padding: 20, fontSize: 13 }}>
              Sin ingredientes. Agrega uno o importa desde Excel.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Ingrediente', 'SKU', 'Cantidad', 'Unidad', 'Costo/u', ''].map(h => (
                    <th key={h} style={{ ...thStyle, fontSize: 12, padding: '8px 10px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {form.ingredientes.map((ing, i) => (
                  <tr key={i}>
                    <td style={{ padding: '6px 8px' }}>
                      <input
                        style={{ ...inputStyle, margin: 0, padding: '4px 8px', fontSize: 12 }}
                        value={ing.nombre}
                        onChange={e => updateIngrediente(i, 'nombre', e.target.value)}
                        placeholder="Nombre"
                      />
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <input
                        style={{ ...inputStyle, margin: 0, padding: '4px 8px', fontSize: 12, width: 80 }}
                        value={ing.sku || ''}
                        onChange={e => updateIngrediente(i, 'sku', e.target.value.toUpperCase())}
                        placeholder="SKU"
                      />
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <input
                        type="number"
                        style={{ ...inputStyle, margin: 0, padding: '4px 8px', fontSize: 12, width: 70 }}
                        value={ing.cantidad}
                        onChange={e => updateIngrediente(i, 'cantidad', e.target.value)}
                        min={0}
                      />
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <input
                        style={{ ...inputStyle, margin: 0, padding: '4px 8px', fontSize: 12, width: 60 }}
                        value={ing.unidad_medida}
                        onChange={e => updateIngrediente(i, 'unidad_medida', e.target.value)}
                        placeholder="g / pz"
                      />
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <input
                        type="number"
                        style={{ ...inputStyle, margin: 0, padding: '4px 8px', fontSize: 12, width: 80 }}
                        value={ing.costo_unitario}
                        onChange={e => updateIngrediente(i, 'costo_unitario', e.target.value)}
                        step={0.001}
                        min={0}
                      />
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <button
                        onClick={() => removeIngrediente(i)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
                      >🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Costo total */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '10px 16px',
          background: '#f0fdf4',
          borderRadius: 8,
          marginBottom: 20,
          border: '1px solid #bbf7d0'
        }}>
          <span style={{ fontWeight: 700, color: '#166534' }}>
            Costo total del recetario: {fmtCosto(costoTotal)}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={btnSecondary}>Cancelar</button>
          <button
            onClick={handleSubmit}
            disabled={!form.nombre || !form.sku_odoo || guardando}
            style={{ ...btnPrimary, opacity: !form.nombre || !form.sku_odoo || guardando ? 0.5 : 1 }}
          >
            {guardando ? 'Guardando...' : (recetario ? 'Actualizar' : 'Crear Recetario')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Stat({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: 13, color: '#64748b' }}>{label}</span>
      <strong style={{ fontSize: 13, color: '#0f172a' }}>{value}</strong>
    </div>
  )
}

// ─── Estilos compartidos ──────────────────────────────────────────────────────

const thStyle = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  borderBottom: '1px solid #e2e8f0'
}

const tdStyle = {
  padding: '12px 16px',
  fontSize: 14,
  color: '#334155',
  borderBottom: '1px solid #f1f5f9'
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box'
}

const labelStyle = {
  display: 'block',
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 600,
  color: '#374151'
}

const btnPrimary = {
  padding: '10px 18px',
  background: '#3b82f6',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer'
}

const btnSecondary = {
  padding: '10px 18px',
  background: '#fff',
  color: '#374151',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer'
}

const btnIcono = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 16,
  padding: '4px 6px',
  borderRadius: 6
}

const card = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: 20
}

const cardTitle = {
  margin: '0 0 16px',
  fontSize: 15,
  fontWeight: 700,
  color: '#1e293b'
}

const overlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: 20
}

const modalBox = {
  background: '#fff',
  borderRadius: 16,
  padding: 28,
  width: '100%',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 25px 60px rgba(0,0,0,0.2)'
}

const modalTitle = {
  margin: '0 0 20px',
  fontSize: 20,
  fontWeight: 700,
  color: '#1e293b'
}

const chip = (bg, color) => ({
  display: 'inline-block',
  padding: '3px 10px',
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 600,
  background: bg,
  color: color
})
