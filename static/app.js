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
    // (No changes needed)
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
             messageDiv.innerHTML = formattedText;
        } else {
            messageDiv.textContent = text;
        }
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return messageDiv;
    }

     // --- Function using Fetch for POST and Stream Processing ---
     async function handleChatStreamWithFetch(history) {
        let lastBotMessageDiv = addMessageToUI('bot', '');
        if (!lastBotMessageDiv) return;
        let currentContent = '';

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
                        // Get the raw content chunk, do NOT trim() here initially
                        const data = line.substring(6);
                        // console.log("Raw Chunk:", JSON.stringify(data)); // Keep for debugging

                         if (data.startsWith("[Error]")) {
                            currentContent += data.trim(); // Trim error message
                            lastBotMessageDiv.innerHTML = `<span style="color: #ff5555;">${currentContent}</span>`;
                            throw new Error("Backend Error Received");
                         }

                        // --- Minimal Space Workaround ---
                        // If current content isn't empty AND doesn't end with whitespace, add a space BEFORE the new chunk
                        // This assumes chunks often represent whole words or punctuation without leading/trailing spaces
                        if (currentContent.length > 0 && !/\s$/.test(currentContent) && !/^\s/.test(data)) {
                             currentContent += ' ';
                        }
                        // --- End Workaround ---

                        currentContent += data;
                        lastBotMessageDiv.textContent = currentContent; // Update using textContent
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }
                }
            }
            // AFTER STREAM: Trim final content and apply Markdown
            currentContent = currentContent.trim(); // Clean up potential final whitespace
            if (currentContent.length > 0 && !currentContent.startsWith("[Error]")) {
                addMessageToUI('assistant', currentContent, true); // Create new div with formatting
                lastBotMessageDiv.remove(); // Remove the placeholder div
                messageHistory.push({ role: 'assistant', content: currentContent });
            } else if (currentContent.startsWith("[Error]")) {
                 if (!lastBotMessageDiv.innerHTML.includes('color: #ff5555;')) {
                       lastBotMessageDiv.innerHTML = `<span style="color: #ff5555;">${currentContent}</span>`;
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
    async function sendMessage(event) { /* ... */ }
    if (chatForm) { chatForm.addEventListener('submit', sendMessage); }
    if (messageInput) { /* ... keypress listener ... */ }
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
