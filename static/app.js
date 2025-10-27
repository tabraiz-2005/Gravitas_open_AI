document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    const messagesContainer = document.getElementById('messages');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const chatForm = document.getElementById('chatForm');
    const welcomeMessage = document.querySelector('.welcome-message');

    // --- State ---
    let messageHistory = []; // Store the conversation history

    // --- Function to Add Message to UI ---
    function addMessageToUI(sender, text) {
        // Hide welcome message
        if (welcomeMessage && messagesContainer.children.length <= 1) {
             messagesContainer.style.justifyContent = 'flex-start'; // Align messages top
             welcomeMessage.style.display = 'none';
        }

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(sender === 'user' ? 'user-message' : 'bot-message');

        // Basic Markdown support (Bold/Italic)
        // Let CSS handle newlines via 'white-space: pre-wrap;'
        let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Use innerHTML because we added Markdown formatting
        messageDiv.innerHTML = formattedText;
        // If no markdown support needed, safer to use:
        // messageDiv.textContent = text;

        messagesContainer.appendChild(messageDiv);

        // Scroll to the bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

     // --- Function using Fetch for POST and Stream Processing ---
     async function handleChatStreamWithFetch(history) {
        addMessageToUI('bot', ''); // Add placeholder
        let lastBotMessageDiv = messagesContainer.querySelector('.bot-message:last-child');
        if (!lastBotMessageDiv) return;

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ messages: history })
            });

            if (!response.ok) {
                 const errorText = await response.text();
                 throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let currentContent = ''; // Accumulate raw text

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                let lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6).trim();

                         if (data.startsWith("[Error]")) {
                            currentContent += data;
                            let formattedError = `<span style="color: #ff5555;">${data}</span>`;
                            lastBotMessageDiv.innerHTML = formattedError;
                            throw new Error("Backend Error Received");
                         }

                        currentContent += data;

                        // Apply Markdown formatting to the accumulated text
                        let formattedHTML = currentContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                        formattedHTML = formattedHTML.replace(/\*(.*?)\*/g, '<em>$1</em>');
                        // REMOVED explicit <br> replacement - let CSS handle newlines

                        lastBotMessageDiv.innerHTML = formattedHTML; // Update the DOM

                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }
                }
            }
             // Add the final bot message text to history
             if (currentContent.trim()) {
                messageHistory.push({ role: 'assistant', content: currentContent.trim() });
             }


        } catch (error) {
            console.error("Fetch stream failed:", error);
            const errorMsg = `[Stream Connection Error: ${error.message}]`;
            if(lastBotMessageDiv && lastBotMessageDiv.innerHTML.trim() === ''){
                 lastBotMessageDiv.innerHTML = `<span style="color: #ff5555;">${errorMsg}</span>`;
            } else if (lastBotMessageDiv) {
                 lastBotMessageDiv.innerHTML += `<br><span style="color: #ff5555;">${errorMsg}</span>`;
            }
             else {
                 addMessageToUI('bot', `<span style="color: #ff5555;">${errorMsg}</span>`);
            }
        } finally {
            // Re-enable input
            sendButton.disabled = false;
            messageInput.disabled = false;
            messageInput.focus();
        }
    }


    // --- Event Listener for Sending Message ---
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
