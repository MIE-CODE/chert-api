# Chert API - Complete Endpoints List

## Base URL
```
http://localhost:3000
```

## Authentication
All endpoints require authentication unless specified. Include JWT token in Authorization header:
```
Authorization: Bearer <token>
```

---

## 🔐 Authentication Endpoints (`/api/auth`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/auth/signup` | ❌ | Register a new user |
| POST | `/api/auth/login` | ❌ | Login user and get tokens |
| POST | `/api/auth/refresh-token` | ❌ | Refresh access token |
| POST | `/api/auth/logout` | ✅ | Logout user |
| GET | `/api/auth/me` | ✅ | Get current authenticated user |

### Request/Response Examples

#### POST `/api/auth/signup`
```json
// Request
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123"
}

// Response
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": { ... },
    "token": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

#### POST `/api/auth/login`
```json
// Request
{
  "email": "john@example.com",
  "password": "password123"
}

// Response
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

---

## 👤 User Endpoints (`/api/users`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/users/me` | ✅ | Get current user profile |
| PUT | `/api/users/me` | ✅ | Update current user profile |
| GET | `/api/users/search?q=query` | ✅ | Search users by username/email |
| GET | `/api/users/:id` | ✅ | Get user by ID |

### Request/Response Examples

#### PUT `/api/users/me`
```json
// Request
{
  "username": "newusername",
  "status": "Available",
  "avatar": "https://example.com/avatar.jpg"
}
```

#### GET `/api/users/search?q=john`
```json
// Response
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "...",
        "username": "johndoe",
        "avatar": "...",
        "status": "...",
        "isOnline": true,
        "lastSeen": "..."
      }
    ]
  }
}
```

---

## 💬 Chat Endpoints (`/api/chats`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/chats` | ✅ | Create a chat (one-to-one or group) |
| GET | `/api/chats` | ✅ | Get all user's chats |
| GET | `/api/chats/:id` | ✅ | Get chat by ID |
| PUT | `/api/chats/:id` | ✅ | Update group chat (admin only) |
| POST | `/api/chats/:id/participants` | ✅ | Add participants to group (admin only) |
| DELETE | `/api/chats/:id/participants/:participantId` | ✅ | Remove participant from group |
| DELETE | `/api/chats/:id` | ✅ | Delete chat (admin only for groups) |

### Request/Response Examples

#### POST `/api/chats` - Create One-to-One Chat
```json
// Request
{
  "participantIds": ["user_id_2"],
  "isGroup": false
}
```

#### POST `/api/chats` - Create Group Chat
```json
// Request
{
  "participantIds": ["user_id_2", "user_id_3"],
  "isGroup": true,
  "name": "Project Team",
  "description": "Team discussion"
}
```

#### PUT `/api/chats/:id`
```json
// Request
{
  "name": "Updated Group Name",
  "description": "Updated description",
  "avatar": "https://example.com/avatar.jpg"
}
```

#### POST `/api/chats/:id/participants`
```json
// Request
{
  "participantIds": ["user_id_4", "user_id_5"]
}
```

---

## 📨 Message Endpoints (`/api/messages`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/messages` | ✅ | Send a message |
| GET | `/api/messages/chat/:chatId?page=1&limit=50` | ✅ | Get messages in a chat (paginated) |
| GET | `/api/messages/:id` | ✅ | Get message by ID |
| PUT | `/api/messages/:id` | ✅ | Update message (sender only) |
| DELETE | `/api/messages/:id` | ✅ | Delete message (sender or admin) |
| POST | `/api/messages/:chatId/read` | ✅ | Mark all messages in chat as read |
| GET | `/api/messages/search/:chatId?q=query` | ✅ | Search messages in a chat |
| POST | `/api/messages/:id/reactions` | ✅ | Add reaction to message |
| DELETE | `/api/messages/:id/reactions` | ✅ | Remove reaction from message |

### Request/Response Examples

#### POST `/api/messages` - Text Message
```json
// Request
{
  "chatId": "chat_id",
  "content": "Hello, world!",
  "type": "text",
  "replyTo": "message_id" // optional
}
```

#### POST `/api/messages` - Image/File Message
```json
// Request
{
  "chatId": "chat_id",
  "type": "image", // or "file"
  "fileUrl": "/uploads/file-123.jpg",
  "fileName": "photo.jpg",
  "fileSize": 1024000
}
```

#### GET `/api/messages/chat/:chatId?page=1&limit=50`
```json
// Response
{
  "success": true,
  "data": {
    "messages": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "pages": 3
    }
  }
}
```

#### POST `/api/messages/:id/reactions`
```json
// Request
{
  "emoji": "👍"
}
```

---

## 📁 File Upload Endpoints (`/api/files`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/files/upload` | ✅ | Upload a file or image |

### Request/Response Examples

#### POST `/api/files/upload`
```javascript
// Form Data
Content-Type: multipart/form-data
file: <file>

// Response
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "fileUrl": "/uploads/file-123.jpg",
    "fileName": "photo.jpg",
    "fileSize": 1024000,
    "fileType": "image",
    "mimeType": "image/jpeg"
  }
}
```

---

## 🏥 System Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/health` | ❌ | Health check endpoint |
| GET | `/api-docs` | ❌ | Swagger UI documentation |
| GET | `/api-docs.json` | ❌ | Swagger JSON specification |

---

## 🔌 WebSocket Events (Socket.IO)

### Connection
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### Client → Server Events

| Event | Description | Payload |
|-------|-------------|---------|
| `join_chat` | Join a chat room | `{ chatId: string }` |
| `leave_chat` | Leave a chat room | `{ chatId: string }` |
| `send_message` | Send a message | `{ chatId, content?, type?, fileUrl?, fileName?, fileSize?, replyTo? }` |
| `typing` | Indicate user is typing | `{ chatId: string }` |
| `stop_typing` | Stop typing indicator | `{ chatId: string }` |
| `read_message` | Mark messages as read | `{ chatId: string, messageIds?: string[] }` |
| `presence_update` | Update presence status | `{ status: string }` |

### Server → Client Events

| Event | Description | Payload |
|-------|-------------|---------|
| `connect` | Socket connected | - |
| `disconnect` | Socket disconnected | - |
| `joined_chat` | Confirmation of joining chat | `{ chatId: string }` |
| `left_chat` | Confirmation of leaving chat | `{ chatId: string }` |
| `new_message` | New message received | `{ message: MessageObject }` |
| `message_sent` | Confirmation of message sent | `{ messageId: string, chatId: string }` |
| `user_typing` | User is typing | `{ chatId, userId, username }` |
| `user_stop_typing` | User stopped typing | `{ chatId, userId, username }` |
| `messages_read` | Messages marked as read | `{ chatId, userId, username }` |
| `user_online` | User came online | `{ userId, username, chatId }` |
| `user_offline` | User went offline | `{ userId, username, chatId }` |
| `user_presence` | User presence updated | `{ userId, username, status, chatId }` |
| `error` | Error occurred | `{ message: string }` |

### WebSocket Event Examples

#### Send Message via WebSocket
```javascript
socket.emit('send_message', {
  chatId: 'chat_id',
  content: 'Hello!',
  type: 'text'
});

socket.on('new_message', (data) => {
  console.log('New message:', data.message);
});
```

#### Typing Indicator
```javascript
socket.emit('typing', { chatId: 'chat_id' });

socket.on('user_typing', (data) => {
  console.log(`${data.username} is typing...`);
});

// Stop typing after 3 seconds
setTimeout(() => {
  socket.emit('stop_typing', { chatId: 'chat_id' });
}, 3000);
```

#### Read Receipts
```javascript
socket.emit('read_message', {
  chatId: 'chat_id',
  messageIds: ['msg1', 'msg2'] // optional
});
```

---

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [ // for validation errors
    {
      "path": "body.email",
      "message": "Invalid email format"
    }
  ]
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

---

## 🔒 Authentication Flow

1. **Signup/Login** → Get `token` and `refreshToken`
2. **Include token** in `Authorization: Bearer <token>` header
3. **Token expires** → Use `refreshToken` to get new token via `/api/auth/refresh-token`
4. **WebSocket** → Include token in connection auth: `io({ auth: { token } })`

---

## 📝 Notes

- All timestamps are in ISO 8601 format
- File uploads are limited to 10MB by default
- Rate limiting: 100 requests per 15 minutes per IP
- Auth endpoints: 5 requests per 15 minutes per IP
- Pagination defaults: page=1, limit=50
- Message types: `text`, `image`, `file`
- Message statuses: `sent`, `delivered`, `read`

---

## 🚀 Quick Reference

### Most Common Endpoints
- `POST /api/auth/login` - Login
- `GET /api/chats` - Get all chats
- `GET /api/messages/chat/:chatId` - Get messages
- `POST /api/messages` - Send message
- `POST /api/files/upload` - Upload file

### WebSocket Events
- `send_message` - Send message
- `new_message` - Receive message
- `typing` / `stop_typing` - Typing indicators
- `read_message` - Mark as read

