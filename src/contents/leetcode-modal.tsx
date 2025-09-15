import cssText from "data-text:~style.css"
import prismCss from "data-text:~styles/prism-theme.css"
import type { PlasmoCSConfig } from "plasmo"
import React, { useState, useEffect, useRef } from "react"
// Removed Clerk authentication - now open source and auth-free
import { AIInterviewService, type InterviewContext } from '../services/aiInterviewService'
import duckIconUrl from "data-base64:~assets/duck_128.png"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism'

declare global {
  interface Window {
    monaco?: any
  }
}

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

  // Add Prism CSS for code syntax highlighting
  let updatedPrismCss = prismCss.replaceAll(":root", ":host(plasmo-csui)")
  updatedPrismCss = updatedPrismCss.replace(remRegex, (_, remValue) => {
    const pixelsValue = parseFloat(remValue) * baseFontSize
    return `${pixelsValue}px`
  })

  const styleElement = document.createElement("style")
  styleElement.textContent = updatedCssText + '\n' + updatedPrismCss
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
// Removed Clerk environment variables - no auth needed

// Function to open sidepanel settings
const openSidepanelSettings = (() => {
  let isOpening = false
  
  return () => {
    // Prevent multiple rapid clicks
    if (isOpening) {
      console.log('Sidepanel is already opening, ignoring click')
      return
    }
    
    isOpening = true
    
    // Send message to background script to open sidepanel and navigate to settings
    chrome.runtime.sendMessage({
      action: 'openSidepanel',
      route: '/settings'
    })
    .then((response) => {
      console.log('Sidepanel opened successfully:', response)
    })
    .catch((error) => {
      console.error('Failed to send message to open sidepanel:', error)
    })
    .finally(() => {
      // Reset the flag after a short delay to allow the action to complete
      setTimeout(() => {
        isOpening = false
      }, 1000)
    })
  }
})()

// Main modal content component - no authentication required
const DuckCodeModalContent = () => {
  // Removed auth - now open source and available to everyone
  const [isVisible, setIsVisible] = useState(true) // Always visible now - static widget
  const [position, setPosition] = useState<Position>({ x: 20, y: 20 })
  const [showPlanetModals, setShowPlanetModals] = useState(false)
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
  const [duckPosition, setDuckPosition] = useState<Position>({ x: 20, y: 20 })
  const [isDuckDragging, setIsDuckDragging] = useState(false)
  const [duckDragOffset, setDuckDragOffset] = useState<Position>({ x: 0, y: 0 })
  const [isSnapping, setIsSnapping] = useState(false)
  const [dragStartPosition, setDragStartPosition] = useState<Position>({ x: 0, y: 0 })
  const [aiService, setAiService] = useState<AIInterviewService | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingShortcut, setRecordingShortcut] = useState(
    navigator.platform.toLowerCase().includes('mac') ? 'cmd+y' : 'ctrl+shift+r'
  )
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set())
  const keysPressedRef = useRef<Set<string>>(new Set())
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [textMode, setTextMode] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [isTextInputVisible, setIsTextInputVisible] = useState(false)
  const [isProcessingText, setIsProcessingText] = useState(false)
  const [speechBubble, setSpeechBubble] = useState<string | null>(null)
  const [showCompactInput, setShowCompactInput] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [lastShortcutTime, setLastShortcutTime] = useState(0)
  const [pendingShortcutAction, setPendingShortcutAction] = useState(false)
  const [showDebugTab, setShowDebugTab] = useState(false)
  const [lastSystemPrompt, setLastSystemPrompt] = useState('')
  const [lastUserMessage, setLastUserMessage] = useState('')

  const modalRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Load recording shortcut and text mode from storage
  useEffect(() => {
    chrome.storage.sync.get(['recordingShortcut', 'textMode'], (result) => {
      // Use Command+Y as default on macOS, Ctrl+Shift+R on other platforms
      const defaultShortcut = navigator.platform.toLowerCase().includes('mac') ? 'cmd+y' : 'ctrl+shift+r'
      const shortcut = result.recordingShortcut || defaultShortcut
      
      setRecordingShortcut(shortcut)
      setTextMode(result.textMode || false)
      
      // If no shortcut was previously saved, save the default
      if (!result.recordingShortcut) {
        chrome.storage.sync.set({ recordingShortcut: shortcut })
      }
    })
  }, [])

  // Clear conversation history when text mode changes to ensure new formatting rules apply
  useEffect(() => {
    if (aiService) {
      console.log('Text mode changed, clearing conversation history to apply new formatting rules')
      aiService.clearConversationHistory()
    }
  }, [textMode, aiService])

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



  // Simple Markdown component using react-syntax-highlighter for code blocks
  const MarkdownContent = ({ content }: { content: string }) => {
    if (!content) return null

    const processMarkdown = (text: string) => {
      const parts: JSX.Element[] = []
      let key = 0

      // Split by code blocks first
      const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)\n```/g
      let lastIndex = 0
      let match

      while ((match = codeBlockRegex.exec(text)) !== null) {
        // Add text before code block
        if (match.index > lastIndex) {
          const beforeText = text.slice(lastIndex, match.index)
          parts.push(...processTextContent(beforeText, key))
          key += 100
        }

        // Add code block
        const language = match[1] || 'text'
        const code = match[2].trim()
        parts.push(
          <SyntaxHighlighter
            key={key++}
            language={language}
            style={vscDarkPlus}
            customStyle={{
              margin: '12px 0',
              borderRadius: '6px',
              fontSize: '13px'
            }}
          >
            {code}
          </SyntaxHighlighter>
        )

        lastIndex = match.index + match[0].length
      }

      // Add remaining text
      if (lastIndex < text.length) {
        const remainingText = text.slice(lastIndex)
        parts.push(...processTextContent(remainingText, key))
      }

      return parts
    }

    const processTextContent = (text: string, startKey: number) => {
      const elements: JSX.Element[] = []
      let key = startKey

      // Split by lines and process each
      const lines = text.split('\n')
      lines.forEach((line, index) => {
        // Handle headers
        if (line.startsWith('### ')) {
          elements.push(
            <h3 key={key++} style={{ color: '#333333', fontSize: '1.2em', fontWeight: 'bold', margin: '12px 0 8px 0' }}>
              {processInlineFormatting(line.slice(4))}
            </h3>
          )
        } else if (line.startsWith('## ')) {
          elements.push(
            <h2 key={key++} style={{ color: '#333333', fontSize: '1.3em', fontWeight: 'bold', margin: '14px 0 10px 0', borderBottom: '1px solid #cccccc', paddingBottom: '2px' }}>
              {processInlineFormatting(line.slice(3))}
            </h2>
          )
        } else if (line.startsWith('# ')) {
          elements.push(
            <h1 key={key++} style={{ color: '#333333', fontSize: '1.4em', fontWeight: 'bold', margin: '16px 0 12px 0', borderBottom: '2px solid #333333', paddingBottom: '4px' }}>
              {processInlineFormatting(line.slice(2))}
            </h1>
          )
        } else if (line.trim()) {
          elements.push(
            <p key={key++} style={{ margin: '8px 0', lineHeight: '1.5', color: '#333333' }}>
              {processInlineFormatting(line)}
            </p>
          )
        } else if (index < lines.length - 1) {
          elements.push(<br key={key++} />)
        }
      })

      return elements
    }

    const processInlineFormatting = (text: string) => {
      const parts: (string | JSX.Element)[] = []
      let key = 0

      // Process bold, italic, and inline code
      let remaining = text
      
      // Replace **bold**
      remaining = remaining.replace(/\*\*(.+?)\*\*/g, (match, content) => {
        const placeholder = `__BOLD_${key}__`
        parts.push(<strong key={`bold-${key++}`} style={{ color: '#333333', fontWeight: 'bold' }}>{content}</strong>)
        return placeholder
      })

      // Replace *italic*
      remaining = remaining.replace(/\*(.+?)\*/g, (match, content) => {
        const placeholder = `__ITALIC_${key}__`
        parts.push(<em key={`italic-${key++}`} style={{ color: '#666666', fontStyle: 'italic', fontWeight: 500 }}>{content}</em>)
        return placeholder
      })

      // Replace `inline code`
      remaining = remaining.replace(/`([^`]+)`/g, (match, content) => {
        const placeholder = `__CODE_${key}__`
        parts.push(<code key={`code-${key++}`} className="inline-code">{content}</code>)
        return placeholder
      })

      // Split by placeholders and reconstruct
      const finalParts: (string | JSX.Element)[] = []
      const placeholderRegex = /__(?:BOLD|ITALIC|CODE)_(\d+)__/g
      let lastIndex = 0
      let match

      while ((match = placeholderRegex.exec(remaining)) !== null) {
        if (match.index > lastIndex) {
          finalParts.push(remaining.slice(lastIndex, match.index))
        }
        const partIndex = parseInt(match[1])
        if (parts[partIndex]) {
          finalParts.push(parts[partIndex])
        }
        lastIndex = match.index + match[0].length
      }

      if (lastIndex < remaining.length) {
        finalParts.push(remaining.slice(lastIndex))
      }

      return finalParts.length > 0 ? finalParts : text
    }

    return <div>{processMarkdown(content)}</div>
  }


  // Helper function to escape HTML
  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
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

    // Strategy 1: Try Monaco editor model content - multiple approaches
    try {
      // @ts-ignore - Monaco editor global
      if (window.monaco && window.monaco.editor) {
        const editors = window.monaco.editor.getEditors()
        if (editors && editors.length > 0) {
          const editor = editors[0]
          codeContent = editor.getValue()
        }
      }

      // Alternative: Try to find Monaco editor instance on DOM elements
      if (!codeContent) {
        const monacoContainers = document.querySelectorAll('.monaco-editor')
        for (const container of monacoContainers) {
          // @ts-ignore - Check if container has editor instance
          if (container._editor) {
            // @ts-ignore
            codeContent = container._editor.getValue()
            break
          }
        }
      }
    } catch (e) {
      console.log('Monaco editor not accessible via global')
    }

    // Strategy 2: Try to get code from Monaco editor DOM - improved line detection
    if (!codeContent) {
      // Try different Monaco editor line selectors
      const lineSelectors = [
        '.monaco-editor .view-lines .view-line',
        '.monaco-editor .view-line',
        '.view-lines .view-line',
        '.monaco-editor .lines-content .view-line'
      ]

      for (const selector of lineSelectors) {
        const monacoLines = document.querySelectorAll(selector)
        if (monacoLines.length > 0) {
          const lines = Array.from(monacoLines).map(line => {
            // Get text content, preserving spaces and handling empty lines
            const text = line.textContent || ''
            return text === '\u00a0' ? '' : text // Replace non-breaking space with empty string
          })
          codeContent = lines.join('\n')
          break
        }
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
      // Clean and format the code content
      let cleanedCode = cleanHtmlEntities(codeContent.trim())

      // Fix common formatting issues
      cleanedCode = cleanedCode
        .replace(/\s*{\s*/g, ' {\n    ') // Add newlines after opening braces
        .replace(/;\s*(?=[a-zA-Z])/g, ';\n    ') // Add newlines after semicolons before code
        .replace(/}\s*(?=[a-zA-Z])/g, '}\n') // Add newlines after closing braces
        .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive blank lines
        .replace(/^\s+/gm, (match) => {
          // Preserve indentation but normalize it
          const spaces = match.length
          return '    '.repeat(Math.floor(spaces / 4)) + ' '.repeat(spaces % 4)
        })

      content.codeSection = cleanedCode
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

      const modeInstructions = textMode
        ? `Click the "Type Message" button or press and hold ${recordingShortcut.toUpperCase()} to open text input and type your response!`
        : `Hold the Record button or press and hold ${recordingShortcut.toUpperCase()} to start speaking about your approach!`

      setTranscript(`Ready for interview! 

Problem Context Loaded:
- Problem: ${content.problemTitle}
- Description: ${content.problemDescription || 'None'}
- Topics: ${content.topics || 'None'}
- Hints: ${content.hints || 'None'}

${modeInstructions}`)

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
      // Capture current execution context
      const currentContent = scrapeLeetCodeContent()
      const context: InterviewContext = {
        currentCode: addLineNumbers(currentContent.codeSection || 'No code written yet'),
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

      const result = await aiService.getInterviewResponse(userText, context, false) // Voice mode - no pretty code

      console.log('Received AI result:', result)

      // Store debug info
      setLastSystemPrompt(result.systemPrompt)
      setLastUserMessage(result.userMessage)

      // Log system prompt in bold and user message
      setTranscript(prev => prev + `\n\n**SYSTEM PROMPT:**\n${result.systemPrompt}`)
      setTranscript(prev => prev + `\n\n**USER MESSAGE:**\n${result.userMessage}`)
      setTranscript(prev => prev + `\n\nInterviewer: ${result.response}`)

      // Convert to speech (keep orange state during TTS generation)
      const audioBlob2 = await aiService.synthesizeSpeech(result.response)
      const audioUrl = URL.createObjectURL(audioBlob2)
      const audio = new Audio(audioUrl)

      // Only switch to green when audio actually starts playing
      setConnectionStatus('connected')
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

  // Process text input using the AI service
  const processTextWithOpenAI = async (userText: string) => {
    if (!aiService) {
      setTranscript(prev => prev + '\n\nAI service not initialized.')
      return
    }

    try {
      setIsProcessingText(true)
      setConnectionStatus('connecting')

      // Capture current execution context
      const currentContent = scrapeLeetCodeContent()
      const context: InterviewContext = {
        currentCode: addLineNumbers(currentContent.codeSection || 'No code written yet'),
        lastExecutedInput: currentContent.lastExecutedInput || '',
        runtimeError: currentContent.runtimeError || '',
        runtimeException: currentContent.runtimeException || ''
      }

      // Add user text to transcript
      setTranscript(prev => prev + `\n\nYou: ${userText}`)

      // Get AI response with conversation history
      console.log('Processing user input:', userText)
      console.log('Current context:', context)

      // In static widget mode, always stream to speech bubble for text mode
      if (textMode) {
        setIsStreaming(true)
        setStreamingText('')
        setSpeechBubble('')

        const result = await aiService.getStreamingInterviewResponse(userText, context, (chunk) => {
          setStreamingText(prev => prev + chunk)
          setSpeechBubble(prev => (prev || '') + chunk)
        }, true) // Text mode - enable pretty code formatting

        console.log('Received streaming AI result:', result)

        // Store debug info
        setLastSystemPrompt(result.systemPrompt)
        setLastUserMessage(result.userMessage)

        // Log system prompt and user message to transcript
        setTranscript(prev => prev + `\n\n**SYSTEM PROMPT:**\n${result.systemPrompt}`)
        setTranscript(prev => prev + `\n\n**USER MESSAGE:**\n${result.userMessage}`)
        setTranscript(prev => prev + `\n\nInterviewer: ${result.fullResponse}`)

        setIsStreaming(false)
        // Speech bubble stays up until manually dismissed
      } else {
        // Regular non-streaming response for modal mode
        const result = await aiService.getInterviewResponse(userText, context, textMode) // Pass textMode for pretty code formatting

        console.log('Received AI result:', result)

        // Store debug info
        setLastSystemPrompt(result.systemPrompt)
        setLastUserMessage(result.userMessage)

        // Log system prompt in bold and user message
        setTranscript(prev => prev + `\n\n**SYSTEM PROMPT:**\n${result.systemPrompt}`)
        setTranscript(prev => prev + `\n\n**USER MESSAGE:**\n${result.userMessage}`)
        setTranscript(prev => prev + `\n\nInterviewer: ${result.response}`)
      }

      setConnectionStatus('connected')

    } catch (error) {
      console.error('Error processing text:', error)
      setTranscript(prev => prev + `\n\nError: ${error.message}`)
      setConnectionStatus('connected') // Reset on error
      setIsStreaming(false)
    } finally {
      setIsProcessingText(false)
    }
  }



  // Start recording user audio
  const startRecording = async () => {
    if (isRecording) return

    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
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

        // Ensure tracks are fully stopped after stopping
        try {
          if (mediaRecorderRef.current?.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
          }
        } catch { }
        mediaRecorderRef.current = null

        // Set processing state immediately to avoid purple gap
        setConnectionStatus('connecting')
        setIsRecording(false)

        // Process the audio with OpenAI
        await processAudioWithOpenAI(audioBlob)
      }

      mediaRecorder.start()
      setTranscript(prev => prev + '\n\nRecording... Speak now!')
    } catch (error) {
      console.error('Error starting recording:', error)
      // Best-effort: stop any acquired tracks if we failed mid-way
      try {
        stream?.getTracks().forEach(track => track.stop())
      } catch { }
      mediaRecorderRef.current = null
      setIsRecording(false)
      setTranscript(prev => prev + '\n\nMicrophone access denied. Please allow microphone access.')
    }
  }

  // Stop recording
  const stopRecording = () => {
    const recorder = mediaRecorderRef.current
    if (recorder) {
      try {
        if (recorder.state !== 'inactive') {
          recorder.stop()
          setTranscript(prev => prev + '\n\nRecording stopped. Processing...')
        }
      } catch { }
      try {
        recorder.stream.getTracks().forEach(track => track.stop())
      } catch { }
    }
    mediaRecorderRef.current = null
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

  // Enhanced keyboard shortcut detection that handles Command+Y reliably
  const isShortcutMatch = (e: KeyboardEvent) => {
    const shortcut = parseShortcut(recordingShortcut)
    
    // Check each modifier and key match
    const modifiersMatch = 
      (shortcut.ctrl === e.ctrlKey) &&
      (shortcut.shift === e.shiftKey) &&
      (shortcut.alt === e.altKey) &&
      (shortcut.meta === e.metaKey)
    
    const keyMatch = shortcut.key === e.key.toLowerCase()
    
    // Add debugging
    if (modifiersMatch && keyMatch) {
      console.log('Shortcut match found:', {
        shortcut: recordingShortcut,
        key: e.key,
        ctrl: e.ctrlKey,
        meta: e.metaKey,
        alt: e.altKey,
        shift: e.shiftKey
      })
    }
    
    return modifiersMatch && keyMatch
  }

  // Global keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Direct shortcut matching for more reliability
      if (isShortcutMatch(e)) {
        // Prevent double triggering with throttling
        const now = Date.now()
        if (now - lastShortcutTime < 500) { // 500ms throttle
          console.log('Shortcut throttled, ignoring duplicate')
          return
        }
        setLastShortcutTime(now)
        
        e.preventDefault()
        e.stopPropagation()

        console.log('Shortcut detected:', recordingShortcut)

        // Auto-start interview if it hasn't started yet AND immediately show input
        if (!interviewMode) {
          // Initialize interview (async). Input will show once connected
          startInterview()

          // Set flag to show input when connection is ready
          setPendingShortcutAction(true)
        } else {
          // If interview is already running, handle immediately
        if (isConnected) {
          if (textMode) {
            if (isMinimized) {
              // Show compact input when minimized
              setShowCompactInput(true)
            } else {
              // Show text input in modal
              setIsTextInputVisible(true)
            }
          } else {
            // Start recording for voice mode
            if (!isRecording) {
              startRecording()
            }
          }
        }
      }
        return
      }

      // Keep the existing key tracking for display purposes
      const key = e.key.toLowerCase()
      const current = new Set(keysPressedRef.current)

      // Add modifier keys
      if (e.ctrlKey) current.add('control')
      if (e.shiftKey) current.add('shift')
      if (e.altKey) current.add('alt')
      if (e.metaKey) current.add('meta')

      // Add the main key
      if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        current.add(key)
      }

      keysPressedRef.current = current
      setKeysPressed(new Set(current))
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const current = new Set(keysPressedRef.current)

      // Remove modifier keys if no longer pressed
      if (!e.ctrlKey) current.delete('control')
      if (!e.shiftKey) current.delete('shift')
      if (!e.altKey) current.delete('alt')
      if (!e.metaKey) current.delete('meta')

      // Remove the main key
      const key = e.key.toLowerCase()
      if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        current.delete(key)
      }

      keysPressedRef.current = current
      setKeysPressed(new Set(current))

      // Handle shortcut release based on mode
      if (!isShortcutPressed(current)) {
        if (textMode) {
          if (isMinimized && showCompactInput) {
            // Hide compact input when shortcut is released
            setShowCompactInput(false)
            setTextInput('')
          } else if (isTextInputVisible) {
            // Hide text input when shortcut is released
            setIsTextInputVisible(false)
            setTextInput('')
          }
        } else if (isRecording) {
          // Stop recording if shortcut is released and we were recording
          stopRecording()
        }
      }
    }

    const handleBlurOrHide = () => {
      // On tab blur or visibility change, clear keys and stop recording/hide text input
      keysPressedRef.current = new Set()
      setKeysPressed(new Set())
      if (isRecording) {
        stopRecording()
      }
      if (isTextInputVisible) {
        setIsTextInputVisible(false)
        setTextInput('')
      }
      if (showCompactInput) {
        setShowCompactInput(false)
        setTextInput('')
      }
    }

    // Add event listeners to both document and window for better coverage
    // Use capture phase to catch events before they can be prevented
    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('keyup', handleKeyUp, true)
    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('keyup', handleKeyUp, true)
    window.addEventListener('blur', handleBlurOrHide)
    document.addEventListener('visibilitychange', handleBlurOrHide)

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('keyup', handleKeyUp, true)
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('keyup', handleKeyUp, true)
      window.removeEventListener('blur', handleBlurOrHide)
      document.removeEventListener('visibilitychange', handleBlurOrHide)
    }
  }, [isRecording, isConnected, interviewMode, recordingShortcut, lastShortcutTime])

  // If there's a pending shortcut action, execute it when connected
  useEffect(() => {
    if (isConnected && pendingShortcutAction) {
      console.log('Executing pending shortcut action')
      
      if (textMode) {
          setShowCompactInput(true)
        console.log('Pending action: showing compact text input')
      } else if (!isRecording) {
        startRecording()
      }
      
      // Clear the pending action
      setPendingShortcutAction(false)
    }
  }, [isConnected, pendingShortcutAction, textMode, isTextInputVisible, isMinimized, showCompactInput, isRecording])

  // Listen for shortcut and text mode changes from settings
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.recordingShortcut) {
        const defaultShortcut = navigator.platform.toLowerCase().includes('mac') ? 'cmd+y' : 'ctrl+shift+r'
        setRecordingShortcut(changes.recordingShortcut.newValue || defaultShortcut)
      }
      if (changes.textMode) {
        setTextMode(changes.textMode.newValue || false)
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
    const modalWidth = textMode && isTextInputVisible ? 450 : 350
    const relativeX = ((duckCenterX - modalX) / modalWidth) * 100
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
      const modalWidth = textMode && isTextInputVisible ? 450 : 350
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

      // Toggle planet modals instead of opening full modal
      setShowPlanetModals(!showPlanetModals)
      
      // Clear speech bubble and compact input when toggling
      setSpeechBubble(null)
      setShowCompactInput(false)
      setTextInput('')
      setIsStreaming(false)
      setStreamingText('')
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

  // No auto-dismissal - components only close when X button is pressed

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

  // Cleanup on unmount: ensure microphone is released
  useEffect(() => {
    return () => {
      try {
        if (mediaRecorderRef.current) {
          if (mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop()
          }
          try {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
          } catch { }
          mediaRecorderRef.current = null
        }
      } catch { }
    }
  }, [])

  const toggleRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      stopRecording()
    } else {
      startRecording()
    }
  }

  // Handle text input submission
  const handleTextSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }

    if (!textInput.trim() || isProcessingText) return

    const userText = textInput.trim()
    console.log('Text submitted:', userText)
    console.log('Current state:', { textMode, aiService: !!aiService, isConnected })
    
    setTextInput('')
    setIsTextInputVisible(false)
    setShowCompactInput(false)

    await processTextWithOpenAI(userText)
  }

  // Handle text input key press
  const handleTextKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleTextSubmit()
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

  // Add line numbers to code for better AI context
  const addLineNumbers = (code: string): string => {
    if (!code || code.trim() === 'No code written yet') {
      return code
    }

    const lines = code.split('\n')
    const paddedLines = lines.map((line, index) => {
      const lineNumber = (index + 1).toString().padStart(2, ' ')
      return `${lineNumber}: ${line}`
    })

    return paddedLines.join('\n')
  }

  if (!isVisible) return null

  // Helper function to calculate smart planet positions based on duck location
  const getPlanetPositions = () => {
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight
    const duckSize = 60
    const planetSpacing = 80 // Distance from duck center
    const padding = 10

    // Determine which corner/edge the duck is in
    const isLeft = duckPosition.x < screenWidth / 3
    const isRight = duckPosition.x > (screenWidth * 2) / 3
    const isTop = duckPosition.y < screenHeight / 3
    const isBottom = duckPosition.y > (screenHeight * 2) / 3
    
    const duckCenterX = duckPosition.x + duckSize / 2
    const duckCenterY = duckPosition.y + duckSize / 2

    let positions = []

    if (isLeft && isTop) {
      // Top-left corner: arrange planets to the right and below
      positions = [
        { x: duckCenterX + planetSpacing, y: duckCenterY - 20 }, // Settings (right)
        { x: duckCenterX + 20, y: duckCenterY + planetSpacing }, // Chat/Record (below)
        { x: duckCenterX + planetSpacing - 20, y: duckCenterY + 40 } // Close (bottom-right)
      ]
    } else if (isRight && isTop) {
      // Top-right corner: arrange planets to the left and below
      positions = [
        { x: duckCenterX - planetSpacing, y: duckCenterY - 20 }, // Settings (left)
        { x: duckCenterX - 20, y: duckCenterY + planetSpacing }, // Chat/Record (below)
        { x: duckCenterX - planetSpacing + 20, y: duckCenterY + 40 } // Close (bottom-left)
      ]
    } else if (isLeft && isBottom) {
      // Bottom-left corner: arrange planets to the right and above
      positions = [
        { x: duckCenterX + planetSpacing, y: duckCenterY + 20 }, // Settings (right)
        { x: duckCenterX + 20, y: duckCenterY - planetSpacing }, // Chat/Record (above)
        { x: duckCenterX + planetSpacing - 20, y: duckCenterY - 40 } // Close (top-right)
      ]
    } else if (isRight && isBottom) {
      // Bottom-right corner: arrange planets to the left and above
      positions = [
        { x: duckCenterX - planetSpacing, y: duckCenterY + 20 }, // Settings (left)
        { x: duckCenterX - 20, y: duckCenterY - planetSpacing }, // Chat/Record (above)
        { x: duckCenterX - planetSpacing + 20, y: duckCenterY - 40 } // Close (top-left)
      ]
    } else {
      // Default arrangement (center or edges): arrange in arc above duck
      positions = [
        { x: duckCenterX + planetSpacing, y: duckCenterY - 20 }, // Settings (right)
        { x: duckCenterX, y: duckCenterY - planetSpacing }, // Chat/Record (top)
        { x: duckCenterX - planetSpacing, y: duckCenterY - 20 } // Close (left)
      ]
    }

    // Ensure all positions stay within screen bounds
    return positions.map(pos => ({
      x: Math.max(padding, Math.min(pos.x - 25, screenWidth - 50 - padding)), // -25 to center 50px planet
      y: Math.max(padding, Math.min(pos.y - 25, screenHeight - 50 - padding))
    }))
  }

  // Always show static duck widget with optional planet modals
    return (
      <>
        {/* Speech Bubble */}
        {(speechBubble || isStreaming) && (
          <div
            className="speech-bubble"
            style={{
              position: 'fixed',
              left: (() => {
                const screenWidth = window.innerWidth;
                const bubbleWidth = Math.min(450, screenWidth * 0.4); // Updated to match CSS max-width
                
                const isLeft = duckPosition.x < screenWidth / 2;
                
                let leftPos;
                if (isLeft) {
                  // Duck on left side - bubble goes right, closer to duck
                  leftPos = duckPosition.x + 75;
                } else {
                  // Duck on right side - bubble goes left, closer to duck
                  leftPos = duckPosition.x - bubbleWidth - 15;
                }
                
                // Ensure bubble stays within screen bounds
                leftPos = Math.max(10, Math.min(leftPos, screenWidth - bubbleWidth - 10));
                
                return leftPos;
              })() + 'px',
              top: (() => {
                // Start at same Y level as duck (centered)
                const duckCenterY = duckPosition.y + 30; // Duck is 60px tall, so center is +30
                const estimatedBubbleHeight = Math.max(50, (speechBubble?.length || 50) / 40 * 20); // Rough height estimate
                
                // Try to center bubble with duck first
                let bubbleTop = duckCenterY - (estimatedBubbleHeight / 2);
                
                // Adjust if it would go off screen
                const screenHeight = window.innerHeight;
                if (bubbleTop < 10) {
                  bubbleTop = 10; // Too high, move down
                } else if (bubbleTop + estimatedBubbleHeight > screenHeight - 10) {
                  bubbleTop = screenHeight - estimatedBubbleHeight - 10; // Too low, move up
                }
                
                return bubbleTop;
              })() + 'px',
              zIndex: 10000,
              width: `${Math.min(450, window.innerWidth * 0.4)}px`,
              background: 'white',
              borderRadius: '18px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              border: '1px solid #e1e5e9',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              transform: 'translateZ(0)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {isStreaming && <div 
              className="typing-indicator"
              style={{
                position: 'absolute',
                top: '-8px',
                left: '16px',
                display: 'flex',
                gap: '2px',
                alignItems: 'center',
              }}
            >
              <span style={{
                width: '6px',
                height: '6px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '50%',
                animation: 'typingDot 1.4s infinite ease-in-out',
                animationDelay: '-0.32s',
              }}></span>
              <span style={{
                width: '6px',
                height: '6px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '50%',
                animation: 'typingDot 1.4s infinite ease-in-out',
                animationDelay: '-0.16s',
              }}></span>
              <span style={{
                width: '6px',
                height: '6px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '50%',
                animation: 'typingDot 1.4s infinite ease-in-out',
                animationDelay: '0s',
              }}></span>
            </div>}
            <div 
              className="speech-bubble-content"
              style={{
                padding: '12px 16px',
                fontSize: '14px',
                lineHeight: '1.4',
                color: '#333',
                minHeight: '20px',
                position: 'relative',
              }}
            >
              {speechBubble ? (
                <MarkdownContent content={speechBubble} />
              ) : (
                isStreaming ? <div>Thinking...</div> : null
              )}
              {isStreaming && speechBubble && <span 
                className="cursor"
                style={{
                  animation: 'blink 1s infinite',
                  color: 'rgba(0, 0, 0, 0.5)',
                  fontWeight: 'normal',
                }}
              >|</span>}
            </div>
            <button
              className="speech-bubble-close"
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                background: 'rgba(0, 0, 0, 0.1)',
                border: 'none',
                fontSize: '12px',
                cursor: 'pointer',
                color: '#666',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                opacity: '0.7',
              }}
              onClick={() => {
                setSpeechBubble(null)
                setIsStreaming(false)
                setStreamingText('')
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Compact Text Input */}
        {textMode && showCompactInput && (
          <div
            className="compact-text-input"
            style={{
              position: 'fixed',
              left: (() => {
                const screenWidth = window.innerWidth;
                const inputWidth = Math.min(320, screenWidth * 0.4);
                
                const isLeft = duckPosition.x < screenWidth / 2;
                
                if (isLeft) {
                  // Duck on left side - input goes right, closer to duck
                  return duckPosition.x + 75;
                } else {
                  // Duck on right side - input goes left, closer to duck
                  return duckPosition.x - inputWidth - 15;
                }
              })() + 'px',
              top: (() => {
                // Start at same Y level as duck (centered)
                const duckCenterY = duckPosition.y + 30; // Duck is 60px tall, so center is +30
                const inputHeight = 50; // Text input height
                
                // Center input with duck
                let inputTop = duckCenterY - (inputHeight / 2);
                
                // Adjust if it would go off screen
                const screenHeight = window.innerHeight;
                if (inputTop < 10) {
                  inputTop = 10; // Too high, move down
                } else if (inputTop + inputHeight > screenHeight - 10) {
                  inputTop = screenHeight - inputHeight - 10; // Too low, move up
                }
                
                return inputTop;
              })() + 'px',
              zIndex: 10000,
              width: `${Math.min(320, window.innerWidth * 0.4)}px`,
              background: 'white',
              borderRadius: '25px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              border: '1px solid #e1e5e9',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              minWidth: '280px',
              maxWidth: '320px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="compact-input-close"
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                background: 'rgba(0, 0, 0, 0.1)',
                border: 'none',
                fontSize: '12px',
                cursor: 'pointer',
                color: '#666',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                opacity: '0.7',
                zIndex: 1,
              }}
              onClick={() => {
                setShowCompactInput(false)
                setTextInput('')
              }}
            >
              ×
            </button>
            <form onSubmit={handleTextSubmit}>
              <div 
                className="compact-input-wrapper"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 8px 8px 16px',
                  gap: '8px',
                }}
              >
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyPress={handleTextKeyPress}
                  placeholder="Type your message..."
                  className="compact-input"
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    background: 'transparent',
                    padding: '8px 0',
                    color: '#333',
                  }}
                  autoFocus
                  disabled={isProcessingText}
                />
                <button
                  type="submit"
                  className="compact-send-btn"
                  style={{
                    background: isProcessingText ? '#ccc' : '#007AFF',
                    border: 'none',
                    cursor: isProcessingText ? 'not-allowed' : 'pointer',
                    padding: '8px',
                    borderRadius: '50%',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    transition: 'all 0.2s ease',
                  }}
                  disabled={!textInput.trim() || isProcessingText}
                >
                  {isProcessingText ? (
                    <div style={{ 
                      width: '12px', 
                      height: '12px', 
                      border: '2px solid white', 
                      borderTop: '2px solid transparent', 
                      borderRadius: '50%', 
                      animation: 'spin 1s linear infinite' 
                    }}></div>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22,2 15,22 11,13 2,9"></polygon>
                    </svg>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Duck */}
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
            transform: isDuckDragging ? 'scale(1.1)' : 'scale(1)',
            animation: 
              isRecording ? 'duckPulse 1.5s ease-in-out infinite' :
              connectionStatus === 'connecting' ? 'duckThinking 2s ease-in-out infinite' :
              isSpeaking ? 'duckTalking 0.8s ease-in-out infinite' : 'none'
          }}
          onMouseDown={handleDuckMouseDown}
          onClick={handleDuckClick}
          title="Open DuckCode"
        >
          <img src={duckIconUrl} alt="DuckCode" style={{ width: '36px', height: '36px', pointerEvents: 'none' }} />
        </div>

        {/* Planet Modals */}
      {showPlanetModals && !isDuckDragging && (() => {
        const positions = getPlanetPositions()
  return (
        <>
          {/* Settings Planet */}
    <div
            className="planet-modal"
      style={{
        position: 'fixed',
              left: `${positions[0].x}px`,
              top: `${positions[0].y}px`,
              width: '50px',
              height: '50px',
              background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
              zIndex: 9998,
              transition: 'all 0.3s ease',
              transform: 'scale(1)',
              opacity: 1
            }}
            onClick={openSidepanelSettings}
            title="Settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>

          {/* Speak/Chat Planet */}
          <div
            className="planet-modal"
            style={{
              position: 'fixed',
              left: `${positions[1].x}px`,
              top: `${positions[1].y}px`,
              width: '50px',
              height: '50px',
              background: textMode 
                ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' 
                : isRecording
                  ? 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' // Red when recording
                  : 'linear-gradient(135deg, #6c757d 0%, #495057 100%)', // Gray when not recording
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
              zIndex: 9998,
              transition: 'all 0.3s ease',
              transform: 'scale(1)',
              opacity: 1
            }}
            onClick={() => {
              console.log('Chat/Speak planet clicked', { textMode, interviewMode, isConnected, isRecording })
              
              // Auto-start interview if not started
              if (!interviewMode) {
                startInterview()
                // Set pending action to execute when connected
                setPendingShortcutAction(true)
              } else {
                // If interview is already running, handle immediately
                if (isConnected) {
                  if (textMode) {
                    setShowCompactInput(!showCompactInput)
                    setShowPlanetModals(false) // Close planet modals when chat opens
                    console.log('Toggling text input visibility')
                  } else {
                    setShowPlanetModals(false) // Close planet modals when recording starts
                    if (isRecording) {
                      stopRecording()
                      console.log('Stopping recording')
                    } else {
                      startRecording()
                      console.log('Starting recording')
                    }
                  }
                }
              }
            }}
            title={textMode ? 'Toggle Text Input' : (isRecording ? 'Stop Recording' : 'Start Recording')}
          >
            {textMode ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            )}
            </div>

          {/* Close Planet */}
          <div
            className="planet-modal"
            style={{
              position: 'fixed',
              left: `${positions[2].x}px`,
              top: `${positions[2].y}px`,
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
              zIndex: 9998,
              transition: 'all 0.3s ease',
              transform: 'scale(1)',
              opacity: 1
            }}
            onClick={() => setShowPlanetModals(false)}
            title="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
                </div>
        </>
        )
      })()}
    </>
  )
}

// Main component - no authentication wrapper needed
const DuckCodeModal = () => {
  return <DuckCodeModalContent />
}

export default DuckCodeModal
