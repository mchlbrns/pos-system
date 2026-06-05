import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import api from '../services/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const { user, setUser, setCurrentBusiness } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.post('/auth/login', { username, password });
      const { token, user: loggedUser, business } = res.data;
      localStorage.setItem('pos-token', token);
      setUser(loggedUser, token);
      setCurrentBusiness(business);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to authenticate');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card glass-effect text-center animate-fade-in">
        <div className="login-header">
          <span className="login-logo-ph">🇵🇭</span>
          <h2>Universal POS</h2>
          <p>Login to your retail dashboard</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group text-left">
            <label htmlFor="username">Username</label>
            <input 
              type="text" 
              className="form-control" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="Enter username" 
              name="username"
              id="username"
              data-testid="username-input"
              required
            />
          </div>

          <div className="form-group text-left">
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              className="form-control" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••" 
              name="password"
              id="password"
              data-testid="password-input"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" data-testid="login-button">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
