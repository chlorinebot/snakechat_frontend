const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Health check endpoint (must be before static middleware)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'snakechat-frontend'
  });
});

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'client/dist')));

// API proxy routes (if needed)
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found. Make sure backend is running.' });
});

// Serve React app for all other routes (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Frontend server running on port ${PORT}`);
  console.log(`📱 Access at: http://localhost:${PORT}`);
}); 