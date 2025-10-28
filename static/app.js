document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    const messagesContainer = document.getElementById('messages');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const chatForm = document.getElementById('chatForm');
    const welcomeMessage = document.querySelector('.welcome-message');
    // --- ADDED --- Mic button element
    const micButton = document.getElementById('micButton');

    // --- State ---
    let messageHistory = [];

    // --- Web Speech API Setup ---
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let isListening = false;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false; // Process single utterances
        recognition.lang = 'en-US';    // Set language
        recognition.interimResults = false; // Get final results only
        recognition.maxAlternatives = 1;

        // --- Event Handlers for Speech Recognition ---
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            messageInput.value = transcript; // Put recognized text in input
            stopListening(); // Stop after getting a result

            // Optional: Automatically send the message after recognition
            // const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            // chatForm.dispatchEvent(submitEvent);
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            if (event.error === 'no-speech') {
                alert("No speech detected. Please try again.");
            } else if (event.error === 'audio-capture') {
                alert("Microphone error. Ensure it's enabled and connected.");
            } else if (event.error === 'not-allowed') {
                alert("Microphone permission denied. Please allow access in browser settings.");
            } else {
                 alert(`An error occurred during speech recognition: ${event.error}`);
            }
            stopListening(); // Ensure listening stops on error
        };

        recognition.onend = () => {
             // This might fire naturally or after stop()
             // Ensure UI reflects the stopped state if it wasn't an error/result end
            if (isListening) {
                stopListening();
            }
        };

    } else {
        console.warn("Speech Recognition not supported in this browser.");
        if(micButton) micButton.disabled = true; // Disable button if not supported
        if(micButton) micButton.title = "Voice input not supported by your browser";
    }

    // --- Functions to control listening state ---
    function startListening() {
        if (!recognition || isListening) return;
        try {
            recognition.start();
            isListening = true;
            micButton.classList.add('listening'); // Visual feedback
            micButton.title = "Stop voice input";
            messageInput.placeholder = "Listening..."; // Update placeholder
        } catch (e) {
             console.error("Error starting recognition:", e);
             alert("Could not start voice input. Please ensure microphone access is granted.");
        }
    }

    function stopListening() {
        if (!recognition || !isListening) return;
        recognition.stop();
        isListening = false;
        micButton.classList.remove('listening'); // Remove visual feedback
        micButton.title = "Start voice input";
        messageInput.placeholder = "Ask Anything or use Mic"; // Restore placeholder
    }

    // --- Mic Button Event Listener ---
    if (micButton && recognition) {
        micButton.addEventListener('click', () => {
            if (isListening) {
                stopListening();
            } else {
                startListening();
            }
        });
    }


    // --- Function to Add Message to UI ---
    // (No changes needed in this function from the last version)
    function addMessageToUI(sender, text, applyMarkdown = false) { /* ... same as before ... */
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
            formattedText = formattedText.replace(/\\n/g, '\n');
            messageDiv.innerHTML = formattedText;
        } else {
            messageDiv.textContent = text.replace(/\\n/g, '\n');
        }

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return messageDiv;
    }

     // --- Function using Fetch for POST and Stream Processing ---
     // (No changes needed in this function from the last version)
     async function handleChatStreamWithFetch(history) { /* ... same as before ... */
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
                        const data = line.substring(6);
                        // console.log("Raw Chunk:", JSON.stringify(data));

                         if (data.startsWith("[Error]")) {
                            currentContent += data.trim();
                            lastBotMessageDiv.innerHTML = `<span style="color: #ff5555;">${currentContent.replace(/\\n/g, '<br>')}</span>`;
                            throw new Error("Backend Error Received");
                         }

                        if (currentContent.length > 0 && !/\s$/.test(currentContent) && !/^\s/.test(data)) {
                             currentContent += ' ';
                        }

                        currentContent += data;
                        lastBotMessageDiv.textContent = currentContent.replace(/\\n/g, '\n');
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }
                }
            }
            currentContent = currentContent.trim();
            if (currentContent.length > 0 && !currentContent.startsWith("[Error]")) {
                addMessageToUI('assistant', currentContent, true);
                lastBotMessageDiv.remove();
                messageHistory.push({ role: 'assistant', content: currentContent.replace(/\\n/g, '\n') });
            } else if (currentContent.startsWith("[Error]")) {
                 if (!lastBotMessageDiv.innerHTML.includes('color: #ff5555;')) {
                       lastBotMessageDiv.innerHTML = `<span style="color: #ff5555;">${currentContent.replace(/\\n/g, '<br>')}</span>`;
                  }
            } else {
                 lastBotMessageDiv.remove();
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

    // --- Event Listener & Keypress ---
    // (No changes needed here)
    async function sendMessage(event) { /* ... same as before ... */
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
    if (messageInput) { /* ... keypress listener ... */
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
