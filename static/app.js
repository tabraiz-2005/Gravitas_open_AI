document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    const messagesContainer = document.getElementById('messages');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const chatForm = document.getElementById('chatForm');
    const welcomeMessage = document.querySelector('.welcome-message');

    // --- State ---
    let messageHistory = [];

    // --- Function to Add Message to UI ---
    // Uses textContent by default, innerHTML only if applyMarkdown is true
    function addMessageToUI(sender, text, applyMarkdown = false) {
        if (welcomeMessage && messagesContainer.children.length <= 1) {
             messagesContainer.style.justifyContent = 'flex-start';
             welcomeMessage.style.display = 'none';
        }
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(sender === 'user' ? 'user-message' : 'bot-message');

        if (applyMarkdown) {
            // Apply Markdown AFTER text is complete
            let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
            // Replace escaped newlines potentially added by backend sse function
            formattedText = formattedText.replace(/\\n/g, '\n');
            messageDiv.innerHTML = formattedText; // Render Markdown
        } else {
            // Use textContent during streaming and for user messages
            // Replace escaped newlines potentially added by backend sse function
            messageDiv.textContent = text.replace(/\\n/g, '\n'); // Relies on CSS 'white-space: pre-wrap'
        }

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return messageDiv; // Return the created div
    }

     // --- Function using Fetch for POST and Stream Processing ---
     async function handleChatStreamWithFetch(history) {
        let lastBotMessageDiv = addMessageToUI('bot', ''); // Add placeholder
        if (!lastBotMessageDiv) return;
        let currentContent = ''; // Accumulate raw text

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: history })
            });
            if (!response.ok) {
                 const errorText = await response.text();
                 throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                let lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        // Get the raw content chunk, do NOT trim()
                        const data = line.substring(6); // Includes original spaces/newlines from API
                        // console.log("Raw Chunk:", JSON.stringify(data)); // Keep for debugging

                         if (data.startsWith("[Error]")) {
                            currentContent += data.trim(); // Trim error message
                            lastBotMessageDiv.innerHTML = `<span style="color: #ff5555;">${currentContent.replace(/\\n/g, '<br>')}</span>`;
                            throw new Error("Backend Error Received");
                         }

                        // Append raw chunk directly
                        currentContent += data;
                        // Update textContent - Browser + CSS handles spacing/newlines
                        // Replace escaped newlines added by backend sse function for display
                        lastBotMessageDiv.textContent = currentContent.replace(/\\n/g, '\n');
                        messagesContainer.scrollTop = messagesContainer.scrollHeight; // Keep scrolling
                    }
                }
            }
            // AFTER STREAM: Trim final content and apply Markdown
            currentContent = currentContent.trim(); // Clean up potential final whitespace
            if (currentContent.length > 0 && !currentContent.startsWith("[Error]")) {
                addMessageToUI('assistant', currentContent, true); // Create NEW div with formatting
                lastBotMessageDiv.remove(); // Remove the placeholder div used for streaming
                messageHistory.push({ role: 'assistant', content: currentContent.replace(/\\n/g, '\n') }); // Store with real newlines
            } else if (currentContent.startsWith("[Error]")) {
                 // Final update for error message styling if needed
                 if (!lastBotMessageDiv.innerHTML.includes('color: #ff5555;')) {
                       lastBotMessageDiv.innerHTML = `<span style="color: #ff5555;">${currentContent.replace(/\\n/g, '<br>')}</span>`;
                  }
            } else {
                 lastBotMessageDiv.remove(); // Remove placeholder if no content
            }

        } catch (error) {
             console.error("Fetch stream failed:", error);
            const errorMsg = `[Stream Connection Error: ${error.message}]`;
            if (lastBotMessageDiv && !lastBotMessageDiv.innerHTML.includes('color: #ff5555;')) {
                 lastBotMessageDiv.innerHTML += (lastBotMessageDiv.textContent.length > 0 ? '<br>' : '') + `<span style="color: #ff5555;">${errorMsg}</span>`;
            } else if (!lastBotMessageDiv) {
                 addMessageToUI('bot', `<span style="color: #ff5555;">${errorMsg}</span>`);
            }
        } finally {
            sendButton.disabled = false;
            messageInput.disabled = false;
            messageInput.focus();
        }
    }

    // --- Event Listener & Keypress --- (No changes needed)
    async function sendMessage(event) {
        event.preventDefault();
        const userText = messageInput.value.trim();
        if (!userText) return;
        addMessageToUI('user', userText);
        messageHistory.push({ role: 'user', content: userText });
        messageInput.value = '';
        messageInput.disabled = true;
        sendButton.disabled = true;
        await handleChatStreamWithFetch([...messageHistory]);
    }
    if (chatForm) { chatForm.addEventListener('submit', sendMessage); }
    if (messageInput) {
        messageInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendButton.disabled) {
                     const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                     chatForm.dispatchEvent(submitEvent);
                }
            }
        });
    }

});
