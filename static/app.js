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
    // (No changes needed in this function from the last version)
    function addMessageToUI(sender, text, applyMarkdown = false) {
        if (welcomeMessage && messagesContainer.children.length <= 1) {
             messagesContainer.style.justifyContent = 'flex-start';
             welcomeMessage.style.display = 'none';
        }
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(sender === 'user' ? 'user-message' : 'bot-message');
        if (applyMarkdown) {
            let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
            // Ensure HTML entities are handled if mixing textContent and innerHTML later
            // A more robust solution might use a Markdown library
             messageDiv.innerHTML = formattedText;
        } else {
            messageDiv.textContent = text; // Preserves spaces/newlines for CSS
        }
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return messageDiv;
    }

     // --- Function using Fetch for POST and Stream Processing ---
     async function handleChatStreamWithFetch(history) {
        let lastBotMessageDiv = addMessageToUI('bot', ''); // Add placeholder
        if (!lastBotMessageDiv) return;
        let currentContent = '';
        // --- WORKAROUND FLAG ---
        let previousChunkEndedWithSpace = true; // Assume start requires no preceding space

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
                        // Get content, trim leading/trailing whitespace JUST IN CASE API adds some inconsistently
                        let data = line.substring(6).trim();
                        // console.log("Raw Chunk:", JSON.stringify(data)); // Keep for debugging if needed

                         if (data.startsWith("[Error]")) {
                            currentContent += data;
                            lastBotMessageDiv.innerHTML = `<span style="color: #ff5555;">${currentContent}</span>`;
                            throw new Error("Backend Error Received");
                         }

                         if (data.length === 0) continue; // Skip empty chunks

                        // --- WORKAROUND LOGIC ---
                        // If the accumulated content is not empty,
                        // AND the previous chunk didn't end with whitespace,
                        // AND the current chunk doesn't start with whitespace (or common punctuation that shouldn't have preceding space)
                        // THEN add a space.
                        const punctuationRegex = /^[.,!?;:)\-"”']/; // Characters that usually don't need a space before them
                        if (currentContent.length > 0 && !/\s$/.test(currentContent) && !/^\s/.test(data) && !punctuationRegex.test(data)) {
                             currentContent += ' '; // Add space BEFORE appending new data
                         }
                        // --- END WORKAROUND LOGIC ---

                        currentContent += data;
                        lastBotMessageDiv.textContent = currentContent; // Update using textContent

                         // Update flag for next iteration (check if the raw data chunk ended with space)
                         // We use the non-trimmed line data for this check if available, otherwise 'data'
                         const rawLineData = line.substring(6); // Data before trim()
                         previousChunkEndedWithSpace = /\s$/.test(rawLineData);

                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }
                }
            }
            // AFTER STREAM: Apply Markdown
            if (currentContent.trim() && !currentContent.startsWith("[Error]")) {
                // Apply Markdown formatting after the full text is assembled
                addMessageToUI('assistant', currentContent.trim(), true); // Create new div with formatting
                lastBotMessageDiv.remove(); // Remove the placeholder div
                messageHistory.push({ role: 'assistant', content: currentContent.trim() });
            } else if (currentContent.trim().startsWith("[Error]")) {
                 // If it ended with an error, update history if needed (optional)
                 // messageHistory.push({ role: 'assistant', content: currentContent.trim() });
                 // Update the placeholder div with final error styling if not already done
                  if (!lastBotMessageDiv.innerHTML.includes('color: #ff5555;')) {
                       lastBotMessageDiv.innerHTML = `<span style="color: #ff5555;">${currentContent}</span>`;
                  }

            } else {
                 // If stream finished but produced no content, remove placeholder
                 lastBotMessageDiv.remove();
            }

        } catch (error) {
            console.error("Fetch stream failed:", error);
            const errorMsg = `[Stream Connection Error: ${error.message}]`;
             // Update placeholder or add new message for connection errors
            if (lastBotMessageDiv && !lastBotMessageDiv.innerHTML.includes('color: #ff5555;')) {
                // Append only if no backend error was already displayed in the div
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

    // --- Event Listener for Sending Message ---
    // (No changes needed in this function from the last version)
    async function sendMessage(event) {
        event.preventDefault();
        const userText = messageInput.value.trim();
        if (!userText) return;
        addMessageToUI('user', userText); // Use default textContent
        messageHistory.push({ role: 'user', content: userText });
        messageInput.value = '';
        messageInput.disabled = true;
        sendButton.disabled = true;
        await handleChatStreamWithFetch([...messageHistory]);
    }

    // Attach listener to form submission
    if (chatForm) {
        chatForm.addEventListener('submit', sendMessage);
    }
     // Allow sending with Enter key
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
