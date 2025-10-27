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
                        const data = line.substring(6).trim();
                        // --- ADDED CONSOLE LOG ---
                        console.log("Raw Chunk:", JSON.stringify(data)); // Log the raw data chunk to see spaces

                         if (data.startsWith("[Error]")) {
                            currentContent += data;
                            lastBotMessageDiv.innerHTML = `<span style="color: #ff5555;">${currentContent}</span>`;
                            throw new Error("Backend Error Received");
                         }
                        currentContent += data;
                        lastBotMessageDiv.textContent = currentContent; // Update using textContent
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }
                }
            }
            // AFTER STREAM: Apply Markdown
            if (currentContent.trim() && !currentContent.startsWith("[Error]")) {
                let formattedHTML = currentContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                formattedHTML = formattedHTML.replace(/\*(.*?)\*/g, '<em>$1</em>');
                lastBotMessageDiv.innerHTML = formattedHTML; // Update with formatting
                messageHistory.push({ role: 'assistant', content: currentContent.trim() });
            }
        } catch (error) {
            console.error("Fetch stream failed:", error);
            const errorMsg = `[Stream Connection Error: ${error.message}]`;
            if (lastBotMessageDiv && !lastBotMessageDiv.innerHTML.includes('color: #ff5555;')) {
                 lastBotMessageDiv.innerHTML += `<br><span style="color: #ff5555;">${errorMsg}</span>`;
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
