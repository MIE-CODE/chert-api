# WebSocket (Socket.IO) Connection Guide

This guide explains how to connect your frontend application to the Chert API WebSocket server.

## Connection Details

- **Protocol**: Socket.IO v4
- **Port**: Same as HTTP server (no separate port needed)
- **Development URL**: `http://localhost:3000`
- **Production URL**: `https://chert-api.onrender.com` (uses HTTPS/WSS automatically)
- **CORS**: Enabled for all origins
- **Authentication**: Required via JWT token

> **Important**: 
> - Socket.IO automatically uses **WSS** (WebSocket Secure) when connecting to HTTPS URLs
> - No need to specify `wss://` - just use `https://chert-api.onrender.com`
> - Use the `API_URI` environment variable in your frontend to configure the server URL dynamically

## Frontend Connection Example

### JavaScript/TypeScript (Browser)

```javascript
import { io } from 'socket.io-client';

// Get server URL from environment variable or use default
const API_URI = process.env.API_URI || 'http://localhost:3000';
// Production: https://chert-api.onrender.com (Socket.IO will use WSS automatically)
// Development: http://localhost:3000

// Get your JWT token from login/signup response
const token = localStorage.getItem('token'); // or from your auth state

// Connect to Socket.IO server
const socket = io(API_URI, {
  auth: {
    token: token // Pass token in auth object
  },
  // Alternative: You can also pass token in headers
  // extraHeaders: {
  //   Authorization: `Bearer ${token}`
  // },
  transports: ['websocket', 'polling'], // Allow both transports
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});

// Connection event handlers
socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
  console.log('Socket ID:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  // Common errors:
  // - "Authentication error: No token provided" - Token missing
  // - "Authentication error: Invalid token" - Token expired or invalid
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  // Will automatically reconnect if reconnection is enabled
});
```

### React Example

```tsx
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

function useSocket(token: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    // Get server URL from environment variable
    const API_URI = import.meta.env.VITE_API_URI || process.env.REACT_APP_API_URI || 'http://localhost:3000';
    // Production: https://chert-api.onrender.com (Socket.IO automatically uses WSS)

    // Create socket connection
    const newSocket = io(API_URI, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    // Connection handlers
    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
      setIsConnected(false);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, [token]);

  return { socket, isConnected };
}

// Usage in component
function ChatComponent() {
  const token = localStorage.getItem('token');
  const { socket, isConnected } = useSocket(token);

  useEffect(() => {
    if (!socket) return;

    // Listen for new messages
    socket.on('new_message', (data) => {
      console.log('New message:', data.message);
      // Update your chat UI
    });

    // Listen for typing indicators
    socket.on('user_typing', (data) => {
      console.log('User typing:', data.username);
    });

    socket.on('user_stop_typing', (data) => {
      console.log('User stopped typing:', data.username);
    });

    // Listen for online/offline status
    socket.on('user_online', (data) => {
      console.log('User online:', data.username);
    });

    socket.on('user_offline', (data) => {
      console.log('User offline:', data.username);
    });

    // Listen for new chat notifications
    socket.on('new_chat', (data) => {
      console.log('New chat created:', data.chatId);
      console.log('Notification message:', data.message);
    });

    return () => {
      socket.off('new_message');
      socket.off('user_typing');
      socket.off('user_stop_typing');
      socket.off('user_online');
      socket.off('user_offline');
      socket.off('new_chat');
    };
  }, [socket]);

  return (
    <div>
      <p>Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</p>
      {/* Your chat UI */}
    </div>
  );
}
```

## Socket Events

### Client → Server Events (Emit)

#### 1. Join Chat Room
```javascript
socket.emit('join_chat', { chatId: 'chat-id-here' });
// Response: socket.on('joined_chat', { chatId })
```

#### 2. Leave Chat Room
```javascript
socket.emit('leave_chat', { chatId: 'chat-id-here' });
// Response: socket.on('left_chat', { chatId })
```

#### 3. Send Message
```javascript
socket.emit('send_message', {
  chatId: 'chat-id-here',
  content: 'Hello, world!',
  type: 'text', // 'text' | 'image' | 'file'
  fileUrl: 'https://example.com/file.jpg', // Optional, for image/file types
  fileName: 'image.jpg', // Optional
  fileSize: 1024, // Optional
  replyTo: 'message-id-here' // Optional, for replies
});

// Response: socket.on('message_sent', { messageId, chatId })
```

#### 4. Typing Indicator
```javascript
// User starts typing
socket.emit('typing', { chatId: 'chat-id-here' });

// User stops typing
socket.emit('stop_typing', { chatId: 'chat-id-here' });
```

#### 5. Mark Messages as Read
```javascript
// Mark specific messages as read
socket.emit('read_message', {
  chatId: 'chat-id-here',
  messageIds: ['message-id-1', 'message-id-2'] // Optional
});

// If messageIds not provided, marks all unread messages in chat as read
socket.emit('read_message', { chatId: 'chat-id-here' });
```

#### 6. Update Presence
```javascript
socket.emit('presence_update', { status: 'available' });
```

### Server → Client Events (Listen)

#### 1. New Message
```javascript
socket.on('new_message', (data) => {
  const { message } = data;
  // message object contains:
  // - _id, chatId, senderId, content, type, status
  // - fileUrl, fileName, fileSize (if file/image)
  // - readBy, reactions, replyTo
  // - createdAt, updatedAt
  // - senderId is populated with username, avatar
});
```

#### 2. Message Sent Confirmation
```javascript
socket.on('message_sent', (data) => {
  const { messageId, chatId } = data;
  // Confirmation that your message was sent
});
```

#### 3. User Typing
```javascript
socket.on('user_typing', (data) => {
  const { chatId, userId, username } = data;
  // Show typing indicator for this user
});
```

#### 4. User Stopped Typing
```javascript
socket.on('user_stop_typing', (data) => {
  const { chatId, userId, username } = data;
  // Hide typing indicator for this user
});
```

#### 5. Messages Read
```javascript
socket.on('messages_read', (data) => {
  const { chatId, userId, username } = data;
  // Update read receipts in UI
});
```

#### 6. User Online
```javascript
socket.on('user_online', (data) => {
  const { userId, username, chatId } = data;
  // Update user online status in UI
});
```

#### 7. User Offline
```javascript
socket.on('user_offline', (data) => {
  const { userId, username, chatId } = data;
  // Update user offline status in UI
});
```

#### 8. New Chat Notification
```javascript
socket.on('new_chat', (data) => {
  const { chatId, message, sender } = data;
  // Notification when someone starts a chat with you
  // message: The welcome message
  // sender: { id, username, avatar }
});
```

#### 9. User Presence Update
```javascript
socket.on('user_presence', (data) => {
  const { userId, username, status, chatId } = data;
  // User presence status changed
});
```

#### 10. Error Events
```javascript
socket.on('error', (data) => {
  const { message } = data;
  // Handle errors like:
  // - "Chat not found or access denied"
  // - "Content is required for text messages"
  // - "Failed to send message"
});
```

## Connection Flow

1. **User logs in/signs up** → Receives JWT token
2. **Frontend connects to Socket.IO** → Passes token in `auth.token`
3. **Server validates token** → Authenticates user
4. **Connection established** → User automatically joins all their chat rooms
5. **User can now send/receive messages** → Real-time communication active

## Automatic Features

When a user connects, the server automatically:
- ✅ Joins the user to all their existing chat rooms
- ✅ Updates user's online status in database
- ✅ Notifies all chat participants that user is online
- ✅ Enables real-time messaging for all chats

## Error Handling

### Authentication Errors
```javascript
socket.on('connect_error', (error) => {
  if (error.message.includes('Authentication')) {
    // Token expired or invalid
    // Redirect to login or refresh token
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
});
```

### Reconnection
Socket.IO automatically handles reconnection. You can customize:
```javascript
const socket = io('http://localhost:3000', {
  reconnection: true,
  reconnectionDelay: 1000, // Wait 1s before reconnecting
  reconnectionDelayMax: 5000, // Max wait 5s
  reconnectionAttempts: Infinity, // Keep trying
});
```

## Production Considerations

1. **Use Environment Variables**: 
   - Set `API_URI=https://chert-api.onrender.com` in your frontend environment
   - Use `process.env.API_URI` or `import.meta.env.VITE_API_URI` (Vite) or `process.env.REACT_APP_API_URI` (Create React App)
2. **HTTPS/WSS**: 
   - Production URL: `https://chert-api.onrender.com`
   - Socket.IO automatically uses **WSS** (WebSocket Secure) when connecting to HTTPS URLs
   - **No need to specify `wss://`** - just use `https://chert-api.onrender.com`
   - Socket.IO client will automatically upgrade to secure WebSocket
3. **Token Refresh**: Implement token refresh logic for long-lived connections
4. **Error Handling**: Add comprehensive error handling and user feedback
5. **Connection Status**: Show connection status to users
6. **Render.com Specific**: 
   - Render.com automatically handles HTTPS/WSS
   - No additional configuration needed for secure connections
   - WebSocket connections work seamlessly with the HTTPS endpoint
   - Socket.IO will automatically use the correct transport (WSS for HTTPS)

## Example: Complete Chat Integration

```javascript
class ChatManager {
  constructor(serverUrl, token) {
    this.socket = io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('Connected');
      this.onConnect();
    });

    this.socket.on('new_message', (data) => {
      this.onNewMessage(data.message);
    });

    this.socket.on('user_typing', (data) => {
      this.onUserTyping(data);
    });

    this.socket.on('error', (data) => {
      this.onError(data.message);
    });
  }

  joinChat(chatId) {
    this.socket.emit('join_chat', { chatId });
  }

  sendMessage(chatId, content, type = 'text') {
    this.socket.emit('send_message', {
      chatId,
      content,
      type,
    });
  }

  startTyping(chatId) {
    this.socket.emit('typing', { chatId });
  }

  stopTyping(chatId) {
    this.socket.emit('stop_typing', { chatId });
  }

  markAsRead(chatId, messageIds = null) {
    this.socket.emit('read_message', {
      chatId,
      messageIds,
    });
  }

  onConnect() {
    // Handle connection
  }

  onNewMessage(message) {
    // Handle new message
  }

  onUserTyping(data) {
    // Handle typing indicator
  }

  onError(message) {
    // Handle error
  }

  disconnect() {
    this.socket.disconnect();
  }
}

// Usage
const API_URI = process.env.API_URI || 'http://localhost:3000';
const chatManager = new ChatManager(API_URI, token);
```

## Troubleshooting

### Connection Fails
- ✅ Check if token is valid and not expired
- ✅ Verify server is running on correct port
- ✅ Check CORS settings (should allow all origins)
- ✅ Check browser console for errors
- ✅ Try using `polling` transport only: `transports: ['polling']`
- ✅ For production: Ensure `API_URI` is set to `https://chert-api.onrender.com`
- ✅ Check if Render.com service is running and not sleeping (free tier may sleep after inactivity)

### Messages Not Received
- ✅ Ensure user has joined the chat room: `socket.emit('join_chat', { chatId })`
- ✅ Verify user is a participant in the chat
- ✅ Check if socket is connected: `socket.connected`

### Authentication Errors
- ✅ Token must be passed in `auth.token` or `Authorization` header
- ✅ Token must be valid JWT from login/signup
- ✅ Token must not be expired

## Environment Variables

### Frontend Configuration

Create a `.env` file in your frontend project:

```env
# Development
API_URI=http://localhost:3000

# Production
API_URI=https://chert-api.onrender.com
```

### Framework-Specific Examples

**Vite (Vue/React):**
```env
VITE_API_URI=https://chert-api.onrender.com
```
```javascript
const API_URI = import.meta.env.VITE_API_URI;
```

**Create React App:**
```env
REACT_APP_API_URI=https://chert-api.onrender.com
```
```javascript
const API_URI = process.env.REACT_APP_API_URI;
```

**Next.js:**
```env
NEXT_PUBLIC_API_URI=https://chert-api.onrender.com
```
```javascript
const API_URI = process.env.NEXT_PUBLIC_API_URI;
```

**Vanilla JavaScript:**
```javascript
// Use environment variable or fallback
const API_URI = window.API_URI || 'https://chert-api.onrender.com';
```

## Support

For issues or questions, check the main README or API documentation.

**Production Server**: https://chert-api.onrender.com

