'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { MessageSquare, X, Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface PageContext {
  currentPage: string
  pageName: string
  pageDescription: string
}

// Map routes to human-readable page names and descriptions
function getPageContext(pathname: string): PageContext {
  const pageMap: Record<string, { name: string; description: string }> = {
    '/dashboard': {
      name: 'Dashboard',
      description: 'Main dashboard showing UWorld progress, countdowns to exams (Step 2 CK, COMLEX, Shelf), study streak, weak areas, clinical pearls, goals, and today\'s schedule.'
    },
    '/dashboard/uworld': {
      name: 'UWorld Tracker',
      description: 'Track daily UWorld question blocks, view performance by subject/system, manage incorrect questions for review, and see cumulative statistics.'
    },
    '/dashboard/analytics': {
      name: 'Analytics & Score Predictions',
      description: 'View detailed performance analytics, score predictions for Step 2 CK and COMLEX, shelf exam projections, and study progress over time.'
    },
    '/dashboard/calendar': {
      name: 'Calendar',
      description: 'Manage schedule with events for clinical rotations, study sessions, exams, and personal appointments.'
    },
    '/dashboard/patients': {
      name: 'Patient Log',
      description: 'Log patient encounters for ERAS applications, tracking chief complaints, diagnoses, procedures performed, and notes by rotation.'
    },
    '/dashboard/procedures': {
      name: 'Procedure Reference',
      description: 'Reference library of medical procedures with quick guides and personal procedure counts.'
    },
    '/dashboard/settings': {
      name: 'Settings',
      description: 'Configure rotations, exam dates (Step 2 CK, COMLEX), target scores, UWorld question totals, and profile settings.'
    },
    '/dashboard/anking': {
      name: 'AnKing Tracker',
      description: 'Track AnKing flashcard progress by deck and subject for medical school studying.'
    },
    '/dashboard/clinical-notes': {
      name: 'Clinical Notes & Pearls',
      description: 'Store clinical pearls, learning points, and notes from rotations for future reference.'
    },
  }

  // Find matching route (handle dynamic routes)
  const exactMatch = pageMap[pathname]
  if (exactMatch) {
    return { currentPage: pathname, pageName: exactMatch.name, pageDescription: exactMatch.description }
  }

  // Check for partial matches (for nested routes)
  for (const [route, info] of Object.entries(pageMap)) {
    if (pathname.startsWith(route) && route !== '/dashboard') {
      return { currentPage: pathname, pageName: info.name, pageDescription: info.description }
    }
  }

  // Default for dashboard sub-pages
  if (pathname.startsWith('/dashboard')) {
    return {
      currentPage: pathname,
      pageName: 'Dashboard Section',
      pageDescription: 'A section of the ScrubBuddy dashboard for medical student productivity tracking.'
    }
  }

  return {
    currentPage: pathname,
    pageName: 'ScrubBuddy',
    pageDescription: 'Medical student productivity and tracking application.'
  }
}

export function FloatingAIWidget() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi! I\'m your AI Medical Assistant. I can see what page you\'re on and help with clinical questions, study tips, differential diagnoses, and more. What can I help you with today?'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Get current page context
  const pageContext = getPageContext(pathname)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
          pageContext: pageContext
        })
      })

      if (!res.ok) throw new Error('Failed to get response')

      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
    } catch (error) {
      console.error('AI chat error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group hover:scale-110"
          aria-label="Open AI Assistant"
        >
          <MessageSquare className="text-white" size={24} />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse"></span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-slate-800 border border-slate-700 rounded-xl shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-gradient-to-r from-blue-500/10 to-purple-600/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <MessageSquare className="text-white" size={20} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">AI Medical Assistant</h3>
                <p className="text-xs text-slate-400">Always here to help</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-4 py-2.5 text-sm',
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700/50 text-slate-200 border border-slate-600/50'
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg px-4 py-2.5 bg-slate-700/50 border border-slate-600/50">
                  <Loader2 className="animate-spin text-slate-400" size={16} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything medical..."
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
              AI can make mistakes. Verify critical information.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
