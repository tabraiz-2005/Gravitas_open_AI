document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    const messagesContainer = document.getElementById('messages');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const chatForm = document.getElementById('chatForm');
    // --- ADDED --- Get the welcome message element
    const welcomeMessage = document.querySelector('.welcome-message');

    // --- State ---
    let messageHistory = []; // Store the conversation history

    // --- Function to Add Message to UI ---
    function addMessageToUI(sender, text) {
        // --- ADDED --- Hide welcome message if it exists and this is the first real message bubble being added
        if (welcomeMessage && messagesContainer.children.length <= 1) { // <=1 because the bot placeholder gets added first
            // Ensure the container allows messages to align top now
             messagesContainer.style.justifyContent = 'flex-start';
             welcomeMessage.style.display = 'none';
        }

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(sender === 'user' ? 'user-message' : 'bot-message');

        // Basic Markdown support
        let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
        formattedText = formattedText.replace(/\n/g, '<br>'); // Handles newlines (works with CSS white-space: pre-wrap)

        messageDiv.innerHTML = formattedText;
        messagesContainer.appendChild(messageDiv);

        // Scroll to the bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

     // --- Function using Fetch for POST and Stream Processing ---
     async function handleChatStreamWithFetch(history) {
        addMessageToUI('bot', ''); // Add placeholder bot message bubble
        let lastBotMessageDiv = messagesContainer.querySelector('.bot-message:last-child');
        if (!lastBotMessageDiv) return; // Safety check

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ messages: history }) // Send entire history
            });

            if (!response.ok) {
                 const errorText = await response.text(); // Try to get error text from backend
                 throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let currentContent = ''; // Accumulate raw text content for history

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Process buffer line by line for SSE format ("data: ...\n\n")
                let lines = buffer.split('\n\n');
                buffer = lines.pop() || ''; // Keep the last partial line in buffer, handle empty buffer case

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6).trim(); // Remove "data: " prefix

                         if (data.startsWith("[Error]")) {
                            currentContent += data; // Add error to content display
                            let formattedError = `<span style="color: #ff5555;">${data}</span>`;
                            lastBotMessageDiv.innerHTML = formattedError; // Display error
                            throw new Error("Backend Error Received"); // Stop processing
                         }

                        // Append raw data to accumulator for history
                        currentContent += data;

                        // Apply basic Markdown and newline formatting to the accumulated text for display
                        let formattedHTML = currentContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                        formattedHTML = formattedHTML.replace(/\*(.*?)\*/g, '<em>$1</em>');
                        formattedHTML = formattedHTML.replace(/\n/g, '<br>'); // Let CSS handle spacing with pre-wrap

                        lastBotMessageDiv.innerHTML = formattedHTML; // Update the DOM

                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }
                }
            }
             // --- MODIFIED --- Add the final bot message text to history after streaming
             if (currentContent.trim()) {
                messageHistory.push({ role: 'assistant', content: currentContent.trim() });
             }


        } catch (error) {
            console.error("Fetch stream failed:", error);
            const errorMsg = `[Stream Connection Error: ${error.message}]`;
            if(lastBotMessageDiv && lastBotMessageDiv.innerHTML.trim() === ''){
                 // If placeholder is empty, put error inside it
                 lastBotMessageDiv.innerHTML = `<span style="color: #ff5555;">${errorMsg}</span>`;
            } else if (lastBotMessageDiv) {
                 // Append error after existing content if stream partially worked
                 lastBotMessageDiv.innerHTML += `<br><span style="color: #ff5555;">${errorMsg}</span>`;
            }
             else {
                 // Or add a new message bubble just for the error if placeholder failed
                 addMessageToUI('bot', `<span style="color: #ff5555;">${errorMsg}</span>`);
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
        // Pass a copy of the history to avoid potential race conditions if needed
        await handleChatStreamWithFetch([...messageHistory]);

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
                     const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                     chatForm.dispatchEvent(submitEvent); // Dispatch submit on the form
                }
            }
        });
    }

});
