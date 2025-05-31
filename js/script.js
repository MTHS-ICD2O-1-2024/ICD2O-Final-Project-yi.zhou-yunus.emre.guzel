/* Created by: yi.zhou and Emre Guzel
* Created on: May 2025
* This file contains the JS for index.html
*/
"use strict";

// Setting the veribles
const chatArea = document.getElementById('chat-area');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');

// Setting the API key 
const apiKey = 'AIzaSyCfS7TjJLVIP557y5rwqPAH9YGWZj5EtUs';

function toggleTheme() {
  document.body.classList.toggle('dark-theme');
}
chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const userMessageText = userInput.value.trim();

  if (userMessageText) {
    appendMessage(userMessageText, 'user', "enter");
    userInput.value = '';
    userInput.style.height = 'auto';
    userInput.style.overflowY = 'hidden';


    // Show typing indicator
    const typingIndicatorId = 'typing-indicator-' + Date.now();
    appendMessage('Jarvis is thinking...', 'bot', typingIndicatorId);

    try {
      const geminiResponse = await getGeminiResponse(userMessageText);
      removeMessage(typingIndicatorId);
      appendMessage(geminiResponse, 'bot');
    } catch (error) {
      removeMessage(typingIndicatorId);
      console.error('Error fetching from Gemini:', error);
      appendMessage(`Sorry, I encountered an error: ${error.message || 'Please try again.'}`, 'bot');
    }
  }
});

function appendMessage(text, sender, elementId = null) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('chat-message', `${sender}-message`);
  if (elementId) {
    messageDiv.id = elementId;
  }
  messageDiv.textContent = text;
  chatArea.appendChild(messageDiv);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function removeMessage(elementId) {
  const messageElement = document.getElementById(elementId);
  if (messageElement) {
    messageElement.remove();
  }
}
// Setting the url of the API
async function getGeminiResponse(prompt) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }]
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok == true) {
    const errorData = await response.json();
    let errorMessage = `API request failed with status ${response.status}`;
    if (errorData && errorData.error && errorData.error.message) {
      errorMessage += `: ${errorData.error.message}`;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();

  if (data.candidates && data.candidates.length > 0 &&
    data.candidates[0].content && data.candidates[0].content.parts &&
    data.candidates[0].content.parts.length > 0) {
    return data.candidates[0].content.parts[0].text;
  } else if (data.promptFeedback && data.promptFeedback.blockReason) {
    return `Response was blocked by the API: ${data.promptFeedback.blockReason}. ${(data.promptFeedback.safetyRatings || []).map(r => `${r.category}: ${r.probability}`).join(', ')}`;
  } else {
    console.warn('Unexpected API response structure:', data);
    return 'Received an empty or unexpected response from Jarvis.';
  }
}