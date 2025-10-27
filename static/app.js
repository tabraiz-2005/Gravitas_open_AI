document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    const messagesContainer = document.getElementById('messages');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const chatForm = document.getElementById('chatForm');
    const welcomeMessage = document.querySelector('.welcome-message'); // Get the welcome message element

    // --- State ---
    let messageHistory = []; // Store the conversation history

    // --- Function to Add Message to UI ---
    function addMessageToUI(sender, text) {
        // Hide welcome message if it exists and this is the first real message
        if (welcomeMessage && messagesContainer.children.length <= 1) { // <=1 because the bot placeholder gets added first
             welcomeMessage.style.display = 'none';
        }

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(sender === 'user' ? 'user-message' : 'bot-message');

        // Basic Markdown support
        let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
        formattedText = formattedText.replace(/\n/g, '<br>');

        messageDiv.innerHTML = formattedText;
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
                body: JSON.stringify({ messages: history }) // Send entire history
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let currentHTML = ''; // Accumulate HTML within the stream

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Process buffer line by line for SSE format ("data: ...\n\n")
                let lines = buffer.split('\n\n');
                buffer = lines.pop(); // Keep the last partial line in buffer

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6).trim(); // Remove "data: " prefix

                         if (data.startsWith("[Error]")) {
                            currentHTML += `<span style="color: #ff5555;">${data}</span>`;
                            lastBotMessageDiv.innerHTML = currentHTML; // Update with error
                            throw new Error("Backend Error Received"); // Stop processing
                         }

                        // Append raw data to accumulator
                        currentHTML += data;

                        // Apply basic Markdown and newline formatting to the accumulated text
                        let formattedHTML = currentHTML.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                        formattedHTML = formattedHTML.replace(/\*(.*?)\*/g, '<em>$1</em>');
                        formattedHTML = formattedHTML.replace(/\n/g, '<br>');

                        lastBotMessageDiv.innerHTML = formattedHTML; // Update the DOM

                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }
                }
            }
             // Add the final bot message to history after streaming is complete
             if (lastBotMessageDiv.textContent.trim()) {
                messageHistory.push({ role: 'assistant', content: lastBotMessageDiv.textContent.trim() });
             }


        } catch (error) {
            console.error("Fetch stream failed:", error);
            if(lastBotMessageDiv){
                 // Append error to the existing placeholder if possible
                 lastBotMessageDiv.innerHTML += `<br><span style="color: #ff5555;">[Stream Connection Error]</span>`;
            } else {
                 // Or add a new message bubble just for the error
                 addMessageToUI('bot', `<span style="color: #ff5555;">[Stream Connection Error]</span>`);
            }
        } finally {
            // Re-enable input after stream ends or errors
            sendButton.disabled = false;
            messageInput.disabled = false;
            messageInput.focus();
        }
    }


    // --- Event Listener for Sending Message ---
    async function sendMessage(event) {
        event.preventDefault(); // Prevent default form submission

        const userText = messageInput.value.trim();
        if (!userText) return; // Don't send empty messages

        // Add user message to UI and history
        addMessageToUI('user', userText);
        messageHistory.push({ role: 'user', content: userText });

        // Clear input and disable while waiting for response
        messageInput.value = '';
        messageInput.disabled = true;
        sendButton.disabled = true;

        // Start processing the chat stream using Fetch
        await handleChatStreamWithFetch(messageHistory);

        // Note: Re-enabling is done in the finally block of handleChatStreamWithFetch
    }

    // Attach listener to form submission
    if (chatForm) {
        chatForm.addEventListener('submit', sendMessage);
    }

     // Allow sending with Enter key in the input field
     if (messageInput) {
        messageInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) { // Send on Enter, allow Shift+Enter for newline
                e.preventDefault(); // Prevent newline in input
                if (!sendButton.disabled) { // Only send if not already waiting
                     // Directly call sendMessage, ensuring the event object is passed if needed,
                     // or create a new event if the handler relies on it.
                     // Since sendMessage uses event.preventDefault(), create a relevant event.
                     const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                     sendMessage(submitEvent);
                }
            }
        });
    }

});
