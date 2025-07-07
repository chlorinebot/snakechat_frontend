import React from 'react';
import { Nav } from 'react-bootstrap';
import { useLocation, NavLink } from 'react-router-dom';
import './Sidebar.css';

interface AdminSidebarProps {
  visible?: boolean;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ visible = true }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Hàm kiểm tra trạng thái active
  const isActive = (path: string) => {
    return currentPath === path;
  };

  return (
    <div className={`admin-sidebar ${visible ? 'show' : ''}`}>
      <div className="admin-sidebar-header">
        <i className="fas fa-user-shield"></i>
        <span>SnakeChat Admin</span>
      </div>
      <Nav className="flex-column">
        <Nav.Item>
          <NavLink 
            to="/dashboard" 
            className={({isActive}) => `admin-sidebar-item nav-link ${isActive ? 'active' : ''}`}
          >
            <i className="fas fa-tachometer-alt"></i>
            <span>Thống kê hệ thống</span>
          </NavLink>
        </Nav.Item>
        <Nav.Item>
          <NavLink 
            to="/users" 
            className={({isActive}) => `admin-sidebar-item nav-link ${isActive ? 'active' : ''}`}
          >
            <i className="fas fa-users"></i>
            <span>Quản lý người dùng</span>
          </NavLink>
        </Nav.Item>
        <Nav.Item>
          <NavLink 
            to="/roles" 
            className={({isActive}) => `admin-sidebar-item nav-link ${isActive ? 'active' : ''}`}
          >
            <i className="fas fa-user-tag"></i>
            <span>Quản lý vai trò</span>
          </NavLink>
        </Nav.Item>
        <Nav.Item>
          <NavLink 
            to="/locked-accounts" 
            className={({isActive}) => `admin-sidebar-item nav-link ${isActive ? 'active' : ''}`}
          >
            <i className="fas fa-lock"></i>
            <span>Danh sách khóa tài khoản</span>
          </NavLink>
        </Nav.Item>
        <Nav.Item>
          <NavLink 
            to="/reports" 
            className={({isActive}) => `admin-sidebar-item nav-link ${isActive ? 'active' : ''}`}
          >
            <i className="fas fa-flag"></i>
            <span>Danh sách báo cáo</span>
          </NavLink>
        </Nav.Item>
        <Nav.Item>
          <NavLink 
            to="/announcements" 
            className={({isActive}) => `admin-sidebar-item nav-link ${isActive ? 'active' : ''}`}
          >
            <i className="fas fa-bullhorn"></i>
            <span>Thông báo chung</span>
          </NavLink>
        </Nav.Item>
        <div className="admin-sidebar-divider"></div>
        <div className="admin-sidebar-heading">Cài đặt hệ thống</div>
        <Nav.Item>
          <NavLink 
            to="/settings" 
            className={({isActive}) => `admin-sidebar-item nav-link ${isActive ? 'active' : ''}`}
          >
            <i className="fas fa-cog"></i>
            <span>Cấu hình chung</span>
          </NavLink>
        </Nav.Item>
        <Nav.Item>
          <NavLink 
            to="/logs" 
            className={({isActive}) => `admin-sidebar-item nav-link ${isActive ? 'active' : ''}`}
          >
            <i className="fas fa-history"></i>
            <span>Nhật ký hoạt động</span>
          </NavLink>
        </Nav.Item>
      </Nav>
      <div className="admin-sidebar-footer">
        <small className="text-muted">
          <span className="pulse-animation"></span>
          <span>Hệ thống đang hoạt động</span>
        </small>
      </div>
    </div>
  );
};

export default AdminSidebar; 