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
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error('[AI Chat] ANTHROPIC_API_KEY is not configured')
      return NextResponse.json(
        { error: 'AI service not configured. Please set ANTHROPIC_API_KEY environment variable in Railway.' },
        { status: 500 }
      )
    }

    // Validate API key format
    if (!apiKey.startsWith('sk-ant-')) {
      console.error('[AI Chat] ANTHROPIC_API_KEY has invalid format')
      return NextResponse.json(
        { error: 'Invalid API key format. Anthropic API keys should start with "sk-ant-"' },
        { status: 500 }
      )
    }

    console.log('[AI Chat] API key found and validated')

    const { messages, pageContext } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 })
    }

    console.log(`[AI Chat] Processing ${messages.length} messages`)
    if (pageContext) {
      console.log(`[AI Chat] Page context: ${pageContext.pageName} (${pageContext.currentPage})`)
    }

    // Initialize Anthropic client
    let anthropic: Anthropic
    try {
      anthropic = new Anthropic({
        apiKey: apiKey,
      })
      console.log('[AI Chat] Anthropic client initialized')
    } catch (initError: any) {
      console.error('[AI Chat] Failed to initialize Anthropic client:', initError)
      return NextResponse.json(
        { error: `Failed to initialize AI client: ${initError.message}` },
        { status: 500 }
      )
    }

    // Build page context section for system prompt
    let pageContextSection = ''
    if (pageContext && pageContext.pageName && pageContext.pageDescription) {
      pageContextSection = `
CURRENT CONTEXT:
The user is currently on the "${pageContext.pageName}" page (${pageContext.currentPage}).
This page is for: ${pageContext.pageDescription}

You have full awareness of what page the user is viewing. Use this context to provide more relevant and helpful responses. If they ask about something related to the current page, you can reference it specifically.
`
    }

    // System prompt for medical assistant with page context
    const systemPrompt = `You are an AI Medical Assistant embedded in ScrubBuddy, a productivity app for 3rd and 4th year medical students during clinical rotations.
${pageContextSection}
Your role is to:
- Answer clinical questions and help with differential diagnoses
- Provide study tips and exam preparation advice (Step 2 CK, COMLEX Level 2-CE, Shelf Exams)
- Explain medical concepts clearly and concisely
- Help with case presentations and clinical reasoning
- Offer mnemonic devices and memory aids
- Help users understand and use features of the current page they're on
- Provide context-aware assistance based on what page the user is viewing

Guidelines:
- Always emphasize patient safety and proper medical practice
- Remind students to verify critical information with attendings/residents
- Use evidence-based medicine principles
- Be encouraging and supportive of their learning journey
- Keep responses concise but thorough
- Use medical terminology appropriately while explaining complex concepts
- Reference the current page context when relevant to help users navigate the app

You should NOT:
- Provide direct patient care advice
- Replace supervision from licensed physicians
- Give definitive diagnoses without proper clinical context
- Encourage unsafe or unethical practices

Remember: You're a study companion and knowledge resource with awareness of the user's current location in the app.`

    // Make API call to Anthropic
    console.log('[AI Chat] Calling Anthropic API...')
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
    })

    console.log('[AI Chat] Received response from Anthropic')

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : 'Sorry, I could not process that.'

    return NextResponse.json({ message: assistantMessage })
  } catch (error: any) {
    console.error('[AI Chat] Error details:', {
      message: error?.message,
      status: error?.status,
      type: error?.type,
      error: error
    })

    // More detailed error messages based on error type
    let errorMessage = 'Failed to get AI response'
    let statusCode = 500

    if (error?.status === 401) {
      errorMessage = 'Invalid API key. Please check your ANTHROPIC_API_KEY in Railway settings.'
      statusCode = 401
    } else if (error?.status === 429) {
      errorMessage = 'Rate limit exceeded. Please try again in a moment.'
      statusCode = 429
    } else if (error?.status === 400) {
      errorMessage = `Bad request: ${error?.message || 'Invalid request to AI service'}`
      statusCode = 400
    } else if (error?.message) {
      errorMessage = `AI service error: ${error.message}`
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}
