import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import Prism from 'prismjs'

// Import Prism languages we need
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-c'

class MarkdownRenderer {
  private md: MarkdownIt

  constructor() {
    this.md = new MarkdownIt({
      html: false, // Disable HTML tags in source for security
      xhtmlOut: false,
      breaks: true, // Convert '\n' in paragraphs into <br>
      linkify: true, // Autoconvert URL-like text to links
      typographer: true, // Enable some language-neutral replacement + quotes beautification
      highlight: this.highlightCode.bind(this)
    })
  }

  private highlightCode(str: string, lang: string): string {
    if (lang && Prism.languages[lang]) {
      try {
        const highlighted = Prism.highlight(str, Prism.languages[lang], lang)
        return `<pre class="code-block language-${lang}"><code class="language-${lang}">${highlighted}</code></pre>`
      } catch (err) {
        console.warn('Prism highlighting failed:', err)
      }
    }

    // Fallback to escaped plain text
    return `<pre class="code-block"><code>${this.escapeHtml(str)}</code></pre>`
  }

  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }
    return text.replace(/[&<>"']/g, (m) => map[m])
  }

  public render(markdown: string): string {
    if (!markdown) return ''

    try {
      // 1. Parse markdown to HTML
      const rawHtml = this.md.render(markdown)

      // 2. Sanitize HTML with DOMPurify
      const cleanHtml = DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'em', 'u', 'code', 'pre', 
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'ul', 'ol', 'li', 'blockquote',
          'a', 'span', 'div'
        ],
        ALLOWED_ATTR: ['href', 'class', 'target', 'rel'],
        ALLOW_DATA_ATTR: false
      })

      return cleanHtml
    } catch (error) {
      console.error('Markdown rendering failed:', error)
      return this.escapeHtml(markdown)
    }
  }

  public addCopyButtons(container: HTMLElement): void {
    const codeBlocks = container.querySelectorAll('pre.code-block')
    
    codeBlocks.forEach((pre) => {
      // Skip if copy button already exists
      if (pre.querySelector('.copy-btn')) return

      const copyBtn = document.createElement('button')
      copyBtn.className = 'copy-btn'
      copyBtn.textContent = 'Copy'
      copyBtn.setAttribute('aria-label', 'Copy code to clipboard')
      
      copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation()
        
        const code = pre.querySelector('code')
        if (!code) return

        try {
          // Get the text content, preserving line breaks
          const codeText = code.textContent || ''
          await navigator.clipboard.writeText(codeText)
          
          copyBtn.textContent = 'Copied!'
          copyBtn.classList.add('copied')
          
          setTimeout(() => {
            copyBtn.textContent = 'Copy'
            copyBtn.classList.remove('copied')
          }, 2000)
        } catch (err) {
          console.error('Failed to copy code:', err)
          copyBtn.textContent = 'Failed'
          setTimeout(() => {
            copyBtn.textContent = 'Copy'
          }, 2000)
        }
      })

      // Position the button
      pre.style.position = 'relative'
      pre.appendChild(copyBtn)
    })
  }
}

// Export singleton instance
export const markdownRenderer = new MarkdownRenderer()