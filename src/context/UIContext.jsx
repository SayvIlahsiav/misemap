/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react'

const UIContext = createContext(null)

export const UIProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('mm_theme') || 'light'
  })
  const [toasts, setToasts] = useState([])
  const [confirmDialog, setConfirmDialog] = useState(null)

  // Sync theme to body tag
  useEffect(() => {
    const body = document.body
    if (theme === 'dark') {
      body.classList.add('dark-theme')
    } else {
      body.classList.remove('dark-theme')
    }
    localStorage.setItem('mm_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'))
  }

  // Toast Handler
  const showToast = (message, type = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts(prev => [...prev, { id, message, type }])
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3200)
  }

  // Custom Promise-based Confirm Handler
  const confirm = (title, message) => {
    return new Promise((resolve) => {
      setConfirmDialog({
        title,
        message,
        onConfirm: () => {
          setConfirmDialog(null)
          resolve(true)
        },
        onCancel: () => {
          setConfirmDialog(null)
          resolve(false)
        }
      })
    })
  }

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <UIContext.Provider value={{ theme, toggleTheme, toasts, showToast, confirm, confirmDialog, removeToast }}>
      {children}
    </UIContext.Provider>
  )
}

export const useUI = () => {
  const context = useContext(UIContext)
  if (!context) {
    throw new Error('useUI must be used within a UIProvider')
  }
  return context
}
