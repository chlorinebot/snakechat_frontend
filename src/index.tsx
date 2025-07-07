import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import App from './App';

// Khởi tạo theme từ localStorage
const initializeTheme = () => {
  const savedTheme = localStorage.getItem('darkMode');
  if (savedTheme === 'true') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  
  // Thêm class để bật transition sau khi trang đã load
  setTimeout(() => {
    document.body.classList.add('theme-transition-enabled');
  }, 300);
};

// Gọi hàm khởi tạo theme
initializeTheme();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 