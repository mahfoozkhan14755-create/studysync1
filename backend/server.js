const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const User = require('./models/User');
const Room = require('./models/Room');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Setup for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// REGISTER API (MongoDB mein data save karne ke liye)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already registered! Please login.' });
    }

    // Create new user and save to MongoDB
    const newUser = new User({ name, email, password });
    await newUser.save();
    
    res.status(201).json({ message: 'Account created and saved to database successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// LOGIN API (MongoDB se user verify karne ke liye)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'No account found with this email' });
    }
    if (user.password !== password) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    res.status(200).json({ message: 'Login successful', user });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// CREATE ROOM API
app.post('/api/rooms/create', async (req, res) => {
  try {
    const { name, hostName } = req.body;
    const code = Math.random().toString(36).substring(2, 9).toUpperCase();
    const newRoom = new Room({ name, code, host: hostName });
    await newRoom.save();
    res.status(201).json({ message: 'Room created successfully', room: newRoom });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// GET ALL ACTIVE ROOMS API
app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await Room.find().sort({ createdAt: -1 });
    res.status(200).json(rooms);
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// FILE UPLOAD API
app.post('/api/rooms/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    res.status(200).json({ 
      fileName: req.file.originalname, 
      fileUrl: fileUrl 
    });
  } catch (err) {
    res.status(500).json({ message: 'Upload error: ' + err.message });
  }
});

// Test Route
app.get('/', (req, res) => {
  res.send('StudySync1 API Server Running Successfully!');
});

// Socket.io Real-time Collaboration
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', (roomCode) => {
    socket.join(roomCode);
  });

  socket.on('send_message', (data) => {
    io.to(data.roomCode).emit('receive_message', data);
  });

  socket.on('draw_canvas', (data) => {
    socket.to(data.roomCode).emit('draw_canvas', data);
  });

  socket.on('file_uploaded', (data) => {
    socket.to(data.roomCode).emit('file_uploaded', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});