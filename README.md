# Chert - Real-Time Chat Application Backend API

A comprehensive, production-ready real-time chat application backend built with Node.js, Express, TypeScript, Socket.IO, and MongoDB.

## 🚀 Features

### Core Features
- ✅ User authentication (signup, login, logout, JWT)
- ✅ User profiles (name, avatar, status)
- ✅ One-to-one chats
- ✅ Group chats with admin controls
- ✅ Online/offline presence
- ✅ Typing indicators
- ✅ Message delivery status (sent, delivered, read)
- ✅ Message timestamps
- ✅ File/image uploads
- ✅ Message search
- ✅ Message reactions
- ✅ Read receipts
- ✅ Message replies

### Technical Features
- 🔒 JWT authentication with refresh tokens
- 🔐 Password hashing with bcrypt
- 🛡️ Security middleware (Helmet, CORS, rate limiting)
- ✅ Input validation with Zod
- 📝 Swagger API documentation
- 🐳 Docker support
- 📊 Winston logging
- ⚡ Real-time communication with Socket.IO
- 🗄️ MongoDB with Mongoose
- 🔴 Redis support (optional, for scaling)

## 📋 Prerequisites

- Node.js 18+ and npm
- MongoDB 5+
- Redis (optional, for Socket.IO scaling)
- Docker & Docker Compose (optional, for containerized deployment)

## 🛠️ Installation

### Local Development

1. **Clone the repository**
   ```bash
   cd chert
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure:
   ```env
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/chert
   JWT_SECRET=your-super-secret-jwt-key
   JWT_REFRESH_SECRET=your-super-secret-refresh-key
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

4. **Start MongoDB** (if not running)
   ```bash
   # macOS with Homebrew
   brew services start mongodb-community
   
   # Or use Docker
   docker run -d -p 27017:27017 --name mongodb mongo:7
   ```

5. **Start Redis** (optional)
   ```bash
   # macOS with Homebrew
   brew services start redis
   
   # Or use Docker
   docker run -d -p 6379:6379 --name redis redis:7-alpine
   ```

6. **Run the development server**
   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:3000`

### Docker Deployment

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **View logs**
   ```bash
   docker-compose logs -f app
   ```

3. **Stop services**
   ```bash
   docker-compose down
   ```

## 📚 API Documentation

### Swagger UI

Once the server is running, visit:
- **Swagger UI**: http://localhost:3000/api-docs
- **Swagger JSON**: http://localhost:3000/api-docs.json

### API Endpoints

#### Authentication
- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

#### Users
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update current user profile
- `GET /api/users/search?q=query` - Search users
- `GET /api/users/:id` - Get user by ID

#### Chats
- `POST /api/chats` - Create a chat (one-to-one or group)
- `GET /api/chats` - Get all user's chats
- `GET /api/chats/:id` - Get chat by ID
- `PUT /api/chats/:id` - Update group chat
- `POST /api/chats/:id/participants` - Add participants to group
- `DELETE /api/chats/:id/participants/:participantId` - Remove participant
- `DELETE /api/chats/:id` - Delete chat

#### Messages
- `POST /api/messages` - Send a message
- `GET /api/messages/chat/:chatId` - Get messages in a chat (paginated)
- `GET /api/messages/:id` - Get message by ID
- `PUT /api/messages/:id` - Update message
- `DELETE /api/messages/:id` - Delete message
- `POST /api/messages/:chatId/read` - Mark messages as read
- `GET /api/messages/search/:chatId?q=query` - Search messages
- `POST /api/messages/:id/reactions` - Add reaction to message
- `DELETE /api/messages/:id/reactions` - Remove reaction

#### File Upload
- `POST /api/files/upload` - Upload a file/image

## 🔌 WebSocket Events

### Client → Server Events

- `join_chat` - Join a chat room
  ```json
  { "chatId": "chat_id" }
  ```

- `leave_chat` - Leave a chat room
  ```json
  { "chatId": "chat_id" }
  ```

- `send_message` - Send a message
  ```json
  {
    "chatId": "chat_id",
    "content": "Message text",
    "type": "text",
    "replyTo": "message_id" // optional
  }
  ```

- `typing` - Indicate user is typing
  ```json
  { "chatId": "chat_id" }
  ```

- `stop_typing` - Stop typing indicator
  ```json
  { "chatId": "chat_id" }
  ```

- `read_message` - Mark messages as read
  ```json
  {
    "chatId": "chat_id",
    "messageIds": ["msg1", "msg2"] // optional, marks all if not provided
  }
  ```

- `presence_update` - Update presence status
  ```json
  { "status": "away" }
  ```

### Server → Client Events

- `joined_chat` - Confirmation of joining chat
- `left_chat` - Confirmation of leaving chat
- `new_message` - New message received
- `message_sent` - Confirmation of message sent
- `user_typing` - User is typing
- `user_stop_typing` - User stopped typing
- `messages_read` - Messages marked as read
- `user_online` - User came online
- `user_offline` - User went offline
- `user_presence` - User presence updated
- `error` - Error occurred

### Socket.IO Connection

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your_jwt_token'
  }
});

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('new_message', (data) => {
  console.log('New message:', data.message);
});
```

## 🏗️ Project Structure

```
chert/
├── src/
│   ├── modules/
│   │   ├── auth/          # Authentication module
│   │   ├── users/          # Users module
│   │   ├── chats/          # Chats module
│   │   └── messages/       # Messages module
│   ├── sockets/            # Socket.IO handlers
│   ├── middlewares/        # Express middlewares
│   ├── config/             # Configuration files
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript types
│   ├── app.ts              # Express app setup
│   └── server.ts           # Server entry point
├── uploads/                # Uploaded files directory
├── dist/                   # Compiled JavaScript
├── Dockerfile
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

## 🔒 Security Features

- JWT authentication with refresh tokens
- Password hashing with bcrypt (12 rounds)
- Rate limiting on API endpoints
- Input validation with Zod
- Helmet for security headers
- CORS configuration
- XSS protection
- NoSQL injection protection

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run with coverage
npm run test:coverage
```

## 📝 Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## 🚀 Deployment

### Production Checklist

1. Set `NODE_ENV=production`
2. Use strong JWT secrets
3. Configure CORS properly
4. Set up HTTPS
5. Use environment variables for sensitive data
6. Enable Redis for Socket.IO scaling
7. Set up proper logging
8. Configure rate limiting
9. Set up monitoring (e.g., Sentry)
10. Use PM2 or similar for process management

### PM2 Example

```bash
npm install -g pm2
pm2 start dist/server.js --name chert-api
pm2 save
pm2 startup
```

## 📊 Database Models

### User
- `username` (unique)
- `email` (unique)
- `password` (hashed)
- `avatar`
- `status`
- `isOnline`
- `lastSeen`

### Chat
- `isGroup` (boolean)
- `name` (for groups)
- `description` (for groups)
- `avatar` (for groups)
- `participants` (array of User IDs)
- `admin` (for groups)
- `lastMessage` (reference to Message)

### Message
- `chatId` (reference to Chat)
- `senderId` (reference to User)
- `content`
- `type` (text/image/file)
- `status` (sent/delivered/read)
- `fileUrl`
- `fileName`
- `fileSize`
- `readBy` (array of User IDs)
- `reactions` (array of {userId, emoji})
- `replyTo` (reference to Message)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License

## 🆘 Support

For issues and questions, please open an issue on GitHub.

## 🎯 Roadmap

- [ ] End-to-end encryption
- [ ] Voice/video calls (WebRTC)
- [ ] Bots & integrations
- [ ] AI moderation
- [ ] Analytics dashboard
- [ ] Push notifications
- [ ] Message encryption at rest
- [ ] Advanced search filters
- [ ] Message editing history
- [ ] Chat archiving

---

Built with ❤️ using Node.js, Express, TypeScript, Socket.IO, and MongoDB

