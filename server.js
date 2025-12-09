const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const os = require('os');
const cors = require('cors');

// Initialize app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.static(__dirname));

// Variables
let connectedViewers = 0;
const TARGET_FPS = 12;
const FRAME_INTERVAL = 1000 / TARGET_FPS;
let lastFrameTime = 0;

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const config of iface) {
      if (config.family === 'IPv4' && !config.internal) {
        return config.address;
      }
    }
  }
  return '127.0.0.1';
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'camera.html'));
});

app.get('/viewer.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'viewer.html'));
});

app.get('/status', (req, res) => {
  res.json({
    status: 'running',
    clients: connectedViewers,
    fps: TARGET_FPS,
    ip: getLocalIP(),
    port: PORT
  });
});

// WebSocket/Socket.io handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  socket.on('join-viewer', () => {
    connectedViewers++;
    console.log(`Viewer joined. Total viewers: ${connectedViewers}`);
    io.emit('viewer-count', connectedViewers);
  });
  
  socket.on('leave-viewer', () => {
    if (connectedViewers > 0) connectedViewers--;
    console.log(`Viewer left. Total viewers: ${connectedViewers}`);
    io.emit('viewer-count', connectedViewers);
  });
  
  socket.on('request-frame', () => {
    // We'll handle frame requests here
    const currentTime = Date.now();
    if (currentTime - lastFrameTime >= FRAME_INTERVAL) {
      lastFrameTime = currentTime;
      // In a real app, you'd send actual camera frame here
      socket.emit('frame-update', {
        timestamp: currentTime,
        frame: `data:image/svg+xml;base64,${Buffer.from(`
          <svg xmlns="http://www.w3.org/2000/svg" width="640" height="480">
            <rect width="100%" height="100%" fill="#1a1a2e"/>
            <rect x="${Date.now() % 500}" y="${Date.now() % 400}" 
                  width="200" height="150" fill="#16213e" stroke="#0f3460" stroke-width="3"/>
            <text x="50" y="100" font-family="Arial" font-size="24" fill="#e94560">
              Camera Feed - ${new Date().toLocaleTimeString()}
            </text>
            <text x="50" y="150" font-family="Arial" font-size="18" fill="#f1f1f1">
              Viewers: ${connectedViewers} | FPS: ${TARGET_FPS}
            </text>
            <circle cx="${320 + Math.sin(Date.now()/1000)*100}" 
                    cy="${240 + Math.cos(Date.now()/1000)*100}" 
                    r="50" fill="#e94560" opacity="0.7"/>
          </svg>
        `).toString('base64')}`
      });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (connectedViewers > 0) connectedViewers--;
    io.emit('viewer-count', connectedViewers);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const IP = getLocalIP();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
==================================================
CAMERA STREAMING SERVER (Node.js)
==================================================
Device A (Camera Server) IP: ${IP}
Camera Feed URL: http://${IP}:${PORT}
Viewer URL: http://${IP}:${PORT}/viewer.html
Target FPS: ${TARGET_FPS}
==================================================
Server running on port ${PORT}
==================================================
  `);
});
