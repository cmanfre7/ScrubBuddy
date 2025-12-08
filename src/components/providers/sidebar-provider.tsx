'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

interface SidebarContextType {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  toggle: () => void
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
  toggleMobile: () => void
  isMobile: boolean
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

const STORAGE_KEY = 'scrubbuddy-sidebar-collapsed'

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false)
  const [mobileOpen, setMobileOpenState] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load initial state from localStorage and detect mobile
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved !== null) {
      setCollapsedState(saved === 'true')
    }

    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)

    setIsLoaded(true)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    if (!isMobile && mobileOpen) {
      setMobileOpenState(false)
    }
  }, [isMobile, mobileOpen])

  // Save to localStorage when changed
  const setCollapsed = (value: boolean) => {
    setCollapsedState(value)
    localStorage.setItem(STORAGE_KEY, String(value))
  }

  const toggle = () => {
    setCollapsed(!collapsed)
  }

  const setMobileOpen = (value: boolean) => {
    setMobileOpenState(value)
  }

  const toggleMobile = () => {
    setMobileOpenState(!mobileOpen)
  }

  // Don't render children until loaded to prevent hydration mismatch
  if (!isLoaded) {
    return null
  }

  return (
    <SidebarContext.Provider value={{
      collapsed,
      setCollapsed,
      toggle,
      mobileOpen,
      setMobileOpen,
      toggleMobile,
      isMobile
    }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}
