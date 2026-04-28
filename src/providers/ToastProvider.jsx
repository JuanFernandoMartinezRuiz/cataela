import { createContext, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  function dismissToast(id) {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }

  function showToast({
    title,
    description = '',
    tone = 'success',
    duration = 3200,
  }) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts((current) => [...current, { id, title, description, tone }])

    window.setTimeout(() => {
      dismissToast(id)
    }, duration)
  }

  const value = useMemo(
    () => ({
      showToast,
      dismissToast,
    }),
    [],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast debe usarse dentro de ToastProvider.')
  }

  return context
}

function ToastViewport({ toasts, onDismiss }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[120] flex w-full max-w-sm flex-col gap-3 sm:right-6 sm:top-6">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-[1.5rem] border border-dashed bg-white/95 p-4 shadow-card backdrop-blur animate-[toast-in_220ms_ease-out] ${
            toneStyles[toast.tone] || toneStyles.success
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-700">{toast.title}</p>
              {toast.description ? (
                <p className="mt-1 text-sm text-slate-500">{toast.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="rounded-full px-2 py-1 text-xs font-semibold text-slate-400 transition hover:bg-white hover:text-slate-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

const toneStyles = {
  success: 'border-sageDeep/90',
  error: 'border-roseDeep/85',
  warning: 'border-sunDeep/90',
}
