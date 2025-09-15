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

interface PersonalitySettings {
  mode: 'sage' | 'interviewer'
  sageRevelation: number // 0-100
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

  private buildSystemPrompt(isTextMode: boolean = false, personality: PersonalitySettings = { mode: 'interviewer', sageRevelation: 30 }): string {
    if (!this.staticContext) {
      if (isTextMode) {
        return this.buildPersonalityPrompt(personality, false)
      } else {
        return this.buildPersonalityPrompt(personality, true) + `

ADDITIONAL VOICE CONSTRAINTS:
- Never end with questions like "What do you think?" or "Does this help?"
- Avoid phrases like "Feel free to ask" or "Let me know if you need more help"
- Don't suggest multiple options - pick the best one and state it
- Skip explanations of what you're about to explain
- Be decisive and direct in your advice`
      }
    }

    const baseContext = `
PROBLEM CONTEXT:
Title: ${this.staticContext.problemTitle}
Description: ${this.staticContext.problemDescription}

Topics: ${this.staticContext.topics}
Hints: ${this.staticContext.hints}
Test Cases: ${this.staticContext.testCases}
`

    const personalityPrompt = this.buildPersonalityPrompt(personality, !isTextMode)
    
    if (isTextMode) {
      return `${personalityPrompt}

${baseContext}

CRITICAL: ALWAYS respond in the context of the specific programming language the user is working with. When you see their code:
- Detect the programming language from their code syntax, file context, or problem setup
- Provide solutions, suggestions, and examples ONLY in that same language
- If they're writing Python, respond with Python code and Python-specific advice
- If they're writing Java, respond with Java code and Java-specific advice
- If they're writing JavaScript, respond with JavaScript code and JavaScript-specific advice
- If they're writing C++, respond with C++ code and C++-specific advice
- Match their coding style, naming conventions, and language idioms
- Never mix languages or suggest solutions in a different language than what they're using

CRITICAL FORMATTING RULES - YOU MUST FOLLOW THESE EXACTLY:
- Use **bold** for important terms and concepts
- Use \`inline code\` for variable names, functions, and short code snippets
- Use code blocks with language specification for longer code examples:
  \`\`\`python
  def example():
      return "formatted code"
  \`\`\`
- Use ### for headers when organizing complex responses
- Use bullet points for lists and step-by-step instructions
- Never use plain text for code - always format it properly

Remember: The user can see your response as formatted markdown, so use proper formatting to make it readable and professional.`
    } else {
      return `${personalityPrompt}

${baseContext}

Focus on the specific programming language the user is working with.

VOICE MODE CONSTRAINTS:
- ${personality.mode === 'interviewer' ? 'Keep responses under 75 words maximum - be extremely brief and professional' : 'Keep responses under 100 words maximum'}
- NEVER ask follow-up questions unless essential for clarification
- Be direct and decisive - no rambling or conversational filler
- Skip introductory phrases and get straight to the point
- Avoid ending with questions or suggestions for more help
- ${personality.mode === 'interviewer' ? 'Use minimal professional language - just facts' : 'Use simple, direct language'}`
    }
  }

  private buildPersonalityPrompt(personality: PersonalitySettings, isVoiceMode: boolean): string {
    if (personality.mode === 'sage') {
      const revelationLevel = personality.sageRevelation
      let helpLevel = ''
      
      if (revelationLevel <= 20) {
        helpLevel = isVoiceMode 
          ? 'Give brief hints. No questions unless essential.'
          : 'Provide only subtle hints and ask guiding questions. Never reveal the solution directly.'
      } else if (revelationLevel <= 40) {
        helpLevel = isVoiceMode 
          ? 'Give helpful hints and brief code snippets. Keep explanations short.'
          : 'Give helpful hints and show small code snippets when asked. Guide them toward the solution.'
      } else if (revelationLevel <= 60) {
        helpLevel = isVoiceMode 
          ? 'Provide clear but concise explanations with short code examples.'
          : 'Provide clear explanations and show relevant code examples. Help them understand the approach.'
      } else if (revelationLevel <= 80) {
        helpLevel = isVoiceMode 
          ? 'Give focused explanations with key code examples. No unnecessary details.'
          : 'Give detailed explanations with code examples. Show most of the solution when they\'re stuck.'
      } else {
        helpLevel = isVoiceMode 
          ? 'Provide complete but concise solutions. Focus on the essential parts only.'
          : 'Provide complete solutions with full explanations when asked. Act as a comprehensive coding assistant.'
      }

      if (isVoiceMode) {
        return `You are a wise coding sage and pair programming partner helping via voice conversation. ${helpLevel}

CRITICAL VOICE MODE RULES:
- Keep ALL responses under 100 words maximum
- Be direct and concise - no rambling
- Avoid follow-up questions unless absolutely necessary
- Skip introductory phrases like "Great question!" or "Let me think about this"
- Get straight to the point
- Use simple, clear language that's easy to understand when spoken
- No complex formatting or lists - speak naturally

Your role: Act like an experienced mentor giving quick, focused advice.`
      } else {
        return `You are a wise coding sage and pair programming partner. You're here to help someone learn and solve coding problems. ${helpLevel}

Your role:
- Act like an experienced mentor who wants to teach, not just give answers
- Encourage learning and understanding over quick fixes
- Ask clarifying questions to understand their thought process
- Celebrate their progress and insights
- Provide constructive feedback on their code and approach
- Help them develop problem-solving skills

Use proper markdown formatting for clear communication.`
      }
    } else {
      if (isVoiceMode) {
        return `You are a professional technical interviewer conducting a coding interview via voice.

CRITICAL VOICE MODE RULES:
- Keep ALL responses under 75 words maximum
- Be extremely brief and professional
- Never ask follow-up questions unless essential for clarification
- Give direct, factual answers only
- Skip conversational elements entirely
- No encouragement phrases - just facts

Your role:
- Answer syntax questions directly
- Clarify problem requirements briefly
- Explain errors concisely
- Provide quick feedback on approach/complexity

You should NOT: Give solutions, write code, or provide major hints. Keep it minimal and professional.`
      } else {
        return `You are a professional technical interviewer conducting a coding interview. Your role is to:

- Ask clarifying questions about the problem requirements
- Answer syntax questions and language-specific queries
- Clarify edge cases and constraints
- Provide feedback on approach and time/space complexity
- Help with debugging syntax errors
- Explain compiler/runtime errors

You should NOT:
- Give away the solution or major hints about the algorithm
- Write the code for them
- Reveal optimal approaches unless they specifically ask about complexity after solving
- Help with logic beyond clarifying the problem statement

Be encouraging but maintain professional interview standards. Focus on helping them demonstrate their problem-solving skills.

Use proper markdown formatting for clear communication.`
      }
    }
  }

  private buildContextMessage(context: InterviewContext): string {
    let message = "CURRENT CONTEXT:\n"
    
    if (context.currentCode.trim()) {
      message += `Current code:\n\`\`\`\n${context.currentCode}\n\`\`\`\n`
    }
    
    if (context.lastExecutedInput.trim()) {
      message += `Last test input: ${context.lastExecutedInput}\n`
    }
    
    if (context.runtimeError.trim()) {
      message += `Runtime error: ${context.runtimeError}\n`
    }
    
    if (context.runtimeException.trim()) {
      message += `Runtime exception: ${context.runtimeException}\n`
    }
    
    return message
  }

  async getInterviewResponse(
    userInput: string, 
    context: InterviewContext, 
    isTextMode: boolean = false,
    personality: PersonalitySettings = { mode: 'interviewer', sageRevelation: 30 }
  ): Promise<{ response: string, systemPrompt: string, userMessage: string }> {
    // Build dynamic context message and system prompt
    const contextMessage = this.buildContextMessage(context)
    const systemPrompt = this.buildSystemPrompt(isTextMode, personality)
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

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: messages as any,
          max_tokens: 2000,
          temperature: 0.7
        })
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      const aiResponse = data.choices[0].message.content

      // Add to conversation history
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

      console.log('AI Response received and added to history:', aiResponse)

      return {
        response: aiResponse,
        systemPrompt,
        userMessage: fullUserMessage
      }
    } catch (error) {
      console.error('Error getting interview response:', error)
      throw error
    }
  }

  async getStreamingInterviewResponse(
    userInput: string,
    context: InterviewContext,
    onChunk: (chunk: string) => void,
    isTextMode: boolean = false,
    personality: PersonalitySettings = { mode: 'interviewer', sageRevelation: 30 }
  ): Promise<{ fullResponse: string, systemPrompt: string, userMessage: string }> {
    // Build dynamic context message and system prompt
    const contextMessage = this.buildContextMessage(context)
    const systemPrompt = this.buildSystemPrompt(isTextMode, personality)
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
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: messages as any,
        max_tokens: 2000,
        temperature: 0.7,
        stream: true
      })
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Failed to get response reader')
    }

    let fullResponse = ''
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            
            if (data === '[DONE]') {
              break
            }

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content

              if (content) {
                fullResponse += content
                onChunk(content)
              }
            } catch (e) {
              // Skip invalid JSON lines
              continue
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    // Add to conversation history
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

    console.log('Streaming AI Response completed and added to history:', fullResponse)

    return {
      fullResponse,
      systemPrompt,
      userMessage: fullUserMessage
    }
  }

  clearHistory() {
    this.conversationHistory = []
    console.log('Conversation history cleared')
  }

  getHistory(): ConversationMessage[] {
    return [...this.conversationHistory]
  }

  async transcribeAudio(audioBlob: Blob): Promise<string> {
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.webm')
    formData.append('model', 'whisper-1')

    try {
      // Create an AbortController for timeout handling
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Transcription API request failed: ${response.status}`)
      }

      const data = await response.json()
      return data.text || 'No transcription available'
    } catch (error) {
      console.error('Error transcribing audio:', error)
      if (error.name === 'AbortError') {
        throw new Error('Audio transcription timed out. Please try with a shorter recording.')
      }
      throw error
    }
  }

  async synthesizeSpeech(text: string): Promise<Blob> {
    try {
      // Create an AbortController for timeout handling
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000) // 20 second timeout

      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: 'alloy',
          response_format: 'mp3'
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Speech synthesis API request failed: ${response.status}`)
      }

      return await response.blob()
    } catch (error) {
      console.error('Error synthesizing speech:', error)
      if (error.name === 'AbortError') {
        throw new Error('Speech synthesis timed out. The response might be too long.')
      }
      throw error
    }
  }
}

export { AIInterviewService, type InterviewContext, type LeetCodeContent, type PersonalitySettings }