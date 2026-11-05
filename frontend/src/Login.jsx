import React, { useState } from 'react';

function Login({ onLoginSuccess, switchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      
      if (response.ok) {
        onLoginSuccess(data.user);
      } else {
        setErrorMsg(data.message || 'Login failed');
      }
    } catch (err) {
      setErrorMsg('Network error: Could not connect to backend server.');
    }
  };

  return (
    <div style={{ background: 'rgba(30, 41, 59, 0.7)', padding: '40px 35px', borderRadius: '20px', width: '380px', textAlign: 'center', color: '#fff', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
      <h1 style={{ color: '#38bdf8', marginBottom: '8px' }}>StudySync</h1>
      <p style={{ color: '#94a3b8', marginBottom: '25px' }}>Collaborate and Learn Together</p>
      
      {errorMsg && <p style={{ color: '#f87171', background: 'rgba(127, 29, 29, 0.6)', padding: '10px', borderRadius: '8px', fontSize: '14px' }}>{errorMsg}</p>}
      
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required 
          style={{ padding: '14px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.8)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.1)', outline: 'none' }}
        />
        <input 
          type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required 
          style={{ padding: '14px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.8)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.1)', outline: 'none' }}
        />
        <button type="submit" style={{ padding: '14px', background: '#38bdf8', color: '#0f172a', fontWeight: 'bold', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
          Sign In
        </button>
      </form>
      
      <p style={{ marginTop: '20px', fontSize: '14px', color: '#94a3b8' }}>
        Don't have an account? <span onClick={switchToRegister} style={{ color: '#38bdf8', cursor: 'pointer', fontWeight: '600' }}>Register now</span>
      </p>
    </div>
  );
}

export default Login;