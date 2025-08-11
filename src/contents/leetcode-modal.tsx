import cssText from "data-text:~style.css"
import type { PlasmoCSConfig } from "plasmo"
import React, { useState, useEffect, useRef } from "react"

export const config: PlasmoCSConfig = {
  matches: ["*://leetcode.com/*", "*://*.leetcode.com/*"]
}

export const getStyle = (): HTMLStyleElement => {
  const baseFontSize = 16
  let updatedCssText = cssText.replaceAll(":root", ":host(plasmo-csui)")
  const remRegex = /([\d.]+)rem/g
  updatedCssText = updatedCssText.replace(remRegex, (_, remValue) => {
    const pixelsValue = parseFloat(remValue) * baseFontSize
    return `${pixelsValue}px`
  })

  const styleElement = document.createElement("style")
  styleElement.textContent = updatedCssText
  return styleElement
}

interface Position {
  x: number
  y: number
}

interface LeetCodeContent {
  problemTitle: string
  problemDescription: string
  editorial: string
  solutions: string
  codeSection: string
  testCases: string
}

const DuckCodeModal = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState<Position>({ x: 20, y: 20 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 })
  const [isConnected, setIsConnected] = useState(false)
  const [interviewMode, setInterviewMode] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [conversationHistory, setConversationHistory] = useState<Array<{type: 'user' | 'ai' | 'system', text: string}>>([])
  
  // Helper function to add to transcript safely
  const addToTranscript = (newText: string, type: 'user' | 'ai' | 'system' = 'system') => {
    setConversationHistory(prev => {
      const updated = [...prev, { type, text: newText }]
      // Keep only last 10 messages to prevent memory issues
      if (updated.length > 10) {
        updated.splice(0, updated.length - 10)
      }
      return updated
    })
    
    // Update display transcript
    setTranscript(prev => {
      const lines = prev.split('\n')
      // Keep only last 20 lines to prevent stack overflow
      if (lines.length > 20) {
        lines.splice(0, lines.length - 20)
      }
      return lines.join('\n') + '\n\n' + newText
    })
  }
  const [currentProblem, setCurrentProblem] = useState<string>('')
  const [leetcodeContent, setLeetcodeContent] = useState<LeetCodeContent | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  
  const modalRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Scrape LeetCode content from the page
  const scrapeLeetCodeContent = (): LeetCodeContent => {
    const content: LeetCodeContent = {
      problemTitle: '',
      problemDescription: '',
      editorial: '',
      solutions: '',
      codeSection: '',
      testCases: ''
    }

    // Problem title
    const titleSelectors = [
      '[data-cy="question-title"]',
      'h1',
      '.css-v3d350',
      '[class*="title"]',
      '.question-title'
    ]
    
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector)
      if (element?.textContent?.trim()) {
        content.problemTitle = element.textContent.trim()
        break
      }
    }

    // Problem description (limit to prevent memory issues)
    const descriptionSelectors = [
      '[data-track-load="description_content"]',
      '.question-content',
      '[class*="description"]',
      '.problem-statement',
      '.content__u3I1 .question-content'
    ]
    
    for (const selector of descriptionSelectors) {
      const element = document.querySelector(selector)
      if (element?.textContent?.trim()) {
        // Limit description to 1000 characters to prevent memory issues
        content.problemDescription = element.textContent.trim().substring(0, 1000)
        break
      }
    }

    // Code section (current user code)
    const codeSelectors = [
      '.monaco-editor textarea',
      '.CodeMirror-code',
      '[data-track-load="qd_code_editor"]',
      '.ace_text-input',
      'textarea[autocomplete="off"]'
    ]
    
    for (const selector of codeSelectors) {
      const element = document.querySelector(selector) as HTMLTextAreaElement
      if (element?.value) {
        content.codeSection = element.value
        break
      }
    }

    // Test cases
    const testCaseSelectors = [
      '[data-track-load="example"]',
      '.example',
      '[class*="example"]',
      '.sample-test'
    ]
    
    const testCaseElements = document.querySelectorAll(testCaseSelectors.join(', '))
    content.testCases = Array.from(testCaseElements)
      .map(el => el.textContent?.trim())
      .filter(Boolean)
      .join('\n\n')

    // Editorial/solutions (if available)
    const editorialSelectors = [
      '.solution-content',
      '[data-track-load="solution"]',
      '.editorial',
      '[class*="solution"]'
    ]
    
    for (const selector of editorialSelectors) {
      const element = document.querySelector(selector)
      if (element?.textContent?.trim()) {
        content.editorial = element.textContent.trim()
        break
      }
    }

    return content
  }

  // Initialize OpenAI Chat API (fallback since Realtime API has auth issues in browser)
  const initializeRealtimeAPI = async () => {
    try {
      setConnectionStatus('connecting')
      
      // Get API key from storage
      const result = await chrome.storage.sync.get(['openaiApiKey'])
      const apiKey = result.openaiApiKey
      
      if (!apiKey) {
        addToTranscript('❌ Please configure your OpenAI API key in Settings.')
        setConnectionStatus('disconnected')
        return
      }

      // Scrape current LeetCode content
      const content = scrapeLeetCodeContent()
      setLeetcodeContent(content)

      setConnectionStatus('connected')
      setIsConnected(true)
      setTranscript(`🎤 Ready for interview! 

📋 Problem Context Loaded:
- Problem: ${content.problemTitle}
- Description: ${content.problemDescription.substring(0, 200)}...
- Current Code: ${content.codeSection || 'No code written yet'}

Click "Record" to start speaking about your approach!`)

    } catch (error) {
      console.error('Failed to initialize:', error)
      setConnectionStatus('disconnected')
      addToTranscript('❌ Failed to initialize. Please check your API key and try again.')
    }
  }

  // Send audio to OpenAI and get response
  const processAudioWithOpenAI = async (audioBlob: Blob) => {
    try {
      const result = await chrome.storage.sync.get(['openaiApiKey'])
      const apiKey = result.openaiApiKey
      
      if (!apiKey) {
        addToTranscript('❌ API key not found.')
        return
      }

      // Convert audio to base64
      const arrayBuffer = await audioBlob.arrayBuffer()
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

      // First, transcribe the audio using Whisper
      const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: (() => {
          const formData = new FormData()
          formData.append('file', audioBlob, 'audio.wav')
          formData.append('model', 'whisper-1')
          return formData
        })()
      })

      if (!transcriptionResponse.ok) {
        throw new Error(`Transcription failed: ${transcriptionResponse.statusText}`)
      }

      const transcriptionData = await transcriptionResponse.json()
      const userText = transcriptionData.text

      addToTranscript(`👤 You: ${userText}`, 'user')

      // Build conversation messages (limit to prevent token overflow)
      const messages = [
        {
          role: 'system' as const,
          content: `You are a mock coding interviewer. 

Problem: ${leetcodeContent?.problemTitle}
Description: ${leetcodeContent?.problemDescription?.substring(0, 500)}...
Current Code: ${leetcodeContent?.codeSection?.substring(0, 300) || 'No code written yet'}

Act as a friendly interviewer. Ask follow-up questions and provide feedback. Keep responses to 1-2 sentences.`
        }
      ]

      // Add recent conversation history (last 4 messages only)
      const recentHistory = conversationHistory.slice(-4)
      recentHistory.forEach(msg => {
        if (msg.type === 'user') {
          messages.push({ role: 'user' as const, content: msg.text.replace('👤 You: ', '') })
        } else if (msg.type === 'ai') {
          messages.push({ role: 'assistant' as const, content: msg.text.replace('🤖 Interviewer: ', '') })
        }
      })

      // Add current user message
      messages.push({ role: 'user' as const, content: userText })

      // Now send to GPT-4 for interview response
      const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages,
          max_tokens: 150,
          temperature: 0.7
        })
      })

      if (!chatResponse.ok) {
        throw new Error(`Chat API failed: ${chatResponse.statusText}`)
      }

      const chatData = await chatResponse.json()
      const aiResponse = chatData.choices[0]?.message?.content || 'I understand. Please continue.'

      addToTranscript(`🤖 Interviewer: ${aiResponse}`, 'ai')

      // Convert AI response to speech using TTS
      const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: aiResponse,
          voice: 'alloy',
          response_format: 'mp3'
        })
      })

      if (ttsResponse.ok) {
        const audioArrayBuffer = await ttsResponse.arrayBuffer()
        const audioBlob = new Blob([audioArrayBuffer], { type: 'audio/mpeg' })
        const audioUrl = URL.createObjectURL(audioBlob)
        
        const audio = new Audio(audioUrl)
        audio.play()
      }

    } catch (error) {
      console.error('Error processing audio:', error)
      addToTranscript(`❌ Error: ${error.message}`)
    }
  }



  // Start recording user audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        
        // Process the audio with OpenAI
        await processAudioWithOpenAI(audioBlob)
      }

      mediaRecorder.start()
      addToTranscript('🎤 Recording... Speak now!')
    } catch (error) {
      console.error('Error starting recording:', error)
      addToTranscript('❌ Microphone access denied. Please allow microphone access.')
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      addToTranscript('⏹️ Recording stopped. Processing...')
    }
  }

  // Detect LeetCode problem
  useEffect(() => {
    const detectProblem = () => {
      const titleSelectors = [
        '[data-cy="question-title"]',
        'h1',
        '.css-v3d350',
        '[class*="title"]',
        '.question-title'
      ]
      
      let titleElement = null
      for (const selector of titleSelectors) {
        titleElement = document.querySelector(selector)
        if (titleElement?.textContent?.trim()) {
          break
        }
      }
      
      const isProblemPage = window.location.pathname.includes('/problems/')
      
      if (titleElement || isProblemPage) {
        const problemTitle = titleElement?.textContent?.trim() || 
                           document.title.replace(' - LeetCode', '') || 
                           'LeetCode Problem'
        setCurrentProblem(problemTitle)
        setIsVisible(true)
      }
    }

    setTimeout(detectProblem, 1000)
    detectProblem()

    const observer = new MutationObserver(() => {
      setTimeout(detectProblem, 500)
    })
    observer.observe(document.body, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [])

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!modalRef.current) return
    
    const rect = modalRef.current.getBoundingClientRect()
    setIsDragging(true)
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return
    
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragOffset])

  const startInterview = async () => {
    setInterviewMode(true)
    await initializeRealtimeAPI()
  }

  const stopInterview = () => {
    setInterviewMode(false)
    setIsConnected(false)
    setConnectionStatus('disconnected')
    
    stopRecording()
    setTranscript('✅ Interview ended. Great job practicing!')
  }

  const toggleRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      stopRecording()
    } else {
      startRecording()
    }
  }

  if (!isVisible) return null

  return (
    <div
      ref={modalRef}
      className="duckcode-modal"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 10000,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
    >
      <div className="modal-header" onMouseDown={handleMouseDown}>
        <div className="header-content">
          <div className="logo">🦆</div>
          <div className="title">DuckCode</div>
          <div className={`status-indicator ${connectionStatus}`}>
            {connectionStatus === 'connected' && '🟢'}
            {connectionStatus === 'connecting' && '🟡'}
            {connectionStatus === 'disconnected' && '🔴'}
          </div>
        </div>
        <button 
          className="close-btn"
          onClick={() => setIsVisible(false)}
        >
          ×
        </button>
      </div>

      <div className="modal-body">
        <div className="problem-info">
          <div className="problem-title">{currentProblem}</div>
          <div className="problem-status">
            {leetcodeContent ? 'Content scraped ✅' : 'Problem detected ✅'}
          </div>
        </div>

        {!interviewMode ? (
          <button className="start-btn" onClick={startInterview}>
            <span className="btn-icon">🎤</span>
            Start Voice Interview
          </button>
        ) : (
          <div className="interview-controls">
            <button 
              className={`record-btn ${mediaRecorderRef.current?.state === 'recording' ? 'recording' : ''}`}
              onClick={toggleRecording}
              disabled={!isConnected}
            >
              <span className="btn-icon">
                {mediaRecorderRef.current?.state === 'recording' ? '⏹️' : '🎤'}
              </span>
              {mediaRecorderRef.current?.state === 'recording' ? 'Stop' : 'Record'}
            </button>
            
            <button className="stop-btn" onClick={stopInterview}>
              <span className="btn-icon">❌</span>
              End
            </button>
          </div>
        )}

        {transcript && (
          <div className="transcript">
            <div className="transcript-header">💬 Interview Transcript</div>
            <div className="transcript-content">{transcript}</div>
          </div>
        )}
      </div>

      <style>{`
        .duckcode-modal {
          width: 350px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
          border: 1px solid #e1e5e9;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          user-select: none;
          backdrop-filter: blur(10px);
          background: rgba(255, 255, 255, 0.95);
        }

        .modal-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 12px 16px;
          border-radius: 16px 16px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: grab;
        }

        .modal-header:active {
          cursor: grabbing;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .logo {
          font-size: 18px;
        }

        .title {
          font-weight: 600;
          font-size: 16px;
        }

        .status-indicator {
          font-size: 12px;
        }

        .close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .modal-body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .problem-info {
          text-align: center;
        }

        .problem-title {
          font-weight: 600;
          font-size: 14px;
          color: #333;
          margin-bottom: 4px;
        }

        .problem-status {
          font-size: 12px;
          color: #28a745;
        }

        .start-btn {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          border: none;
          border-radius: 12px;
          color: white;
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform 0.2s;
        }

        .start-btn:hover {
          transform: translateY(-1px);
        }

        .interview-controls {
          display: flex;
          gap: 8px;
        }

        .record-btn, .stop-btn {
          flex: 1;
          border: none;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .record-btn {
          background: #28a745;
          color: white;
        }

        .record-btn.recording {
          background: #dc3545;
          animation: pulse 2s infinite;
        }

        .record-btn:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }

        .stop-btn {
          background: #6c757d;
          color: white;
        }

        .record-btn:hover:not(:disabled), .stop-btn:hover {
          transform: translateY(-1px);
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }

        .transcript {
          background: #f8f9fa;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e9ecef;
          max-height: 200px;
        }

        .transcript-header {
          background: #e9ecef;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 600;
          color: #495057;
        }

        .transcript-content {
          padding: 12px;
          font-size: 12px;
          line-height: 1.4;
          color: #333;
          max-height: 150px;
          overflow-y: auto;
          white-space: pre-wrap;
        }

        .btn-icon {
          font-size: 14px;
        }
      `}</style>
    </div>
  )
}

export default DuckCodeModal