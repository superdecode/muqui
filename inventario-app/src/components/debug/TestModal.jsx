import { useState } from 'react'
import Modal from '../common/Modal'
import Button from '../common/Button'

export default function TestModal() {
  const [showMovimiento, setShowMovimiento] = useState(false)
  const [showConteo, setShowConteo] = useState(false)

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}>
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h3 style={{ margin: 0, marginBottom: '10px', color: '#004AFF' }}>🧪 Debug Panel</h3>
        <Button onClick={() => setShowMovimiento(true)} variant="primary" style={{ marginRight: '10px' }}>
          Test Movimiento Modal
        </Button>
        <Button onClick={() => setShowConteo(true)} variant="primary">
          Test Conteo Modal
        </Button>

        <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
          <div>Movimiento Modal: {showMovimiento ? '✅ Abierto' : '❌ Cerrado'}</div>
          <div>Conteo Modal: {showConteo ? '✅ Abierto' : '❌ Cerrado'}</div>
        </div>
      </div>

      {showMovimiento && (
        <Modal onClose={() => setShowMovimiento(false)}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '8px', textAlign: 'center' }}>
            <h2 style={{ color: '#004AFF' }}>✅ Modal de Movimiento Funciona!</h2>
            <p>Si ves esto, el modal está funcionando correctamente.</p>
            <Button onClick={() => setShowMovimiento(false)} variant="primary">
              Cerrar
            </Button>
          </div>
        </Modal>
      )}

      {showConteo && (
        <Modal onClose={() => setShowConteo(false)}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '8px', textAlign: 'center' }}>
            <h2 style={{ color: '#004AFF' }}>✅ Modal de Conteo Funciona!</h2>
            <p>Si ves esto, el modal está funcionando correctamente.</p>
            <Button onClick={() => setShowConteo(false)} variant="primary">
              Cerrar
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
