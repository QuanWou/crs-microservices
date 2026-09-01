import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

type ToastKind = 'success' | 'error'
interface ToastItem { id: number; message: string; kind: ToastKind }
interface ToastContextValue { showToast: (message: string, kind?: ToastKind) => void }
const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const showToast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = Date.now() + Math.random()
    setItems((current) => [...current, { id, message, kind }])
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 3500)
  }, [])
  const value = useMemo(() => ({ showToast }), [showToast])
  return <ToastContext.Provider value={value}>{children}<div className="toast-stack" aria-live="polite">{items.map((item) => <div className={`toast toast-${item.kind}`} role="status" key={item.id}>{item.message}</div>)}</div></ToastContext.Provider>
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast phải được dùng bên trong ToastProvider')
  return context
}
