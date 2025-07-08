const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const roleRoutes = require('./routes/roleRoutes');
const friendshipRoutes = require('./routes/friendshipRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const reportRoutes = require('./routes/reportRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const errorHandler = require('./middleware/errorHandler');
const { setupInactiveUsersCron } = require('./services/cronService');
const { setupSocket } = require('./socket');

const app = express();
const server = http.createServer(app);

// Thiết lập Socket.IO
const io = setupSocket(server);
// Chia sẻ io với các module khác
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files từ client/dist
const distPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(distPath));

// Middleware để ghi log request
app.use((req, res, next) => {
  if (req.method !== 'GET' && !(req.method === 'POST' && req.url.includes('/api/user/update-status'))) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/role', roleRoutes);
app.use('/api/friendship', friendshipRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/announcement', announcementRoutes);
app.use('/api/upload', uploadRoutes);

// SPA Fallback - serve index.html cho tất cả routes không phải API
app.get('*', (req, res) => {
    // Nếu là API route, trả về 404
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ message: 'API route not found' });
    }
    // Serve index.html cho các route frontend
    res.sendFile(path.join(distPath, 'index.html'));
});

// Error Handler
app.use(errorHandler);

// Khởi động server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server đang chạy trên cổng ${PORT} 🚀`);
    console.log(`📁 Serving static files from: ${distPath}`);
    setupInactiveUsersCron();
});
