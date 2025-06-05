/*
 * Created by: yi.zhou and Emre
 * Created on: May 2025
 * This file contains the JS for index.html
 */

/* global hljs */

'use strict'

const chatArea = document.getElementById('chat-area')
const chatForm = document.getElementById('chat-form')
const userInput = document.getElementById('user-input')

const apiKey = 'AIzaSyCfS7TjJLVIP557y5rwqPAH9YGWZj5EtUs'

document.getElementById('btn-toggle').addEventListener('click', () => {
  document.body.classList.toggle('dark-theme')
})

userInput.addEventListener('keyup', function (event) {
  if (event.key === 'Enter') {
    if (event.shiftKey) {
      event.preventDefault()
    } else {
      event.preventDefault()
      chatForm.dispatchEvent(new Event('submit'))
    }
  }
})

chatForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  const userMessageText = userInput.value.trim()

  if (userMessageText !== '') {
    appendMessage(userMessageText, 'user', 'enter')

    userInput.value = ''
    userInput.style.height = 'auto'
    userInput.style.overflowY = 'hidden'

    const typingIndicatorId = 'typing-indicator-' + Date.now()
    appendMessage('Jarvis is thinking...', 'bot', typingIndicatorId)

    try {
      const geminiResponse = await getGeminiResponse(userMessageText)

      removeMessage(typingIndicatorId)
      appendMessage(geminiResponse, 'bot')
    } catch (error) {
      removeMessage(typingIndicatorId)
      console.error('Error fetching from Gemini:', error)
      appendMessage(
        `Sorry, I encountered an error: ${
          error.message !== undefined ? error.message : 'Please try again.'
        }`,
        'bot'
      )
    }
  }
})

function appendMessage (text, sender, elementId = null) {
  const messageDiv = document.createElement('div')
  messageDiv.classList.add('chat-message', `${sender}-message`)

  if (elementId !== null) {
    messageDiv.id = elementId
  }

  let processedText = text

  processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  processedText = processedText.replace(/\*(.*?)\*/g, '<em>$1</em>')

  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
  let match
  let lastIndex = 0
  let contentHtml = ''

  while ((match = codeBlockRegex.exec(processedText)) !== null) {
    contentHtml += `<p>${processedText.substring(lastIndex, match.index)}</p>`

    const language = match[1] || 'plaintext'
    const code = match[2].trim()

    contentHtml += `<pre><code class="language-${language}">${escapeHtml(code)}</code></pre>`
    lastIndex = codeBlockRegex.lastIndex
  }

  contentHtml += `<p>${processedText.substring(lastIndex)}</p>`

  messageDiv.innerHTML = contentHtml
  chatArea.appendChild(messageDiv)
  chatArea.scrollTop = chatArea.scrollHeight

  messageDiv.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightElement(block)
  })
}

function removeMessage (elementId) {
  const messageElement = document.getElementById(elementId)
  if (messageElement !== null) {
    messageElement.remove()
  }
}

function escapeHtml (text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, function (m) { return map[m] })
}

async function getGeminiResponse (prompt) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`

  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ]
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  })

  if (response.ok !== true) {
    const errorData = await response.json()
    let errorMessage = `API request failed with status ${response.status}`

    if (
      errorData !== null &&
      errorData.error !== undefined &&
      errorData.error.message !== undefined
    ) {
      errorMessage += `: ${errorData.error.message}`
    }

    throw new Error(errorMessage)
  }

  const data = await response.json()

  if (
    Array.isArray(data.candidates) === true &&
    data.candidates.length > 0 &&
    data.candidates[0].content !== undefined &&
    Array.isArray(data.candidates[0].content.parts) === true &&
    data.candidates[0].content.parts.length > 0
  ) {
    return data.candidates[0].content.parts[0].text
  } else if (
    data.promptFeedback !== undefined &&
    data.promptFeedback.blockReason !== undefined
  ) {
    return `Response was blocked by the API: ${data.promptFeedback.blockReason}. ${
      (Array.isArray(data.promptFeedback.safetyRatings)
        ? data.promptFeedback.safetyRatings
        : []
      ).map((r) => `${r.category}: ${r.probability}`).join(', ')
    }`
  } else {
    console.warn('Unexpected API response structure:', data)
    return 'Received an empty or unexpected response from Jarvis.'
  }
}
