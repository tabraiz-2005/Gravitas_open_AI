document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    const messagesContainer = document.getElementById('messages');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const chatForm = document.getElementById('chatForm');
    const welcomeMessage = document.getElementById('welcomeMessage'); // Use ID now
    const micButton = document.getElementById('micButton');
    // --- ADDED --- New Chat button element
    const newChatButton = document.getElementById('newChatButton');

    // --- State ---
    let messageHistory = [];

    // --- Web Speech API Setup (Speech Recognition - Input) ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let isListening = false;
    // ... (SpeechRecognition setup and handlers - same as before) ...
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false; // Process single utterances
        recognition.lang = 'en-US';    // Set language
        recognition.interimResults = false; // Get final results only
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            messageInput.value = transcript; // Put recognized text in input
            stopListening(); // Stop after getting a result
        };
        recognition.onerror = (event) => { /* ... error handling same as before ... */
             console.error("Speech recognition error:", event.error);
            stopListening();
        };
        recognition.onend = () => { if (isListening) stopListening(); };
    } else { /* ... handle unsupported browser ... */ }

    // --- Functions to control listening state ---
    // (No changes needed here)
    function startListening() { /* ... same as before ... */
         if (!recognition || isListening) return;
        try {
            recognition.start();
            isListening = true;
            micButton.classList.add('listening');
            micButton.title = "Stop voice input";
            messageInput.placeholder = "Listening...";
        } catch (e) { console.error("Error starting recognition:", e); stopListening(); }
    }
    function stopListening() { /* ... same as before ... */
        if (!recognition || !isListening) return;
        try { recognition.stop(); } catch(e) { console.error("Error stopping recognition:", e); } // Add try-catch just in case
        isListening = false;
        micButton.classList.remove('listening');
        micButton.title = "Start voice input";
        messageInput.placeholder = "Ask Anything or use Mic";
     }

    // --- Mic Button Event Listener ---
    // (No changes needed here)
    if (micButton && recognition) { micButton.addEventListener('click', () => { /* ... toggle listening ... */
         if (isListening) { stopListening(); } else { startListening(); }
    }); }

    // --- Web Speech API Setup (Speech Synthesis - Output) ---
    const synth = window.speechSynthesis;
    let currentUtterance = null; // To track the currently speaking utterance

    function speakText(textToSpeak, buttonElement) {
        if (synth.speaking) {
            // If currently speaking, stop it (allows interrupting or stopping)
            synth.cancel();
             // If the clicked button was the one speaking, just stop.
             if (currentUtterance && buttonElement && buttonElement.classList.contains('speaking')) {
                  if (currentUtterance) currentUtterance.onend = null; // Clear listener
                  currentUtterance = null;
                  document.querySelectorAll('.btn-tts.speaking').forEach(btn => btn.classList.remove('speaking'));
                  return; // Stop here
             }
             // If a different button was clicked, stop the old one and start the new one below.
        }

        // Remove speaking class from any previous button
         document.querySelectorAll('.btn-tts.speaking').forEach(btn => btn.classList.remove('speaking'));

        if (textToSpeak) {
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utterance.lang = 'en-US'; // Match language if possible
            // Optional: Choose a specific voice if available
            // const voices = synth.getVoices();
            // utterance.voice = voices.find(voice => voice.name === 'Google UK English Female');

            utterance.onstart = () => {
                if(buttonElement) buttonElement.classList.add('speaking');
                currentUtterance = utterance; // Track this utterance
            };

            utterance.onend = () => {
                if(buttonElement) buttonElement.classList.remove('speaking');
                 // Ensure the ended utterance is the one we tracked before clearing
                 if (currentUtterance === utterance) {
                    currentUtterance = null;
                 }
            };
            utterance.onerror = (event) => {
                console.error('SpeechSynthesisUtterance.onerror', event);
                if(buttonElement) buttonElement.classList.remove('speaking');
                 if (currentUtterance === utterance) {
                    currentUtterance = null;
                 }
                 alert(`Text-to-speech error: ${event.error}`);
            };

            synth.speak(utterance);
        }
    }


    // --- Function to Add Message to UI ---
    // (Modified to add TTS button to bot messages)
    function addMessageToUI(sender, text, applyMarkdown = false) {
        // Hide welcome message logic
        if (welcomeMessage && welcomeMessage.style.display !== 'none' && messagesContainer.children.length > 0) {
            welcomeMessage.style.display = 'none'; // Hide if not already hidden and messages exist
        }

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(sender === 'user' ? 'user-message' : 'bot-message');

        const messageContentSpan = document.createElement('span'); // Span to hold the actual text

        if (applyMarkdown) {
            let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
            formattedText = formattedText.replace(/\\n/g, '\n'); // Handle escaped newlines for display
             messageContentSpan.innerHTML = formattedText; // Render Markdown in the span
        } else {
             // Use textContent directly in the span, handle escaped newlines
             messageContentSpan.textContent = text.replace(/\\n/g, '\n');
        }
        messageDiv.appendChild(messageContentSpan); // Add text content span

        // Add TTS Button to Bot messages
        if (sender === 'assistant' || sender === 'bot') {
            const ttsButton = document.createElement('button');
            ttsButton.classList.add('btn-tts');
            ttsButton.title = 'Read aloud';
            ttsButton.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
            ttsButton.onclick = (e) => {
                // Get the raw text content for speaking
                const textToSpeak = messageContentSpan.textContent;
                speakText(textToSpeak, e.currentTarget); // Pass button element
            };
            messageDiv.appendChild(ttsButton);
        }

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return messageDiv; // Return the created message div
    }

     // --- Function using Fetch for POST and Stream Processing ---
     // (No changes needed in the core streaming logic)
     async function handleChatStreamWithFetch(history) { /* ... same as before ... */
        let lastBotMessageDiv = addMessageToUI('bot', '');
        if (!lastBotMessageDiv) return;
        // Find the span inside the div to update textContent
        let contentSpan = lastBotMessageDiv.querySelector('span');
        if(!contentSpan) return; // Should exist, but safety check

        let currentContent = '';

        try {
            const response = await fetch('/api/chat', { /* ... */ });
            if (!response.ok) { /* ... */ throw new Error(/* ... */); }
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) { /* ... stream reading loop ... */
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                let lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6); // Keep raw data including \n
                        // console.log("Raw Chunk:", JSON.stringify(data));

                         if (data.startsWith("[Error]")) {
                            currentContent += data.trim();
                            // Update the span within the div for error
                            contentSpan.innerHTML = `<span style="color: #ff5555;">${currentContent.replace(/\\n/g, '<br>')}</span>`;
                            lastBotMessageDiv.querySelector('.btn-tts')?.remove(); // Remove TTS button on error
                            throw new Error("Backend Error Received");
                         }

                        // Minimal space workaround
                        if (currentContent.length > 0 && !/\s$/.test(currentContent) && !/^\s/.test(data)) {
                             currentContent += ' ';
                        }
                        currentContent += data;
                        // Update textContent of the span
                        contentSpan.textContent = currentContent.replace(/\\n/g, '\n');
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }
                }
            }
            // AFTER STREAM: Trim, Apply Markdown, Update History
            currentContent = currentContent.trim();
            if (currentContent.length > 0 && !currentContent.startsWith("[Error]")) {
                // Apply Markdown to the final content IN THE SPAN
                let formattedHTML = currentContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                formattedHTML = formattedHTML.replace(/\*(.*?)\*/g, '<em>$1</em>');
                formattedHTML = formattedHTML.replace(/\\n/g, '\n'); // Ensure newlines render correctly with pre-wrap
                contentSpan.innerHTML = formattedHTML;

                 // Update the TTS button's click handler with final text if needed (or rely on span's textContent)
                 let ttsButton = lastBotMessageDiv.querySelector('.btn-tts');
                 if(ttsButton) {
                     ttsButton.onclick = (e) => speakText(contentSpan.textContent, e.currentTarget);
                 }

                messageHistory.push({ role: 'assistant', content: currentContent.replace(/\\n/g, '\n') });
            } else if (currentContent.startsWith("[Error]")) {
                 // Ensure error is fully displayed if stream loop missed it
                 if (!contentSpan.innerHTML.includes('color: #ff5555;')) {
                       contentSpan.innerHTML = `<span style="color: #ff5555;">${currentContent.replace(/\\n/g, '<br>')}</span>`;
                  }
                  lastBotMessageDiv.querySelector('.btn-tts')?.remove(); // Remove TTS on error
            } else {
                 lastBotMessageDiv.remove(); // Remove placeholder if no content
            }

        } catch (error) { /* ... error handling ... */
             console.error("Fetch stream failed:", error);
             // Ensure error is shown in the placeholder or a new div
             const errorMsg = `[Stream Connection Error: ${error.message}]`;
              if (lastBotMessageDiv) {
                    let errorSpan = lastBotMessageDiv.querySelector('span');
                    if (errorSpan && !errorSpan.innerHTML.includes('color: #ff5555;')) {
                        errorSpan.innerHTML += (errorSpan.textContent.length > 0 ? '<br>' : '') + `<span style="color: #ff5555;">${errorMsg}</span>`;
                    } else if (!errorSpan) {
                         // Fallback if span wasn't found (shouldn't happen)
                         lastBotMessageDiv.innerHTML = `<span style="color: #ff5555;">${errorMsg}</span>`;
                    }
                     lastBotMessageDiv.querySelector('.btn-tts')?.remove(); // Remove TTS on error
              } else {
                 addMessageToUI('bot', `<span style="color: #ff5555;">${errorMsg}</span>`);
              }
        } finally { /* ... re-enable input ... */ }
     }

    // --- Event Listener & Keypress for Sending Message ---
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

    // --- ADDED: New Chat Button Functionality ---
    function startNewChat() {
        // Stop any ongoing speech synthesis
        if (synth.speaking) {
            synth.cancel();
        }
        currentUtterance = null; // Clear tracking

        // Clear message history array
        messageHistory = [];

        // Clear messages from the UI
        messagesContainer.innerHTML = '';

        // Show the welcome message again
        if (welcomeMessage) {
            welcomeMessage.style.display = 'block'; // Or 'flex' or 'inline' depending on its default
        }
         // Optional: Reset scroll position? Usually not needed if clearing content.
         // messagesContainer.scrollTop = 0;

        // Optional: Reset input field?
        // messageInput.value = '';

        // Re-enable input fields if they were disabled
        messageInput.disabled = false;
        sendButton.disabled = false;
        micButton.disabled = !recognition; // Disable mic only if not supported

        console.log("New chat started.");
    }

    if (newChatButton) {
        newChatButton.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default link behavior
            startNewChat();
        });
    }

}); // End DOMContentLoaded
