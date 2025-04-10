// Get room ID from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');

// Redirect to home if no room ID is provided
if (!roomId) {
    window.location.href = '/';
}

// Display room ID
const roomIdDisplay = document.getElementById('roomIdDisplay');
roomIdDisplay.textContent = roomId;

// Initialize Socket.IO
const socket = io({
    query: { roomId }
});

// Join room
socket.emit('joinRoom', roomId);

// Message container
const messagesContainer = document.getElementById('messages');

// Room status element
const roomStatus = document.getElementById('roomStatus');

// Handle receiving messages
socket.on('message', (data) => {
    appendMessage(data.message, data.fromSelf === socket.id);
});

// Handle user joined notification
socket.on('userJoined', (message) => {
    appendNotification(message);
    updateRoomStatus(message);
});

// Handle room full notification
socket.on('roomFull', (message) => {
    appendNotification(message);
    roomStatus.className = 'bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm';
    roomStatus.innerHTML = '<i class="fas fa-lock mr-1"></i><span>Private Chat Active</span>';
});

// Handle user left notification
socket.on('userLeft', (message) => {
    appendNotification(message);
    roomStatus.className = 'bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm';
    roomStatus.innerHTML = '<i class="fas fa-user mr-1"></i><span>Waiting for participant</span>';
});

// Handle room error (e.g., room full)
socket.on('roomError', (message) => {
    alert(message);
    window.location.href = '/';
});

// Update room status based on user joined message
function updateRoomStatus(message) {
    if (message.includes('(1/2)')) {
        roomStatus.className = 'bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm';
        roomStatus.innerHTML = '<i class="fas fa-user mr-1"></i><span>Waiting for participant</span>';
    } else if (message.includes('(2/2)')) {
        roomStatus.className = 'bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm';
        roomStatus.innerHTML = '<i class="fas fa-lock mr-1"></i><span>Private Chat Active</span>';
    }
}

// Handle sending messages
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');

messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    
    if (message) {
        // Emit message to server
        socket.emit('chatMessage', { roomId, message });
        
        // Clear input
        messageInput.value = '';
    }
});

// Function to append message to chat
function appendMessage(message, isOwnMessage = false) {
    const messageElement = document.createElement('div');
    messageElement.className = `message flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`;
    
    messageElement.innerHTML = `
        <div class="${isOwnMessage 
            ? 'bg-indigo-600 text-white' 
            : 'bg-gray-200 text-gray-800'} 
            rounded-lg px-4 py-2 max-w-[70%] break-words">
            ${escapeHtml(message)}
        </div>
    `;
    
    messagesContainer.appendChild(messageElement);
    scrollToBottom();
}

// Function to append notification
function appendNotification(message) {
    const notificationElement = document.createElement('div');
    notificationElement.className = 'flex justify-center message';
    
    notificationElement.innerHTML = `
        <div class="bg-gray-100 text-gray-600 rounded-full px-4 py-2 text-sm">
            ${escapeHtml(message)}
        </div>
    `;
    
    messagesContainer.appendChild(notificationElement);
    scrollToBottom();
}

// Function to scroll chat to bottom
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Handle copying room ID
const copyButton = document.getElementById('copyRoomId');
const copyNotification = document.getElementById('copyNotification');

copyButton.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(roomId);
        showCopyNotification();
    } catch (err) {
        console.error('Failed to copy room ID:', err);
    }
});

// Show copy notification
function showCopyNotification() {
    copyNotification.style.transform = 'translateY(0)';
    setTimeout(() => {
        copyNotification.style.transform = 'translateY(-100px)';
    }, 2000);
}

// Escape HTML to prevent XSS
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, '&#039;');
}

// Handle connection status
socket.on('connect', () => {
    appendNotification('Connected to chat');
});

socket.on('disconnect', () => {
    appendNotification('Disconnected from chat. Trying to reconnect...');
});

socket.on('connect_error', () => {
    appendNotification('Failed to connect to chat. Please check your connection.');
});

// Focus input when page loads
messageInput.focus();
