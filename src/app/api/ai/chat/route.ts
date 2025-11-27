import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not configured')
      return NextResponse.json(
        { error: 'AI service not configured. Please set ANTHROPIC_API_KEY environment variable.' },
        { status: 500 }
      )
    }

    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 })
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    // System prompt for medical assistant
    const systemPrompt = `You are an AI Medical Assistant helping medical students during their clinical rotations.

Your role is to:
- Answer clinical questions and help with differential diagnoses
- Provide study tips and exam preparation advice
- Explain medical concepts clearly and concisely
- Help with case presentations and clinical reasoning
- Offer mnemonic devices and memory aids
- Discuss board exam topics (USMLE Step 2 CK, COMLEX Level 2-CE, Shelf Exams)

Guidelines:
- Always emphasize patient safety and proper medical practice
- Remind students to verify critical information with attendings/residents
- Use evidence-based medicine principles
- Be encouraging and supportive of their learning journey
- Keep responses concise but thorough
- Use medical terminology appropriately while explaining complex concepts

You should NOT:
- Provide direct patient care advice
- Replace supervision from licensed physicians
- Give definitive diagnoses without proper clinical context
- Encourage unsafe or unethical practices

Remember: You're a study companion and knowledge resource, not a replacement for clinical judgment or supervision.`

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
    })

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : 'Sorry, I could not process that.'

    return NextResponse.json({ message: assistantMessage })
  } catch (error: any) {
    console.error('AI chat error:', error)

    // More detailed error messages
    let errorMessage = 'Failed to get AI response'
    if (error?.message) {
      errorMessage = error.message
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
