const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Serve static files from public directory
app.use(express.static('public'));

// Store active rooms and their participant count
const activeRooms = new Map(); // Map to store room info: roomId -> {participants: Set, count: number}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('A user connected');

    // Handle joining a room
    socket.on('joinRoom', (roomId) => {
        // Initialize room if it doesn't exist
        if (!activeRooms.has(roomId)) {
            activeRooms.set(roomId, {
                participants: new Set(),
                count: 0
            });
        }

        const room = activeRooms.get(roomId);

        // Check if room is full (2 participants max)
        if (room.count >= 2) {
            socket.emit('roomError', 'This room is full. Only 2 participants allowed.');
            return;
        }

        // Join room
        socket.join(roomId);
        room.participants.add(socket.id);
        room.count++;
        console.log(`User joined room: ${roomId} (${room.count}/2 participants)`);
        
        // Notify room about the new user
        io.to(roomId).emit('userJoined', `A new user has joined (${room.count}/2)`);

        // If room is now full, notify participants
        if (room.count === 2) {
            io.to(roomId).emit('roomFull', 'Chat room is now private with 2 participants');
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('A user disconnected');
        
        // Update room counts and cleanup
        for (const [roomId, room] of activeRooms.entries()) {
            if (room.participants.has(socket.id)) {
                room.participants.delete(socket.id);
                room.count--;
                
                // Notify remaining participant
                if (room.count > 0) {
                    io.to(roomId).emit('userLeft', 'Other participant has left the chat');
                }
                
                // Remove room if empty
                if (room.count === 0) {
                    activeRooms.delete(roomId);
                }
                
                break;
            }
        }
    });

    // Handle chat messages
    socket.on('chatMessage', ({ roomId, message }) => {
        // Broadcast to everyone in the room including sender
        // but with a flag to identify if it's their own message
        io.to(roomId).emit('message', {
            message,
            fromSelf: socket.id
        });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// Create public directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('public')) {
    fs.mkdirSync('public');
}

// Start server
const PORT = process.env.PORT || 8000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
