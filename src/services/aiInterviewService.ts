interface LeetCodeContent {
  problemTitle: string
  problemDescription: string
  topics: string
  hints: string
  testCases: string
}

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface InterviewContext {
  currentCode: string
  lastExecutedInput: string
  runtimeError: string
  runtimeException: string
}

class AIInterviewService {
  private apiKey: string
  private conversationHistory: ConversationMessage[] = []
  private staticContext: LeetCodeContent | null = null

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  setStaticContext(leetcodeContent: LeetCodeContent) {
    console.log('Setting static context:', leetcodeContent)
    this.staticContext = leetcodeContent
    // Clear conversation history when problem changes
    this.conversationHistory = []
    console.log('Conversation history cleared for new problem')
  }

  private buildSystemPrompt(): string {
    if (!this.staticContext) {
      return `You are a mock coding interviewer helping someone practice technical interviews. 
      Act as a friendly but professional interviewer. Keep responses conversational and encouraging. 
      Respond in a few words to a sentence unless absolutely neccessary. sentences. Never use code blocks or special characters like brackets, parentheses, or symbols. Write everything as plain text as if you were speaking it aloud. Refrain from asking any follow up questions, like it's a real interview.`
    }

    const { problemTitle, problemDescription, topics, hints, testCases } = this.staticContext

    return `You are a coding interviewer for: ${problemTitle}

Key topics: ${topics || 'General'}

Guidelines:
- Be extremely concise (under 15 words)
- Help debug code and suggest improvements
- No special characters or code blocks
- Speak naturally as plain text`
  }

  async transcribeAudio(audioBlob: Blob): Promise<string> {
    const formData = new FormData()
    const blobType = audioBlob.type || 'audio/webm'
    const extension = blobType.includes('wav')
      ? 'wav'
      : blobType.includes('mpeg') || blobType.includes('mp3')
        ? 'mp3'
        : blobType.includes('ogg')
          ? 'ogg'
          : blobType.includes('webm')
            ? 'webm'
            : 'wav'

    const file = new File([audioBlob], `audio.${extension}`, { type: blobType })

    formData.append('file', file)
    formData.append('model', 'whisper-1')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData
    })

    if (!response.ok) {
      let errorDetail = ''
      try {
        // Try to include server error details for debugging
        errorDetail = await response.text()
      } catch { }
      throw new Error(`Transcription failed: ${response.status} ${response.statusText} ${errorDetail}`)
    }

    const data = await response.json()
    return data.text || data?.result?.text || ''
  }

  async getInterviewResponse(userInput: string, context: InterviewContext): Promise<{ response: string, systemPrompt: string, userMessage: string }> {
    // Build dynamic context message and system prompt
    const contextMessage = this.buildContextMessage(context)
    const systemPrompt = this.buildSystemPrompt()
    const fullUserMessage = `${contextMessage}\n\nUser said: "${userInput}"`

    // Prepare messages for API - include conversation history properly
    const messages = [
      { role: 'system', content: systemPrompt },
      // Include previous conversation history (excluding current message)
      ...this.conversationHistory.slice(-8).map(msg => ({ // Keep last 8 messages for context
        role: msg.role,
        content: msg.content
      })),
      // Add current user message with context
      { role: 'user', content: fullUserMessage }
    ]

    // Console log for debugging
    console.log('=== AI INTERVIEW REQUEST ===')
    console.log('System Prompt:', systemPrompt)
    console.log('User Message:', fullUserMessage)
    console.log('Conversation History Length:', this.conversationHistory.length)
    console.log('Full Messages Array:', messages)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-nano',
        messages,
        reasoning_effort: "low",    // optional: less reasoning for faster response
        verbosity: "low"
        // max_tokens: 150,
        // temperature: 0.7
      })
    })

    if (!response.ok) {
      throw new Error(`Chat API failed: ${response.statusText}`)
    }

    const data = await response.json()
    const aiResponse = data.choices[0]?.message?.content || 'I understand. Please continue.'

    // Console log the response
    console.log('AI Response:', aiResponse)
    console.log('=== END AI INTERVIEW REQUEST ===')

    // Add both user message and AI response to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: userInput, // Store just the user input, not the full context
      timestamp: new Date()
    })

    this.conversationHistory.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    })

    return {
      response: aiResponse,
      systemPrompt,
      userMessage: fullUserMessage
    }
  }

  async getStreamingInterviewResponse(
    userInput: string,
    context: InterviewContext,
    onChunk: (chunk: string) => void
  ): Promise<{ fullResponse: string, systemPrompt: string, userMessage: string }> {
    // Build dynamic context message and system prompt
    const contextMessage = this.buildContextMessage(context)
    const systemPrompt = this.buildSystemPrompt()
    const fullUserMessage = `${contextMessage}\n\nUser said: "${userInput}"`

    // Prepare messages for API - include conversation history properly
    const messages = [
      { role: 'system', content: systemPrompt },
      // Include previous conversation history (excluding current message)
      ...this.conversationHistory.slice(-8).map(msg => ({ // Keep last 8 messages for context
        role: msg.role,
        content: msg.content
      })),
      // Add current user message with context
      { role: 'user', content: fullUserMessage }
    ]

    // Console log for debugging
    console.log('=== AI STREAMING REQUEST ===')
    console.log('System Prompt:', systemPrompt)
    console.log('User Message:', fullUserMessage)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-nano',
        messages,
        reasoning_effort: "low",
        verbosity: "low",
        stream: true
      })
    })

    if (!response.ok) {
      throw new Error(`Streaming Chat API failed: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No reader available for streaming response')
    }

    const decoder = new TextDecoder()
    let fullResponse = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                fullResponse += content
                onChunk(content)
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    // Console log the response
    console.log('Full Streaming Response:', fullResponse)
    console.log('=== END AI STREAMING REQUEST ===')

    // Add both user message and AI response to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: userInput, // Store just the user input, not the full context
      timestamp: new Date()
    })

    this.conversationHistory.push({
      role: 'assistant',
      content: fullResponse,
      timestamp: new Date()
    })

    return {
      fullResponse,
      systemPrompt,
      userMessage: fullUserMessage
    }
  }

  private buildContextMessage(context: InterviewContext): string {
    const parts = []

    // Only include code if it's not empty and not too long
    if (context.currentCode && context.currentCode.trim() !== 'No code written yet') {
      const codeLines = context.currentCode.split('\n').slice(0, 20) // Limit to 20 lines
      parts.push(`Code: ${codeLines.join('\n')}`)
    }

    // Only include errors if they exist and are short
    if (context.runtimeError && context.runtimeError.length < 200) {
      parts.push(`Error: ${context.runtimeError}`)
    }

    return parts.join('\n')
  }

  async synthesizeSpeech(text: string): Promise<Blob> {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        input: text,
        voice: 'alloy',
        response_format: 'mp3'
      })
    })

    if (!response.ok) {
      throw new Error(`TTS failed: ${response.statusText}`)
    }

    return await response.blob()
  }

  getConversationHistory(): ConversationMessage[] {
    return [...this.conversationHistory]
  }

  clearConversationHistory() {
    console.log('Clearing conversation history')
    this.conversationHistory = []
  }

  logConversationHistory() {
    console.log('Current conversation history:', this.conversationHistory)
  }
}

export { AIInterviewService, type LeetCodeContent, type ConversationMessage, type InterviewContext }