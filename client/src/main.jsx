import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'rgba(22, 27, 34, 0.95)',
              color: '#e6edf3',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
              borderRadius: '12px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.875rem',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#0d1117' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#0d1117' },
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
