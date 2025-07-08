import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css'
import { AuthProvider } from './contexts/AuthContext'

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
      <App />
    </AuthProvider>
  </React.StrictMode>,
)
