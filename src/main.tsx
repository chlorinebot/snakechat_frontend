import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css'
import { AuthProvider } from './contexts/AuthContext'

// Error Boundary Component
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          fontFamily: 'Arial, sans-serif',
          background: '#f8f9fa',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <h1 style={{ color: '#dc3545', marginBottom: '20px' }}>Oops! Có lỗi xảy ra</h1>
          <p style={{ color: '#6c757d', marginBottom: '20px' }}>
            Ứng dụng đã gặp lỗi không mong muốn. Vui lòng tải lại trang để thử lại.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Tải lại trang
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Đảm bảo áp dụng theme trước khi render để tránh nhấp nháy
const applyInitialTheme = () => {
  // Khởi tạo theme dựa trên localStorage
  const savedTheme = localStorage.getItem('darkMode');
  
  if (savedTheme === 'true') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else if (savedTheme === null) {
    // Nếu người dùng chưa thiết lập theme, sử dụng theme hệ thống
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      localStorage.setItem('darkMode', 'false');
    }
  }
  
  // Thêm class để kích hoạt hiệu ứng transition sau khi trang đã load
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      document.body.classList.add('theme-transition-enabled');
    }, 300);
  });
};

// Áp dụng theme ban đầu
applyInitialTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </AuthProvider>
  </React.StrictMode>,
)
