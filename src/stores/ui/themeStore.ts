/**
 * Theme management store
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeState {
  mode: ThemeMode
  resolvedTheme: 'light' | 'dark'
  setMode: (mode: ThemeMode) => void
  initializeTheme: () => void
}

// Detect system theme preference
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

// Resolve theme based on mode
const resolveTheme = (mode: ThemeMode): 'light' | 'dark' => {
  if (mode === 'system') {
    return getSystemTheme()
  }
  return mode
}

// Apply theme to document
const applyTheme = (theme: 'light' | 'dark') => {
  if (typeof document !== 'undefined') {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      resolvedTheme: 'light',
      
      setMode: (mode: ThemeMode) => {
        const resolvedTheme = resolveTheme(mode)
        applyTheme(resolvedTheme)
        set({ mode, resolvedTheme })
      },
      
      initializeTheme: () => {
        const { mode } = get()
        const resolvedTheme = resolveTheme(mode)
        applyTheme(resolvedTheme)
        set({ resolvedTheme })
        
        // Listen for system theme changes
        if (typeof window !== 'undefined') {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
          const handleChange = () => {
            const currentMode = get().mode
            if (currentMode === 'system') {
              const newResolvedTheme = getSystemTheme()
              applyTheme(newResolvedTheme)
              set({ resolvedTheme: newResolvedTheme })
            }
          }
          
          mediaQuery.addEventListener('change', handleChange)
          return () => mediaQuery.removeEventListener('change', handleChange)
        }
      }
    }),
    {
      name: 'openuda-theme',
      partialize: (state) => ({ mode: state.mode })
    }
  )
) 