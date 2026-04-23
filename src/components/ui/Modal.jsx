import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export default function Modal({ onClose, children, maxWidth = 'max-w-lg' }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    // Impede scroll do body enquanto modal está aberto
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose()
  }

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-150"
    >
      <div className={`w-full ${maxWidth} bg-slate-800 border border-slate-700 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 max-h-[90vh] overflow-y-auto`}>
        {children}
      </div>
    </div>,
    document.body
  )
}
