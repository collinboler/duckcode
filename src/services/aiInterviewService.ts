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
      Respond in 1-2 sentences. Never use code blocks or special characters like brackets, parentheses, or symbols. Write everything as plain text as if you were speaking it aloud.`
    }

    const { problemTitle, problemDescription, topics, hints, testCases } = this.staticContext

    return `You are a mock coding interviewer helping someone practice technical interviews.

PROBLEM CONTEXT (Static - doesn't change during interview):
- Problem: ${problemTitle}
- Description: ${problemDescription}
- Topics/Tags: ${topics || 'None specified'}
- Test Cases: ${testCases || 'None provided'}
- Hints: ${hints || 'No hints available'}

INTERVIEW GUIDELINES:
- Act as a friendly but professional interviewer
- Ask follow-up questions about their approach
- Help them think through edge cases and provide constructive feedback
- You can see their current code and any execution results/errors in the user messages
- The topics/tags give you insight into what algorithms or data structures are relevant
- If there are runtime errors or exceptions, help them debug and understand what went wrong
- If hints are available, you can reference them subtly to guide the candidate without being too direct
- Keep responses conversational and encouraging
- Respond in 1-2 sentences
- Focus on the problem-solving process, not just the final answer

IMPORTANT OUTPUT FORMATTING:
- Never use code blocks, backticks, or any markdown formatting
- Never use special characters like brackets, parentheses, curly braces, or symbols in your responses
- Write everything as plain text as if you were speaking it aloud
- Instead of "String[]" say "string array"
- Instead of "nums[i]" say "nums at index i"
- Instead of "O(n)" say "linear time complexity"
- Instead of "HashMap<>" say "hash map"
- Speak naturally as if in a real interview conversation`
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
    formData.append('model', 'gpt-4o-mini-transcribe')

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
      } catch {}
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
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 150,
        temperature: 0.7
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

  private buildContextMessage(context: InterviewContext): string {
    const parts = []
    
    parts.push(`CURRENT CONTEXT:`)
    parts.push(`- Current Code: ${context.currentCode || 'No code written yet'}`)
    
    if (context.lastExecutedInput) {
      parts.push(`- Last Input: ${context.lastExecutedInput}`)
    }
    
    if (context.runtimeError) {
      parts.push(`- Runtime Error: ${context.runtimeError}`)
    }
    
    if (context.runtimeException) {
      parts.push(`- Exception: ${context.runtimeException}`)
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
        model: 'tts-1',
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