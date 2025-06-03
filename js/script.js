/*
 * Created by: yi.zhou and Emre
 * Created on: May 2025
 * This file contains the JS for index.html
 */
'use strict'

// Get DOM elements
const chatArea = document.getElementById('chat-area')
const chatForm = document.getElementById('chat-form')
const userInput = document.getElementById('user-input')
// const sendButton = document.getElementById('send') // Removed as it's unused

// Gemini API Key (replace with secure storage in production)
const apiKey = 'AIzaSyCfS7TjJLVIP557y5rwqPAH9YGWZj5EtUs'

// Toggle dark theme when button is clicked
document.getElementById('btn-toggle').addEventListener('click', () => {
  document.body.classList.toggle('dark-theme')
})

// Press Enter to send the message
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

// Handle form submission (user sends a message)
chatForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  const userMessageText = userInput.value.trim()

  if (userMessageText !== '') {
    // Show user message in chat
    appendMessage(userMessageText, 'user', 'enter')

    // Reset input box
    userInput.value = ''
    userInput.style.height = 'auto'
    userInput.style.overflowY = 'hidden'

    // Show typing indicator
    const typingIndicatorId = 'typing-indicator-' + Date.now()
    appendMessage('Jarvis is thinking...', 'bot', typingIndicatorId)

    try {
      // Get response from Gemini API
      const geminiResponse = await getGeminiResponse(userMessageText)

      // Remove typing indicator and show bot response
      removeMessage(typingIndicatorId)
      appendMessage(geminiResponse, 'bot')
    } catch (error) {
      // Handle API error
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

// Add a message to the chat area
function appendMessage (text, sender, elementId = null) {
  const messageDiv = document.createElement('div')
  messageDiv.classList.add('chat-message', `${sender}-message`)

  if (elementId !== null) {
    messageDiv.id = elementId
  }

  messageDiv.textContent = text
  chatArea.appendChild(messageDiv)
  chatArea.scrollTop = chatArea.scrollHeight
}

// Remove a message by its ID
function removeMessage (elementId) {
  const messageElement = document.getElementById(elementId)
  if (messageElement !== null) {
    messageElement.remove()
  }
}

// Call Gemini API to get bot response
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
  ) { // Fixed: Added opening brace for else if block
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
