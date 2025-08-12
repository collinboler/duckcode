import cssText from "data-text:~style.css"
import type { PlasmoCSConfig } from "plasmo"
import React, { useState, useEffect, useRef } from "react"
import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser
} from '@clerk/chrome-extension'
import { AIInterviewService, type LeetCodeContent, type InterviewContext } from '../services/aiInterviewService'

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
  topics: string
  editorial: string
  solutions: string
  codeSection: string
  testCases: string
  hints: string
  lastExecutedInput: string
  runtimeError: string
  runtimeException: string
}

// Get environment variables
const PUBLISHABLE_KEY = process.env.PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY
const EXTENSION_URL = chrome.runtime.getURL('.')

if (!PUBLISHABLE_KEY) {
  throw new Error('Please add the PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY to the .env.development file')
}

// Function to open sidepanel settings
const openSidepanelSettings = () => {
  // Send message to background script to open sidepanel and navigate to settings
  chrome.runtime.sendMessage({
    action: 'openSidepanel',
    route: '/settings'
  }).catch((error) => {
    console.error('Failed to send message to open sidepanel:', error)
  })
}

// Main modal content component (needs to be inside ClerkProvider)
const DuckCodeModalContent = () => {
  const { user, isSignedIn } = useUser()
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState<Position>({ x: 20, y: 20 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 })
  const [isConnected, setIsConnected] = useState(false)
  const [interviewMode, setInterviewMode] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [currentProblem, setCurrentProblem] = useState<string>('')
  const [leetcodeContent, setLeetcodeContent] = useState<LeetCodeContent | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [isMinimized, setIsMinimized] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  const [duckPosition, setDuckPosition] = useState<Position>({ x: 0, y: 0 })
  const [isDuckDragging, setIsDuckDragging] = useState(false)
  const [duckDragOffset, setDuckDragOffset] = useState<Position>({ x: 0, y: 0 })
  const [isSnapping, setIsSnapping] = useState(false)
  const [dragStartPosition, setDragStartPosition] = useState<Position>({ x: 0, y: 0 })
  const [aiService, setAiService] = useState<AIInterviewService | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingShortcut, setRecordingShortcut] = useState('ctrl+shift+r')
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set())
  const [isSpeaking, setIsSpeaking] = useState(false)

  const modalRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Load recording shortcut from storage
  useEffect(() => {
    chrome.storage.sync.get(['recordingShortcut'], (result) => {
      setRecordingShortcut(result.recordingShortcut || 'ctrl+shift+r')
    })
  }, [])

  // Initialize duck position
  useEffect(() => {
    const initializeDuckPosition = () => {
      const x = Math.max(20, window.innerWidth - 80)
      const y = Math.max(20, window.innerHeight - 80)
      console.log('Initializing duck position:', { x, y }, 'Window:', window.innerWidth, window.innerHeight)
      setDuckPosition({ x, y })
    }

    // Small delay to ensure window dimensions are available
    setTimeout(initializeDuckPosition, 100)
  }, [])

  // Helper function to clean HTML entities
  const cleanHtmlEntities = (text: string): string => {
    return text
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
  }

  // Scrape LeetCode content from the page
  const scrapeLeetCodeContent = (): LeetCodeContent => {
    const content: LeetCodeContent = {
      problemTitle: '',
      problemDescription: '',
      topics: '',
      editorial: '',
      solutions: '',
      codeSection: '',
      testCases: '',
      hints: '',
      lastExecutedInput: '',
      runtimeError: '',
      runtimeException: ''
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
        content.problemTitle = cleanHtmlEntities(element.textContent.trim())
        break
      }
    }

    // Problem description
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
        content.problemDescription = cleanHtmlEntities(element.textContent.trim())
        break
      }
    }

    // Topics/Tags (if available)
    const topicSelectors = [
      '[data-cy="topic-tag"]',
      '.topic-tag',
      '[class*="topic"]',
      '[class*="tag"]',
      '.tag',
      '[data-track-load="tag"]',
      '.difficulty + div a', // Topics often appear after difficulty
      '[class*="badge"]'
    ]

    let allTopics: string[] = []

    topicSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector)
      elements.forEach(el => {
        const text = el.textContent?.trim()
        if (text && text.length > 0 && text.length < 50 &&
          !text.toLowerCase().includes('easy') &&
          !text.toLowerCase().includes('medium') &&
          !text.toLowerCase().includes('hard') &&
          !text.toLowerCase().includes('difficulty')) {
          allTopics.push(text)
        }
      })
    })

    // Also look for topics in specific patterns
    const topicPatterns = document.querySelectorAll('a[href*="/tag/"], a[href*="/topic/"]')
    topicPatterns.forEach(el => {
      const text = el.textContent?.trim()
      if (text && text.length > 0 && text.length < 50) {
        allTopics.push(text)
      }
    })

    // Clean up and deduplicate topics
    const uniqueTopics = [...new Set(allTopics)]
      .map(topic => cleanHtmlEntities(topic))
      .filter(topic => topic.length > 0 && topic.length < 50)
      .slice(0, 10) // Limit to 10 topics

    if (uniqueTopics.length > 0) {
      content.topics = uniqueTopics.join(', ')
    }

    // Code section (current user code) - enhanced Monaco editor detection
    let codeContent = ''

    // Strategy 1: Try Monaco editor model content
    try {
      // @ts-ignore - Monaco editor global
      if (window.monaco && window.monaco.editor) {
        const editors = window.monaco.editor.getEditors()
        if (editors && editors.length > 0) {
          const editor = editors[0]
          codeContent = editor.getValue()
        }
      }
    } catch (e) {
      console.log('Monaco editor not accessible via global')
    }

    // Strategy 2: Try to get code from Monaco editor DOM
    if (!codeContent) {
      const monacoLines = document.querySelectorAll('.monaco-editor .view-lines .view-line')
      if (monacoLines.length > 0) {
        const lines = Array.from(monacoLines).map(line => {
          // Get text content, preserving spaces
          return line.textContent || ''
        })
        codeContent = lines.join('\n')
      }
    }

    // Strategy 3: Try textarea and other input methods
    if (!codeContent) {
      const codeSelectors = [
        '.monaco-editor textarea',
        '.CodeMirror-code',
        '[data-track-load="qd_code_editor"]',
        '.ace_text-input',
        'textarea[autocomplete="off"]',
        'textarea[data-mode-id]',
        '.inputarea'
      ]

      for (const selector of codeSelectors) {
        const element = document.querySelector(selector) as HTMLTextAreaElement
        if (element?.value && element.value.trim().length > 0) {
          codeContent = element.value
          break
        }
      }
    }

    // Strategy 4: Try to get from CodeMirror if present
    if (!codeContent) {
      try {
        // @ts-ignore - CodeMirror global
        if (window.CodeMirror) {
          const cmElements = document.querySelectorAll('.CodeMirror')
          for (const cmEl of cmElements) {
            // @ts-ignore
            if (cmEl.CodeMirror) {
              // @ts-ignore
              codeContent = cmEl.CodeMirror.getValue()
              if (codeContent) break
            }
          }
        }
      } catch (e) {
        console.log('CodeMirror not accessible')
      }
    }

    // Strategy 5: Look for code in pre/code blocks as fallback
    if (!codeContent) {
      const codeBlocks = document.querySelectorAll('pre code, .highlight code, [class*="code-block"]')
      for (const block of codeBlocks) {
        const text = block.textContent?.trim()
        if (text && text.includes('class Solution') && text.length > 50) {
          codeContent = text
          break
        }
      }
    }

    if (codeContent && codeContent.trim().length > 0) {
      content.codeSection = cleanHtmlEntities(codeContent.trim())
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

    // Hints (if available) - be very specific to avoid discussion content
    let allHints: string[] = []

    // Strategy 1: Look for actual hint sections in the problem area
    // Avoid discussion and community content areas
    const problemArea = document.querySelector('[data-track-load="description_content"]') ||
      document.querySelector('.question-content') ||
      document.querySelector('[class*="description"]') ||
      document.body

    if (problemArea) {
      // Look for hint-specific elements within the problem area only
      const hintElements = problemArea.querySelectorAll([
        '[data-cy="hint"]',
        '.hint:not([class*="discussion"]):not([class*="comment"])',
        '[class*="hint"]:not([class*="discussion"]):not([class*="comment"])',
        '[data-track-load="hint"]'
      ].join(', '))

      hintElements.forEach(el => {
        const text = el.textContent?.trim()
        // Only include if it's actually a hint (starts with "Hint" or contains hint-like content)
        if (text && text.length > 20 && (
          text.toLowerCase().startsWith('hint') ||
          (text.toLowerCase().includes('brute force') && text.length < 500) ||
          (text.toLowerCase().includes('approach') && text.length < 500)
        )) {
          // Exclude discussion rules and community guidelines
          if (!text.toLowerCase().includes('discussion rules') &&
            !text.toLowerCase().includes('community') &&
            !text.toLowerCase().includes('guidelines') &&
            !text.toLowerCase().includes('be respectful') &&
            !text.toLowerCase().includes('no spam')) {
            allHints.push(text)
          }
        }
      })
    }

    // Strategy 2: Look for numbered hints specifically
    const numberedHints = document.querySelectorAll('div, p, span')
    numberedHints.forEach(el => {
      const text = el.textContent?.trim()
      if (text &&
        (text.match(/^Hint\s*\d+/i) || text.match(/^Hint:/i)) &&
        text.length > 20 && text.length < 1000) {
        // Make sure it's not in a discussion area
        const isInDiscussion = el.closest('[class*="discussion"]') ||
          el.closest('[class*="comment"]') ||
          el.closest('[class*="community"]')
        if (!isInDiscussion) {
          allHints.push(text)
        }
      }
    })

    // Clean up and deduplicate hints
    const uniqueHints = [...new Set(allHints)]
      .map(hint => cleanHtmlEntities(hint))
      .filter(hint => {
        // Additional filtering to ensure quality
        const lower = hint.toLowerCase()
        return hint.length > 20 &&
          hint.length < 1000 && // Not too long
          !lower.includes('discussion rules') &&
          !lower.includes('community guidelines') &&
          !lower.includes('be respectful') &&
          (lower.includes('hint') || lower.includes('brute force') || lower.includes('approach'))
      })
      .slice(0, 3) // Limit to 3 hints

    if (uniqueHints.length > 0) {
      content.hints = uniqueHints.join('\n\n')
    }

    // Last executed input (from test case execution)
    const inputSelectors = [
      '[data-track-load="testcase_input"]',
      '.testcase-input',
      '[class*="input"]',
      '.console-input',
      '[class*="console"] [class*="input"]',
      '.execution-input'
    ]

    for (const selector of inputSelectors) {
      const element = document.querySelector(selector)
      if (element?.textContent?.trim()) {
        content.lastExecutedInput = cleanHtmlEntities(element.textContent.trim())
        break
      }
    }

    // Also try to find input in execution results area
    const executionResults = document.querySelectorAll([
      '[class*="execution"] [class*="input"]',
      '[class*="result"] [class*="input"]',
      '.testcase [class*="input"]'
    ].join(', '))

    if (!content.lastExecutedInput && executionResults.length > 0) {
      for (const result of executionResults) {
        const text = result.textContent?.trim()
        if (text && text.length > 0) {
          content.lastExecutedInput = cleanHtmlEntities(text)
          break
        }
      }
    }

    // Runtime errors and exceptions - comprehensive scraping
    let allErrors: string[] = []
    let allExceptions: string[] = []

    // Strategy 1: Look for "Runtime Error" headers and content
    const runtimeErrorElements = document.querySelectorAll('*')
    runtimeErrorElements.forEach(el => {
      const text = el.textContent?.trim()
      if (text === 'Runtime Error' || text === 'runtime error') {
        // Found runtime error header, get the error content from siblings or parent
        const parent = el.parentElement
        if (parent) {
          const errorContent = parent.textContent?.trim()
          if (errorContent && errorContent.length > text.length) {
            allErrors.push(errorContent)
          }
        }

        // Also check next siblings for error details
        let nextSibling = el.nextElementSibling
        while (nextSibling && allErrors.length < 3) {
          const siblingText = nextSibling.textContent?.trim()
          if (siblingText && siblingText.length > 10) {
            allErrors.push(siblingText)
          }
          nextSibling = nextSibling.nextElementSibling
        }
      }
    })

    // Strategy 2: Look for error patterns in test result areas
    const testResultAreas = document.querySelectorAll([
      '[class*="test-result"]',
      '[class*="testcase"]',
      '[class*="execution"]',
      '[class*="result"]',
      '[class*="console"]',
      '[class*="output"]',
      '.error',
      '[class*="error"]'
    ].join(', '))

    testResultAreas.forEach(area => {
      const text = area.textContent?.trim()
      if (text && text.length > 10) {
        // Check for runtime errors
        if (text.toLowerCase().includes('runtime error') ||
          text.toLowerCase().includes('time limit exceeded') ||
          text.toLowerCase().includes('memory limit exceeded')) {
          allErrors.push(text)
        }

        // Check for exceptions
        if (text.toLowerCase().includes('exception') ||
          text.includes('Error:') ||
          text.includes('at ') || // Stack trace indicator
          text.includes('line ')) { // Line number indicator
          allExceptions.push(text)
        }
      }
    })

    // Strategy 3: Look for specific error message patterns
    const allTextElements = document.querySelectorAll('div, span, p, pre')
    allTextElements.forEach(el => {
      const text = el.textContent?.trim()
      if (text && text.length > 5 && text.length < 2000) {
        // Runtime error patterns
        if (text.match(/runtime error/i) ||
          text.match(/time limit exceeded/i) ||
          text.match(/memory limit exceeded/i) ||
          text.match(/wrong answer/i)) {
          allErrors.push(text)
        }

        // Exception patterns
        if (text.match(/exception/i) ||
          text.match(/error:/i) ||
          text.match(/at line \d+/i) ||
          text.match(/\w+Exception/) ||
          text.match(/\w+Error/)) {
          allExceptions.push(text)
        }
      }
    })

    // Clean up and deduplicate
    const uniqueErrors = [...new Set(allErrors)]
      .map(error => cleanHtmlEntities(error))
      .filter(error => error.length > 10)
      .slice(0, 3) // Limit to avoid overwhelming

    const uniqueExceptions = [...new Set(allExceptions)]
      .map(exception => cleanHtmlEntities(exception))
      .filter(exception => exception.length > 10)
      .slice(0, 3)

    content.runtimeError = uniqueErrors.join('\n---\n')
    content.runtimeException = uniqueExceptions.join('\n---\n')

    return content
  }

  // Initialize AI service
  const initializeRealtimeAPI = async () => {
    try {
      setConnectionStatus('connecting')

      // Get API key from storage
      const result = await chrome.storage.sync.get(['openaiApiKey'])
      const apiKey = result.openaiApiKey

      if (!apiKey) {
        setTranscript('Please configure your OpenAI API key in Settings.')
        setConnectionStatus('disconnected')
        return
      }

      // Scrape current LeetCode content and set up AI service
      const content = scrapeLeetCodeContent()
      setLeetcodeContent(content)

      // Initialize AI service with static context
      const service = new AIInterviewService(apiKey)
      service.setStaticContext(content)
      setAiService(service)

      setConnectionStatus('connected')
      setIsConnected(true)

      setTranscript(`Ready for interview! 

Problem Context Loaded:
- Problem: ${content.problemTitle}
- Description: ${content.problemDescription || 'None'}
- Topics: ${content.topics || 'None'}
- Hints: ${content.hints || 'None'}

Hold the Record button or press and hold ${recordingShortcut.toUpperCase()} to start speaking about your approach!`)

    } catch (error) {
      console.error('Failed to initialize:', error)
      setConnectionStatus('disconnected')
      setTranscript('Failed to initialize. Please check your API key and try again.')
    }
  }

  // Process audio using the AI service
  const processAudioWithOpenAI = async (audioBlob: Blob) => {
    if (!aiService) {
      setTranscript(prev => prev + '\n\nAI service not initialized.')
      return
    }

    try {
      // Set processing state
      setConnectionStatus('connecting')

      // Capture current execution context
      const currentContent = scrapeLeetCodeContent()
      const context: InterviewContext = {
        currentCode: currentContent.codeSection || 'No code written yet',
        lastExecutedInput: currentContent.lastExecutedInput || '',
        runtimeError: currentContent.runtimeError || '',
        runtimeException: currentContent.runtimeException || ''
      }

      // Transcribe audio
      const userText = await aiService.transcribeAudio(audioBlob)
      setTranscript(prev => prev + `\n\nYou: ${userText}`)

      // Get AI response with conversation history
      console.log('Processing user input:', userText)
      console.log('Current context:', context)

      const result = await aiService.getInterviewResponse(userText, context)

      console.log('Received AI result:', result)

      // Log system prompt in bold and user message
      setTranscript(prev => prev + `\n\n**SYSTEM PROMPT:**\n${result.systemPrompt}`)
      setTranscript(prev => prev + `\n\n**USER MESSAGE:**\n${result.userMessage}`)
      setTranscript(prev => prev + `\n\nInterviewer: ${result.response}`)

      // Reset to connected before starting speech
      setConnectionStatus('connected')

      // Convert to speech
      const audioBlob2 = await aiService.synthesizeSpeech(result.response)
      const audioUrl = URL.createObjectURL(audioBlob2)
      const audio = new Audio(audioUrl)

      setIsSpeaking(true)
      audio.onended = () => setIsSpeaking(false)
      audio.onerror = () => setIsSpeaking(false)
      audio.play()

    } catch (error) {
      console.error('Error processing audio:', error)
      setTranscript(prev => prev + `\n\nError: ${error.message}`)
      setConnectionStatus('connected') // Reset on error
    }
  }



  // Start recording user audio
  const startRecording = async () => {
    if (isRecording) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      setIsRecording(true)

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setIsRecording(false)

        // Process the audio with OpenAI
        await processAudioWithOpenAI(audioBlob)
      }

      mediaRecorder.start()
      setTranscript(prev => prev + '\n\nRecording... Speak now!')
    } catch (error) {
      console.error('Error starting recording:', error)
      setIsRecording(false)
      setTranscript(prev => prev + '\n\nMicrophone access denied. Please allow microphone access.')
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      setTranscript(prev => prev + '\n\nRecording stopped. Processing...')
    }
    setIsRecording(false)
  }

  // Parse shortcut string into key components
  const parseShortcut = (shortcut: string) => {
    const keys = shortcut.toLowerCase().split('+')
    return {
      ctrl: keys.includes('ctrl'),
      shift: keys.includes('shift'),
      alt: keys.includes('alt'),
      meta: keys.includes('cmd') || keys.includes('meta'),
      key: keys.find(k => !['ctrl', 'shift', 'alt', 'cmd', 'meta'].includes(k)) || ''
    }
  }

  // Check if current pressed keys match the shortcut
  const isShortcutPressed = (pressedKeys: Set<string>) => {
    const shortcut = parseShortcut(recordingShortcut)
    const expectedKeys = new Set<string>()

    if (shortcut.ctrl) expectedKeys.add('control')
    if (shortcut.shift) expectedKeys.add('shift')
    if (shortcut.alt) expectedKeys.add('alt')
    if (shortcut.meta) expectedKeys.add('meta')
    if (shortcut.key) expectedKeys.add(shortcut.key)

    // Check if all expected keys are pressed and no extra keys
    if (expectedKeys.size !== pressedKeys.size) return false

    for (const key of expectedKeys) {
      if (!pressedKeys.has(key)) return false
    }

    return true
  }

  // Global keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      const newKeysPressed = new Set(keysPressed)

      // Add modifier keys
      if (e.ctrlKey) newKeysPressed.add('control')
      if (e.shiftKey) newKeysPressed.add('shift')
      if (e.altKey) newKeysPressed.add('alt')
      if (e.metaKey) newKeysPressed.add('meta')

      // Add the main key
      if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        newKeysPressed.add(key)
      }

      setKeysPressed(newKeysPressed)

      // Check if shortcut is pressed
      if (isShortcutPressed(newKeysPressed)) {
        e.preventDefault()
        e.stopPropagation()

        // Open modal if not visible
        if (!isVisible) {
          setIsVisible(true)
          setIsMinimized(false)
        }

        // Start recording if not already recording
        if (!isRecording && isConnected) {
          startRecording()
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const newKeysPressed = new Set(keysPressed)

      // Remove modifier keys
      if (!e.ctrlKey) newKeysPressed.delete('control')
      if (!e.shiftKey) newKeysPressed.delete('shift')
      if (!e.altKey) newKeysPressed.delete('alt')
      if (!e.metaKey) newKeysPressed.delete('meta')

      // Remove the main key
      const key = e.key.toLowerCase()
      if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        newKeysPressed.delete(key)
      }

      setKeysPressed(newKeysPressed)

      // Stop recording if shortcut is released and we were recording
      if (isRecording && !isShortcutPressed(newKeysPressed)) {
        stopRecording()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [keysPressed, isRecording, isVisible, isConnected, recordingShortcut])

  // Listen for shortcut changes from settings
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.recordingShortcut) {
        setRecordingShortcut(changes.recordingShortcut.newValue || 'ctrl+shift+r')
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  }, [])

  // Mouse event handlers for hold-to-record button
  const handleRecordMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isConnected || isRecording) return
    startRecording()
  }

  const handleRecordMouseUp = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isRecording) {
      stopRecording()
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

  // Duck drag handlers
  const handleDuckMouseDown = (e: React.MouseEvent) => {
    console.log('Duck mouse down triggered')
    e.preventDefault()
    e.stopPropagation()

    const duckElement = e.currentTarget as HTMLElement
    const rect = duckElement.getBoundingClientRect()

    setDragStartPosition({ x: e.clientX, y: e.clientY })
    setIsDuckDragging(true)
    setDuckDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
    console.log('Duck dragging started')
  }

  const handleDuckMouseMove = (e: MouseEvent) => {
    if (!isDuckDragging) return

    const newX = e.clientX - duckDragOffset.x
    const newY = e.clientY - duckDragOffset.y

    // Keep within viewport bounds
    const maxX = window.innerWidth - 60
    const maxY = window.innerHeight - 60

    const finalPosition = {
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    }

    console.log('Duck moving to:', finalPosition)
    setDuckPosition(finalPosition)
  }

  const handleDuckMouseUp = () => {
    if (!isDuckDragging) return

    setIsDuckDragging(false)

    // Always snap to the nearest edge
    const duckCenterX = duckPosition.x + 30 // Duck width/2
    const duckCenterY = duckPosition.y + 30 // Duck height/2

    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    // Calculate distances to each edge
    const distanceToLeft = duckCenterX
    const distanceToRight = windowWidth - duckCenterX
    const distanceToTop = duckCenterY
    const distanceToBottom = windowHeight - duckCenterY

    // Find the minimum distance
    const minDistance = Math.min(distanceToLeft, distanceToRight, distanceToTop, distanceToBottom)

    let newX = duckPosition.x
    let newY = duckPosition.y

    // Snap to the nearest edge
    if (minDistance === distanceToLeft) {
      // Snap to left edge
      newX = 20
    } else if (minDistance === distanceToRight) {
      // Snap to right edge
      newX = windowWidth - 80
    } else if (minDistance === distanceToTop) {
      // Snap to top edge
      newY = 20
    } else if (minDistance === distanceToBottom) {
      // Snap to bottom edge
      newY = windowHeight - 80
    }

    // Always animate the snap
    setIsSnapping(true)
    setTimeout(() => setIsSnapping(false), 300)

    console.log('Snapping duck from', duckPosition, 'to', { x: newX, y: newY })
    setDuckPosition({ x: newX, y: newY })
  }

  // Calculate transform origin based on duck position relative to modal
  const getTransformOrigin = (duckX: number, duckY: number, modalX: number, modalY: number) => {
    // Calculate where the duck center is relative to the modal
    const duckCenterX = duckX + 30 // Duck width/2
    const duckCenterY = duckY + 30 // Duck height/2

    // Calculate relative position within the modal (0-100%)
    const relativeX = ((duckCenterX - modalX) / 350) * 100 // 350 is modal width
    const relativeY = ((duckCenterY - modalY) / 400) * 100 // 400 is approximate modal height

    // Clamp values to ensure they're within reasonable bounds
    const clampedX = Math.max(0, Math.min(100, relativeX))
    const clampedY = Math.max(0, Math.min(100, relativeY))

    return `${clampedX}% ${clampedY}%`
  }

  const handleDuckClick = (e: React.MouseEvent) => {
    // Only open if it wasn't a drag (check if mouse moved less than 5px)
    const dragDistance = Math.sqrt(
      Math.pow(e.clientX - dragStartPosition.x, 2) +
      Math.pow(e.clientY - dragStartPosition.y, 2)
    )

    if (dragDistance < 5) {
      // Calculate optimal modal position to ensure it's fully on screen
      const modalWidth = 350
      const modalHeight = 400 // Approximate modal height
      const padding = 20 // Minimum distance from screen edges

      let modalX = duckPosition.x
      let modalY = duckPosition.y

      // Adjust X position if modal would go off right edge
      if (modalX + modalWidth > window.innerWidth - padding) {
        modalX = window.innerWidth - modalWidth - padding
      }

      // Adjust X position if modal would go off left edge
      if (modalX < padding) {
        modalX = padding
      }

      // Adjust Y position if modal would go off bottom edge
      if (modalY + modalHeight > window.innerHeight - padding) {
        modalY = window.innerHeight - modalHeight - padding
      }

      // Adjust Y position if modal would go off top edge
      if (modalY < padding) {
        modalY = padding
      }

      // Set modal position with adjustments
      setPosition({
        x: modalX,
        y: modalY
      })
      setIsOpening(true)
      setIsMinimized(false)

      // Remove opening animation after it completes
      setTimeout(() => setIsOpening(false), 300)
    }
  }

  useEffect(() => {
    if (isDuckDragging) {
      document.addEventListener('mousemove', handleDuckMouseMove)
      document.addEventListener('mouseup', handleDuckMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleDuckMouseMove)
        document.removeEventListener('mouseup', handleDuckMouseUp)
      }
    }
  }, [isDuckDragging, duckDragOffset, duckPosition])

  const startInterview = async () => {
    setInterviewMode(true)
    await initializeRealtimeAPI()
  }

  const stopInterview = () => {
    setInterviewMode(false)
    setIsConnected(false)
    setConnectionStatus('disconnected')
    setAiService(null)
    setIsSpeaking(false)

    stopRecording()
    setTranscript('Interview ended. Great job practicing!')
  }

  const toggleRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      stopRecording()
    } else {
      startRecording()
    }
  }

  // Get duck color based on current state
  const getDuckColor = () => {
    if (isRecording) {
      return 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' // Red when recording
    }
    if (connectionStatus === 'connecting') {
      return 'linear-gradient(135deg, #fd7e14 0%, #e55a00 100%)' // Orange when processing/thinking
    }
    if (isSpeaking) {
      return 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' // Green when talking/outputting TTS
    }
    return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' // Default purple
  }

  if (!isVisible) return null

  // Show minimized duck emoji
  if (isMinimized) {
    console.log('Duck position:', duckPosition, 'Window size:', window.innerWidth, window.innerHeight)
    return (
      <div
        className="duck-minimized"
        style={{
          position: 'fixed',
          left: `${duckPosition.x}px`,
          top: `${duckPosition.y}px`,
          width: '60px',
          height: '60px',
          background: getDuckColor(),
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          cursor: isDuckDragging ? 'grabbing' : 'grab',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15), 0 0 0 3px rgba(255, 255, 255, 0.9), 0 0 0 4px rgba(102, 126, 234, 0.3)',
          zIndex: 9999,
          transition: isDuckDragging ? 'none' : 'all 0.3s ease',
          userSelect: 'none',
          transform: isDuckDragging ? 'scale(1.1)' : 'scale(1)'
        }}
        onMouseDown={handleDuckMouseDown}
        onClick={handleDuckClick}
        title="Open DuckCode"
      >
        🦆
      </div>
    )
  }

  return (
    <div
      ref={modalRef}
      className={`duckcode-modal ${isOpening ? 'opening' : ''}`}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 10000,
        cursor: isDragging ? 'grabbing' : 'grab',
        transformOrigin: isOpening ? getTransformOrigin(duckPosition.x, duckPosition.y, position.x, position.y) : 'center'
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
        <div className="header-actions">
          <button
            className="settings-btn"
            onClick={openSidepanelSettings}
            title="Settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <button
            className="close-btn"
            onClick={() => {
              // Update duck position to current modal position
              const modalCenterX = position.x + 175 // Modal width/2 (350/2)
              const modalCenterY = position.y + 200 // Approximate modal height/2

              const windowWidth = window.innerWidth
              const windowHeight = window.innerHeight

              // Calculate distances to each edge from modal center
              const distanceToLeft = modalCenterX
              const distanceToRight = windowWidth - modalCenterX
              const distanceToTop = modalCenterY
              const distanceToBottom = windowHeight - modalCenterY

              // Find the minimum distance
              const minDistance = Math.min(distanceToLeft, distanceToRight, distanceToTop, distanceToBottom)

              let snapX = position.x
              let snapY = position.y

              // Snap to the nearest edge
              if (minDistance === distanceToLeft) {
                // Snap to left edge
                snapX = 20
              } else if (minDistance === distanceToRight) {
                // Snap to right edge
                snapX = windowWidth - 80
              } else if (minDistance === distanceToTop) {
                // Snap to top edge
                snapY = 20
              } else if (minDistance === distanceToBottom) {
                // Snap to bottom edge
                snapY = windowHeight - 80
              }

              setDuckPosition({
                x: snapX,
                y: snapY
              })
              setIsMinimized(true)

              // Trigger snap animation after duck appears
              setTimeout(() => {
                setIsSnapping(true)
                setTimeout(() => setIsSnapping(false), 300)
              }, 50)
            }}
          >
            ×
          </button>
        </div>
      </div>

      <div className="modal-body">
        {/* Authentication Section */}
        <div className="auth-section">
          <SignedOut>
            <div className="auth-prompt">
              <p>Sign in to start your mock interview</p>
              <SignInButton mode="modal">
                <button className="sign-in-btn">
                  <span className="btn-icon">🔐</span>
                  Sign In
                </button>
              </SignInButton>
            </div>
          </SignedOut>

          <SignedIn>
            <div className="user-info">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8"
                  }
                }}
              />
              <span className="welcome-text">Welcome, {user?.firstName || 'User'}!</span>
            </div>
          </SignedIn>
        </div>

        <SignedIn>
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
                className={`record-btn ${isRecording ? 'recording' : ''}`}
                onMouseDown={handleRecordMouseDown}
                onMouseUp={handleRecordMouseUp}
                onMouseLeave={handleRecordMouseUp}
                disabled={!isConnected}
              >
                <span className="btn-icon">
                  {isRecording ? '⏹️' : '🎤'}
                </span>
                {isRecording ? 'Recording...' : 'Hold to Record'}
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
        </SignedIn>
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

        .duckcode-modal.opening {
          animation: modalOpen 0.3s ease;
        }

        @keyframes modalOpen {
          0% {
            transform: scale(0.17); /* 60px / 350px ≈ 0.17 */
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            box-shadow: 
              0 8px 25px rgba(0, 0, 0, 0.15),
              0 0 0 3px rgba(255, 255, 255, 0.9),
              0 0 0 4px rgba(102, 126, 234, 0.3);
          }
          100% {
            transform: scale(1);
            border-radius: 16px;
            background: rgba(255, 255, 255, 0.95);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
          }
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

        .header-actions {
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

        .settings-btn, .close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 16px;
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

        .close-btn {
          font-size: 20px;
        }

        .settings-btn:hover, .close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .modal-body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .auth-section {
          text-align: center;
        }

        .auth-prompt p {
          margin: 0 0 12px 0;
          color: #666;
          font-size: 14px;
        }

        .sign-in-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 8px;
          color: white;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform 0.2s;
          margin: 0 auto;
        }

        .sign-in-btn:hover {
          transform: translateY(-1px);
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: center;
        }

        .welcome-text {
          font-size: 14px;
          color: #333;
          font-weight: 500;
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
          user-select: none;
        }

        .record-btn {
          flex: 2; /* Make record button wider */
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

        /* Minimized Duck Styles */
        .duck-minimized {
          position: fixed !important;
          width: 60px !important;
          height: 60px !important;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 28px !important;
          cursor: grab !important;
          box-shadow: 
            0 8px 25px rgba(0, 0, 0, 0.15),
            0 0 0 3px rgba(255, 255, 255, 0.9),
            0 0 0 4px rgba(102, 126, 234, 0.3) !important;
          z-index: 9999 !important;
          transition: all 0.3s ease !important;
          user-select: none !important;
          backdrop-filter: blur(10px);
          border: none !important;
          outline: none !important;
        }

        .duck-minimized:hover:not(.dragging) {
          transform: translateY(-3px) scale(1.05);
          box-shadow: 
            0 12px 35px rgba(0, 0, 0, 0.2),
            0 0 0 3px rgba(255, 255, 255, 1),
            0 0 0 5px rgba(102, 126, 234, 0.4);
        }

        .duck-minimized:active {
          transform: translateY(-1px) scale(1.02);
        }

        .duck-minimized.dragging {
          cursor: grabbing;
          transform: scale(1.1);
          box-shadow: 
            0 15px 40px rgba(0, 0, 0, 0.25),
            0 0 0 3px rgba(255, 255, 255, 1),
            0 0 0 6px rgba(102, 126, 234, 0.5);
          transition: none;
        }

        .duck-minimized.snapping {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

      `}</style>
    </div>
  )
}

// Main component with ClerkProvider wrapper
const DuckCodeModal = () => {
  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl={`${EXTENSION_URL}/popup.html`}
      signInFallbackRedirectUrl={`${EXTENSION_URL}/popup.html`}
      signUpFallbackRedirectUrl={`${EXTENSION_URL}/popup.html`}
    >
      <DuckCodeModalContent />
    </ClerkProvider>
  )
}

export default DuckCodeModal