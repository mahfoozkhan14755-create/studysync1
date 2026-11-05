import React, { useState } from 'react';

const API_BASE_URL = 'https://studysync1-xzci.onrender.com';

function Register({ switchToLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      
      if (response.ok) {
        setIsSuccess(true);
        setMsg(data.message);
        setTimeout(() => switchToLogin(), 2000);
      } else {
        setIsSuccess(false);
        setMsg(data.message || 'Registration failed');
      }
    } catch (err) {
      setIsSuccess(false);
      setMsg('Network error: Could not connect to backend server.');
    }
  };

  return (
    <div style={{ background: 'rgba(30, 41, 59, 0.7)', padding: '40px 35px', borderRadius: '20px', width: '380px', textAlign: 'center', color: '#fff', border: '1px solid rgba(74, 222, 128, 0.2)' }}>
      <h1 style={{ color: '#4ade80', marginBottom: '8px' }}>Create Account</h1>
      <p style={{ color: '#94a3b8', marginBottom: '25px' }}>Join StudySync Hub Today</p>
      
      {msg && <p style={{ color: isSuccess ? '#4ade80' : '#f87171', background: isSuccess ? 'rgba(6, 78, 59, 0.6)' : 'rgba(127, 29, 29, 0.6)', padding: '10px', borderRadius: '8px', fontSize: '14px' }}>{msg}</p>}
      
      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required 
          style={{ padding: '14px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.8)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.1)', outline: 'none' }}
        />
        <input 
          type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required 
          style={{ padding: '14px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.8)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.1)', outline: 'none' }}
        />
        <input 
          type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required 
          style={{ padding: '14px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.8)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.1)', outline: 'none' }}
        />
        <button type="submit" style={{ padding: '14px', background: '#4ade80', color: '#064e3b', fontWeight: 'bold', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
          Register Account
        </button>
      </form>
      
      <p style={{ marginTop: '20px', fontSize: '14px', color: '#94a3b8' }}>
        Already have an account? <span onClick={switchToLogin} style={{ color: '#4ade80', cursor: 'pointer', fontWeight: '600' }}>Login here</span>
      </p>
    </div>
  );
}

export default Register;