import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import './App.css';

// Dynamic API & Socket URL (Localhost ya Render production automatic pick karega)
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : 'https://studysync1-xzci.onrender.com';

let socket;

function App() {
  const [view, setView] = useState('login');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [message, setMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loggedInUser, setLoggedInUser] = useState(null);

  // Dashboard & Room States
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [activeRooms, setActiveRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'whiteboard', 'files'

  // Chat States
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // File States
  const [roomFiles, setRoomFiles] = useState([]);
  const fileInputRef = useRef(null);

  // Whiteboard Canvas Ref & Drawing States
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastX = useRef(0);
  const lastY = useRef(0);

  // Initialize Socket Connection securely pointing to dynamic URL
  useEffect(() => {
    socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (view === 'dashboard') {
      fetchRooms();
    }
  }, [view]);

  // Whiteboard Drawing Function
  const drawOnCanvas = useCallback((x0, y0, x1, y1, color, emit) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.closePath();

    if (!emit || !currentRoom) return;
    socket.emit('draw_canvas', {
      roomCode: currentRoom.code,
      x0, y0, x1, y1, color
    });
  }, [currentRoom]);

  // Socket Listeners for Room (Chat, Whiteboard, Files)
  useEffect(() => {
    if (currentRoom && currentRoom.code && socket) {
      socket.emit('join_room', currentRoom.code);

      socket.off('receive_message');
      socket.on('receive_message', (data) => {
        setChatMessages((prev) => [...prev, data]);
      });

      socket.off('file_uploaded');
      socket.on('file_uploaded', (data) => {
        setRoomFiles((prev) => {
          const exists = prev.some(f => f.fileUrl === data.fileUrl);
          if (exists) return prev;
          return [...prev, data];
        });
      });

      socket.off('draw_canvas');
      socket.on('draw_canvas', (data) => {
        drawOnCanvas(data.x0, data.y0, data.x1, data.y1, data.color, false);
      });
    }

    return () => {
      if (socket) {
        socket.off('receive_message');
        socket.off('file_uploaded');
        socket.off('draw_canvas');
      }
    };
  }, [currentRoom, drawOnCanvas]);

  const fetchRooms = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms`);
      const data = await response.json();
      if (response.ok) {
        setActiveRooms(data);
      }
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage('');
    setSuccessMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      
      if (response.ok) {
        setSuccessMessage(data.message || 'Account created successfully!');
        setTimeout(() => {
          setSuccessMessage('');
          setView('login');
        }, 2000);
      } else {
        setMessage(data.message || 'Registration failed');
      }
    } catch (err) {
      setMessage('Network error: Could not connect to backend server.');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    setSuccessMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      
      if (response.ok) {
        setLoggedInUser(data.user);
        setView('dashboard');
        setMessage('');
      } else {
        setMessage(data.message || 'No account found');
      }
    } catch (err) {
      setMessage('Network error: Could not connect to backend server.');
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roomName, hostName: loggedInUser?.name }),
      });
      const data = await response.json();
      if (response.ok) {
        setRoomName('');
        setChatMessages([]);
        setRoomFiles([]);
        setCurrentRoom(data.room);
        setView('room');
      } else {
        alert('Failed to create room');
      }
    } catch (err) {
      alert('Failed to create room');
    }
  };

  const handleJoinRoomObj = (room) => {
    setChatMessages([]);
    setRoomFiles([]);
    setCurrentRoom(room);
    setView('room');
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    if (!joinCode) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms`);
      const data = await response.json();
      if (response.ok) {
        const found = data.find(r => r.code === joinCode.trim().toUpperCase());
        if (found) {
          setChatMessages([]);
          setRoomFiles([]);
          setCurrentRoom(found);
          setView('room');
          setJoinCode('');
        } else {
          alert('Invalid room code!');
        }
      }
    } catch (err) {
      alert('Error joining room');
    }
  };

  // Chat Handler (Emits message to socket room and updates local state)
  const sendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentRoom) return;
    const msgData = {
      roomCode: currentRoom.code,
      sender: loggedInUser?.name || 'User',
      text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    socket.emit('send_message', msgData);
    setChatInput('');
  };

  // Direct File Selection & Upload Handler
  const onFileSelectedChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentRoom) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        const fileData = {
          roomCode: currentRoom.code,
          fileName: data.fileName,
          fileUrl: data.fileUrl,
          uploader: loggedInUser?.name || 'Member'
        };
        socket.emit('file_uploaded', fileData);
        setRoomFiles((prev) => {
          const exists = prev.some(f => f.fileUrl === fileData.fileUrl);
          if (exists) return prev;
          return [...prev, fileData];
        });
      } else {
        alert('File upload failed');
      }
    } catch (err) {
      alert('File upload failed');
    }
    e.target.value = null;
  };

  // Whiteboard Mouse Events
  const onMouseDown = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    lastX.current = (e.clientX - rect.left) * (canvas.width / rect.width);
    lastY.current = (e.clientY - rect.top) * (canvas.height / rect.height);
  };

  const onMouseMove = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const currentY = (e.clientY - rect.top) * (canvas.height / rect.height);

    drawOnCanvas(lastX.current, lastY.current, currentX, currentY, '#38bdf8', true);
    
    lastX.current = currentX;
    lastY.current = currentY;
  };

  const onMouseUp = () => {
    setIsDrawing(false);
  };

  return (
    <div style={{ 
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', 
      background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)', 
      color: '#fff', 
      minHeight: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      padding: '20px' 
    }}>
      
      {/* 1. LOGIN PAGE */}
      {view === 'login' && (
        <div style={{ 
          background: 'rgba(30, 41, 59, 0.7)', 
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '40px 35px', 
          borderRadius: '20px', 
          width: '380px', 
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(56, 189, 248, 0.1)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '25px' }}>
            <h1 style={{ color: '#38bdf8', margin: '0 0 8px 0', fontSize: '32px', letterSpacing: '1px', fontWeight: '800' }}>StudySync</h1>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>Collaborate and Learn Together</p>
          </div>
          
          {successMessage && <p style={{ color: '#38bdf8', background: 'rgba(14, 165, 233, 0.15)', padding: '12px', borderRadius: '8px', fontSize: '14px', marginBottom: '15px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>{successMessage}</p>}
          {message && <p style={{ color: '#f87171', background: 'rgba(127, 29, 29, 0.6)', padding: '12px', borderRadius: '8px', fontSize: '14px', marginBottom: '15px', border: '1px solid rgba(248, 113, 113, 0.3)' }}>{message}</p>}
          
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required 
              style={{ padding: '14px 16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(15, 23, 42, 0.8)', color: '#fff', fontSize: '15px', outline: 'none' }}
            />
            <input 
              type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required 
              style={{ padding: '14px 16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(15, 23, 42, 0.8)', color: '#fff', fontSize: '15px', outline: 'none' }}
            />
            <button type="submit" style={{ padding: '14px', background: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)', color: '#0f172a', fontWeight: 'bold', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', boxShadow: '0 4px 15px rgba(56, 189, 248, 0.4)', marginTop: '5px' }}>
              Sign In
            </button>
          </form>
          
          <p style={{ textAlign: 'center', marginTop: '25px', fontSize: '14px', color: '#94a3b8' }}>
            Don't have an account? <span onClick={() => { setView('register'); setMessage(''); setSuccessMessage(''); }} style={{ color: '#38bdf8', cursor: 'pointer', fontWeight: '600' }}>Register now</span>
          </p>
        </div>
      )}

      {/* 2. REGISTER PAGE */}
      {view === 'register' && (
        <div style={{ 
          background: 'rgba(30, 41, 59, 0.7)', 
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '40px 35px', 
          borderRadius: '20px', 
          width: '380px', 
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(56, 189, 248, 0.1)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '25px' }}>
            <h1 style={{ color: '#38bdf8', margin: '0 0 8px 0', fontSize: '32px', letterSpacing: '1px', fontWeight: '800' }}>Create Account</h1>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>Join StudySync Hub Today</p>
          </div>
          
          {successMessage && <p style={{ color: '#38bdf8', background: 'rgba(14, 165, 233, 0.15)', padding: '12px', borderRadius: '8px', fontSize: '14px', marginBottom: '15px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>{successMessage}</p>}
          {message && <p style={{ color: '#f87171', background: 'rgba(127, 29, 29, 0.6)', padding: '12px', borderRadius: '8px', fontSize: '14px', marginBottom: '15px', border: '1px solid rgba(248, 113, 113, 0.3)' }}>{message}</p>}
          
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required 
              style={{ padding: '14px 16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(15, 23, 42, 0.8)', color: '#fff', fontSize: '15px', outline: 'none' }}
            />
            <input 
              type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required 
              style={{ padding: '14px 16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(15, 23, 42, 0.8)', color: '#fff', fontSize: '15px', outline: 'none' }}
            />
            <input 
              type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required 
              style={{ padding: '14px 16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(15, 23, 42, 0.8)', color: '#fff', fontSize: '15px', outline: 'none' }}
            />
            <button type="submit" style={{ padding: '14px', background: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)', color: '#0f172a', fontWeight: 'bold', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', boxShadow: '0 4px 15px rgba(56, 189, 248, 0.4)', marginTop: '5px' }}>
              Register Account
            </button>
          </form>
          
          <p style={{ textAlign: 'center', marginTop: '25px', fontSize: '14px', color: '#94a3b8' }}>
            Already have an account? <span onClick={() => { setView('login'); setMessage(''); setSuccessMessage(''); }} style={{ color: '#38bdf8', cursor: 'pointer', fontWeight: '600' }}>Login here</span>
          </p>
        </div>
      )}

      {/* 3. DASHBOARD PAGE */}
      {view === 'dashboard' && (
        <div style={{ width: '900px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(12px)', padding: '25px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(56, 189, 248, 0.2)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
            <div>
              <h2 style={{ color: '#38bdf8', margin: '0 0 5px 0' }}>Welcome back, {loggedInUser?.name}!</h2>
              <p style={{ color: '#94a3b8', margin: 0, fontSize: '14px' }}>Manage your study rooms or join existing collaborative hubs.</p>
            </div>
            <button 
              onClick={() => { setView('login'); setLoggedInUser(null); }} 
              style={{ padding: '10px 20px', background: 'rgba(51, 65, 85, 0.8)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              Sign Out
            </button>
          </div>

          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(12px)', padding: '25px', borderRadius: '16px', flex: 1, border: '1px solid rgba(56, 189, 248, 0.2)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
              <h4 style={{ color: '#38bdf8', margin: '0 0 15px 0', fontSize: '13px', letterSpacing: '1px' }}>CREATE STUDY ROOM</h4>
              <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input 
                  type="text" placeholder="Enter room name (e.g., BCA Group)" value={roomName} onChange={(e) => setRoomName(e.target.value)} required 
                  style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: '#0f172a', color: '#fff' }}
                />
                <button type="submit" style={{ padding: '12px', background: '#38bdf8', color: '#0f172a', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                  Initialize Room
                </button>
              </form>
            </div>

            <div style={{ background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(12px)', padding: '25px', borderRadius: '16px', flex: 1, border: '1px solid rgba(56, 189, 248, 0.2)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
              <h4 style={{ color: '#38bdf8', margin: '0 0 15px 0', fontSize: '13px', letterSpacing: '1px' }}>JOIN VIA ROOM CODE</h4>
              <form onSubmit={handleJoinByCode} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input 
                  type="text" placeholder="ENTER CODE (E.G., ABC123)" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} required 
                  style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: '#0f172a', color: '#fff' }}
                />
                <button type="submit" style={{ padding: '12px', background: '#38bdf8', color: '#0f172a', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                  Join Hub
                </button>
              </form>
            </div>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(12px)', padding: '25px', borderRadius: '16px', border: '1px solid rgba(56, 189, 248, 0.2)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
            <h4 style={{ color: '#38bdf8', margin: '0 0 15px 0', fontSize: '13px', letterSpacing: '1px' }}>
              ACTIVE COLLABORATION ROOMS ({activeRooms.length})
            </h4>
            
            {activeRooms.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>No active rooms available. Create one above!</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                {activeRooms.map((room) => (
                  <div key={room._id} style={{ background: '#0f172a', padding: '18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>{room.name}</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Host: {room.host}</p>
                    <span style={{ background: 'rgba(30, 41, 59, 0.9)', color: '#38bdf8', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', width: 'fit-content', border: '1px solid rgba(56,189,248,0.3)', fontWeight: 'bold' }}>
                      {room.code}
                    </span>
                    <button 
                      onClick={() => handleJoinRoomObj(room)}
                      style={{ marginTop: '5px', padding: '9px', background: '#38bdf8', color: '#0f172a', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                      Join Room
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* 4. STUDY ROOM VIEW */}
      {view === 'room' && currentRoom && (
        <div style={{ width: '1000px', background: 'rgba(30, 41, 59, 0.85)', backdropFilter: 'blur(16px)', borderRadius: '16px', padding: '25px', border: '1px solid rgba(56, 189, 248, 0.2)', display: 'flex', flexDirection: 'column', height: '88vh', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px', marginBottom: '15px' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <button onClick={() => setView('dashboard')} style={{ padding: '8px 16px', background: '#f87171', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                Exit Room
              </button>
              <h3 style={{ margin: 0, color: '#38bdf8' }}>Room: {currentRoom.name}</h3>
              <span style={{ background: '#0f172a', color: '#fbbf24', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', border: '1px solid rgba(251,191,36,0.3)', fontWeight: 'bold' }}>
                Code: {currentRoom.code}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setActiveTab('chat')} 
                style={{ padding: '9px 18px', background: activeTab === 'chat' ? '#38bdf8' : '#0f172a', color: activeTab === 'chat' ? '#0f172a' : '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                Chat
              </button>
              <button 
                onClick={() => setActiveTab('whiteboard')} 
                style={{ padding: '9px 18px', background: activeTab === 'whiteboard' ? '#38bdf8' : '#0f172a', color: activeTab === 'whiteboard' ? '#0f172a' : '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                Whiteboard
              </button>
              <button 
                onClick={() => setActiveTab('files')} 
                style={{ padding: '9px 18px', background: activeTab === 'files' ? '#38bdf8' : '#0f172a', color: activeTab === 'files' ? '#0f172a' : '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                Files Hub
              </button>
            </div>
          </div>

          {/* TAB 1: LIVE CHAT */}
          {activeTab === 'chat' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
              <div style={{ flex: 1, background: '#0f172a', padding: '18px', borderRadius: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                {chatMessages.length === 0 ? (
                  <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: '22vh' }}>No messages yet. Start the conversation!</p>
                ) : (
                  chatMessages.map((msg, index) => (
                    <div key={index} style={{ background: '#1e293b', padding: '12px 15px', borderRadius: '10px', maxWidth: '70%', alignSelf: msg.sender === loggedInUser?.name ? 'flex-end' : 'flex-start', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '11px', color: '#38bdf8', marginBottom: '4px', fontWeight: 'bold' }}>{msg.sender}</div>
                      <div style={{ fontSize: '14px' }}>{msg.text}</div>
                      <div style={{ fontSize: '9px', color: '#94a3b8', textAlign: 'right', marginTop: '4px' }}>{msg.time}</div>
                    </div>
                  ))
                )}
              </div>
              
              <form onSubmit={sendChatMessage} style={{ display: 'flex', gap: '12px', marginTop: '15px' }}>
                <input 
                  type="text" placeholder="Type a message..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} 
                  style={{ flex: 1, padding: '14px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: '#0f172a', color: '#fff', fontSize: '15px' }}
                />
                <button type="submit" style={{ padding: '0 28px', background: '#38bdf8', color: '#0f172a', fontWeight: 'bold', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '15px' }}>
                  Send
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: WHITEBOARD */}
          {activeTab === 'whiteboard' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', padding: '12px' }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#94a3b8' }}>Live Shared Whiteboard (Draw here, and others in this room will see it instantly)</p>
              <canvas 
                ref={canvasRef}
                width={950}
                height={450}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                style={{ background: '#ffffff', borderRadius: '8px', cursor: 'crosshair', display: 'block', margin: '0 auto' }}
              />
            </div>
          )}

          {/* TAB 3: FILES HUB */}
          {activeTab === 'files' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', background: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto' }}>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={onFileSelectedChange} 
              />

              <div style={{ background: '#1e293b', padding: '22px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <h4 style={{ margin: '0 0 5px 0', color: '#38bdf8', fontSize: '16px' }}>Upload Study Document</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Click upload to select any file from your system and share instantly.</p>
                </div>
                <button 
                  onClick={() => fileInputRef.current.click()} 
                  style={{ padding: '12px 24px', background: '#38bdf8', color: '#0f172a', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  Upload
                </button>
              </div>

              <div>
                <h4 style={{ color: '#38bdf8', marginBottom: '12px' }}>Shared Room Files ({roomFiles.length})</h4>
                {roomFiles.length === 0 ? (
                  <p style={{ color: '#94a3b8' }}>No files uploaded in this room yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {roomFiles.map((file, idx) => (
                      <div key={idx} style={{ background: '#1e293b', padding: '14px 18px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                          <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#fff', fontSize: '15px' }}>{file.fileName}</p>
                          <small style={{ color: '#94a3b8' }}>Uploaded by: {file.uploader || 'Member'}</small>
                        </div>
                        <a 
                          href={file.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ padding: '8px 16px', background: '#38bdf8', color: '#0f172a', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px' }}>
                          Open / Download
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}

App.displayName = "App";

export default App;