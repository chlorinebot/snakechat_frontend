import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateAvatar: (avatarUrl: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    // Kiểm tra xem người dùng đã đăng nhập chưa khi component được mount
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData) as User;
        setCurrentUser(user);
        setIsAuthenticated(true);
        setIsAdmin(user.role_id === 1); // Giả sử role_id = 1 là admin
      } catch (error) {
        console.error('Lỗi khi phân tích dữ liệu người dùng:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = (token: string, user: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setCurrentUser(user);
    setIsAuthenticated(true);
    setIsAdmin(user.role_id === 1);
  };

  const logout = () => {
    // Xóa token và thông tin người dùng
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivity');
    localStorage.removeItem('tabHiddenTime');
    localStorage.removeItem('userStatus');
    localStorage.removeItem('offlineTimestamp');
    localStorage.removeItem('offlineTimerId');
    localStorage.removeItem('lastOfflineAction');
    
    // Cập nhật state
    setCurrentUser(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
  };

  const updateAvatar = (avatarUrl: string) => {
    if (currentUser) {
      // Cập nhật avatar trong state
      const updatedUser = { ...currentUser, avatar: avatarUrl };
      setCurrentUser(updatedUser);
      
      // Cập nhật localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const value = {
    currentUser,
    isAuthenticated,
    isAdmin,
    login,
    logout,
    updateAvatar
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 