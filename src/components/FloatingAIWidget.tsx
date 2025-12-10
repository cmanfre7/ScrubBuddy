'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { MessageSquare, X, Send, Loader2, ImagePlus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Simple markdown renderer for chat messages
function renderMarkdown(text: string): React.ReactNode {
  // Split by lines first to handle line breaks
  const lines = text.split('\n')

  return lines.map((line, lineIdx) => {
    // Process inline formatting (bold, italic)
    const parts: React.ReactNode[] = []
    let partIdx = 0

    // Match **bold** patterns
    const boldRegex = /\*\*([^*]+)\*\*/g
    let lastIndex = 0
    let match

    while ((match = boldRegex.exec(line)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(<span key={`${lineIdx}-${partIdx++}`}>{line.slice(lastIndex, match.index)}</span>)
      }
      // Add the bold text
      parts.push(<strong key={`${lineIdx}-${partIdx++}`} className="font-semibold text-white">{match[1]}</strong>)
      lastIndex = match.index + match[0].length
    }

    // Add remaining text after last match
    if (lastIndex < line.length) {
      parts.push(<span key={`${lineIdx}-${partIdx++}`}>{line.slice(lastIndex)}</span>)
    }

    // If no matches, just use the line as-is
    if (parts.length === 0) {
      parts.push(<span key={`${lineIdx}-0`}>{line}</span>)
    }

    return (
      <span key={lineIdx}>
        {parts}
        {lineIdx < lines.length - 1 && <br />}
      </span>
    )
  })
}

interface ImageAttachment {
  data: string // base64
  mediaType: string
  preview: string // data URL for display
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  images?: ImageAttachment[]
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
      name: 'Clinical Notes',
      description: 'Rotation workspace with tabs for Patients, Pearls, Algorithms (diagnostic flowcharts from UWorld), and Pharm notes. Organized by rotation for shelf exam studying.'
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

// Convert file to base64
async function fileToBase64(file: File): Promise<{ data: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove the data URL prefix to get just the base64
      const base64 = result.split(',')[1]
      resolve({ data: base64, mediaType: file.type })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function FloatingAIWidget() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi! I\'m your AI Medical Assistant - a master clinician with full access to your ScrubBuddy data. I can help you with:\n\n- **Clinical questions** - differential diagnoses, workups, management\n- **UWorld analysis** - your weak areas, study recommendations\n- **Image interpretation** - paste or attach images (Ctrl+V or click +)\n- **Patient vignettes** - help you work through cases\n\nAsk me anything!'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [pendingImages, setPendingImages] = useState<ImageAttachment[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Get current page context
  const pageContext = getPageContext(pathname)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Handle paste event for images
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!isOpen) return

      const items = e.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) {
            await addImage(file)
          }
          break
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [isOpen])

  const addImage = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB')
      return
    }

    try {
      const { data, mediaType } = await fileToBase64(file)
      const preview = `data:${mediaType};base64,${data}`
      setPendingImages(prev => [...prev, { data, mediaType, preview }])
    } catch (error) {
      console.error('Error processing image:', error)
    }
  }

  const removeImage = (index: number) => {
    setPendingImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    for (const file of files) {
      await addImage(file)
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSend = async () => {
    if ((!input.trim() && pendingImages.length === 0) || isLoading) return

    const userMessage = input.trim()
    const imagesToSend = [...pendingImages]

    setInput('')
    setPendingImages([])

    // Add user message to chat
    const newUserMessage: Message = {
      role: 'user',
      content: userMessage || (imagesToSend.length > 0 ? '[Image attached]' : ''),
      images: imagesToSend.length > 0 ? imagesToSend : undefined
    }

    setMessages(prev => [...prev, newUserMessage])
    setIsLoading(true)

    try {
      // Build messages for API - need to include image data
      const apiMessages = [...messages, newUserMessage].map(msg => {
        if (msg.images && msg.images.length > 0) {
          return {
            role: msg.role,
            content: msg.content,
            images: msg.images.map(img => ({
              data: img.data,
              mediaType: img.mediaType
            }))
          }
        }
        return { role: msg.role, content: msg.content }
      })

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

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
                <p className="text-xs text-slate-400">Master Clinician Mode</p>
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
                    'max-w-[85%] rounded-lg px-4 py-2.5 text-sm',
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700/50 text-slate-200 border border-slate-600/50'
                  )}
                >
                  {/* Display images if present */}
                  {message.images && message.images.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {message.images.map((img, imgIdx) => (
                        <img
                          key={imgIdx}
                          src={img.preview}
                          alt="Attached"
                          className="max-w-full max-h-40 rounded-lg border border-slate-600"
                        />
                      ))}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">
                    {message.role === 'assistant' ? renderMarkdown(message.content) : message.content}
                  </div>
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

          {/* Pending images preview */}
          {pendingImages.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-700 bg-slate-800/50">
              <div className="flex gap-2 flex-wrap">
                {pendingImages.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={img.preview}
                      alt="Pending"
                      className="h-16 w-16 object-cover rounded-lg border border-slate-600"
                    />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-slate-700">
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="px-3 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 rounded-lg transition-colors"
                title="Attach image (or paste with Ctrl+V)"
              >
                <ImagePlus size={18} className="text-slate-300" />
              </button>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask clinical questions, paste images..."
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={(!input.trim() && pendingImages.length === 0) || isLoading}
                className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
              Ctrl+V to paste images | AI can make mistakes
            </p>
          </div>
        </div>
      )}
    </>
  )
}
