import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'rgba(17, 24, 39, 0.95)',
            color: '#f1f5f9',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            borderRadius: '14px',
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.875rem',
            padding: '12px 18px',
            backdropFilter: 'blur(20px)',
          },
          success: {
            iconTheme: { primary: '#22c55e', secondary: '#ffffff' }
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#ffffff' }
          }
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
