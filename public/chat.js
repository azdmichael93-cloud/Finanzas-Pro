// public/chat.js

document.addEventListener('DOMContentLoaded', () => {
    const chatButton = document.querySelector('.chat-button');
    const chatModal = document.querySelector('.chat-modal');
    const closeButton = document.querySelector('.close-button');
    const chatMessages = document.querySelector('.chat-messages');
    const chatInput = document.querySelector('.chat-input');
    const chatSend = document.querySelector('.chat-send');

    // Open the chat modal
    chatButton.addEventListener('click', () => {
        chatModal.style.display = 'block';
    });

    // Close the chat modal
    closeButton.addEventListener('click', () => {
        chatModal.style.display = 'none';
    });

    // Function to add a message to the chat
    function addMessage(message, isUser) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(isUser ? 'user-message' : 'bot-message');
        messageElement.textContent = message;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to bottom
    }

    // Send message to the server
    chatSend.addEventListener('click', () => {
        const message = chatInput.value.trim();
        if (message) {
            addMessage(message, true); // Add user message to chat
            chatInput.value = ''; // Clear the input

            // Send message to the server
            fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: message })
            })
            .then(response => response.json())
            .then(data => {
                addMessage(data.response, false); // Add bot message to chat
            })
            .catch(error => {
                console.error('Error:', error);
                addMessage('Sorry, I couldn't connect to the server.', false);
            });
        }
    });

    // Handle Enter key press in the input field
    chatInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            chatSend.click(); // Trigger the send button click
            event.preventDefault(); // Prevent form submission
        }
    });
});