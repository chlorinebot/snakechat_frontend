import React, { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import AdminSidebar from './Sidebar';
import './Layout.css';

interface AdminLayoutProps {
  children: React.ReactNode;
  onLogout?: () => void;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, onLogout }) => {
  const [sidebarVisible, setSidebarVisible] = useState(window.innerWidth > 992);
  const [darkMode, setDarkMode] = useState(false);
  
  // Xác định nếu trình duyệt hỗ trợ chế độ tối mặc định
  const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Xử lý chế độ sáng/tối
  useEffect(() => {
    // Ban đầu, kiểm tra localStorage và thiết lập ban đầu
    const savedTheme = localStorage.getItem('darkMode');
    
    if (savedTheme === 'true') {
      setDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (savedTheme === 'false') {
      setDarkMode(false);
      document.documentElement.removeAttribute('data-theme');
    } else if (prefersDarkMode) {
      // Nếu không có cài đặt trong localStorage và trình duyệt ưa thích chế độ tối
      setDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      setDarkMode(false);
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('darkMode', 'false');
    }
    
    // Bật transition sau một lát
    const timer = setTimeout(() => {
      document.body.classList.add('theme-transition-enabled');
    }, 100);
    
    return () => {
      clearTimeout(timer);
      document.body.classList.remove('theme-transition-enabled');
    };
  }, [prefersDarkMode]);

  // Xử lý thay đổi dark mode
  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark-mode');
      document.querySelectorAll('.badge').forEach(badge => {
        badge.classList.add('dark-mode-badge');
      });
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.body.classList.remove('dark-mode');
      document.querySelectorAll('.badge').forEach(badge => {
        badge.classList.remove('dark-mode-badge');
      });
      localStorage.setItem('darkMode', 'false');
    }
  };

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const handleLogout = () => {
    if (onLogout) {
      // Sử dụng hàm đăng xuất từ prop nếu được cung cấp
      onLogout();
    } else {
      // Fallback nếu không có hàm đăng xuất từ prop
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  };

  // Responsive sidebar toggle
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 992) {
        setSidebarVisible(false);
      } else {
        setSidebarVisible(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`admin-app-container ${sidebarVisible ? 'admin-sidebar-visible' : 'admin-sidebar-hidden'}`}>
      <AdminSidebar visible={sidebarVisible} />
      <div className="admin-content-wrapper">
        <div className="admin-content-header">
          <Button
            variant="link"
            className="admin-sidebar-toggle"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <i className="fas fa-bars"></i>
          </Button>
          <div className="admin-header-right">
            <button
              className="admin-theme-toggle-btn"
              onClick={toggleTheme}
              title={darkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
              aria-label={darkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            >
              <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={handleLogout}
            >
              <i className="fas fa-sign-out-alt me-2"></i>
              Đăng xuất
            </Button>
          </div>
        </div>
        <div className="admin-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout; 