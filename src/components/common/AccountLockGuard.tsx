import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-toastify';

interface AccountLockGuardProps {
  children: React.ReactNode;
}

const AccountLockGuard: React.FC<AccountLockGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const checkIntervalRef = useRef<number | null>(null);
  
  // Hàm thực hiện đăng xuất khi tài khoản bị khóa
  const performLogout = (lockInfo: any, username: string, email: string) => {
    console.log('Tài khoản bị khóa, đang thực hiện đăng xuất:', lockInfo);
    
    // Ngăn chặn tất cả các hành động tiếp theo
    document.body.classList.add('account-locked');
    
    // Hiển thị thông báo
    toast.error(`Tài khoản của bạn đã bị khóa với lý do: ${lockInfo.reason}. Đang đăng xuất...`, {
      position: "top-center",
      autoClose: 1000,
      hideProgressBar: false,
      closeOnClick: false,
      pauseOnHover: false,
      draggable: false,
    });
    
    // Xóa dữ liệu người dùng
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivity');
    localStorage.removeItem('tabHiddenTime');
    localStorage.removeItem('userStatus');
    localStorage.removeItem('offlineTimestamp');
    localStorage.removeItem('offlineTimerId');
    localStorage.removeItem('lastOfflineAction');
    sessionStorage.clear();
    
    // Điều hướng về trang đăng nhập với thông tin khóa tài khoản
    setTimeout(() => {
      navigate('/login', {
        state: {
          isLocked: true,
          lockInfo: {
            ...lockInfo,
            username,
            email
          }
        }
      });
    }, 1000);
  };
  
  useEffect(() => {
    const checkAccountStatus = async () => {
      const userJson = localStorage.getItem('user');
      if (!userJson) {
        navigate('/login');
        return;
      }
      
      try {
        const user = JSON.parse(userJson);
        const userId = user.user_id || user.id;
        
        if (!userId) {
          navigate('/login');
          return;
        }
        
        const lockStatus = await api.checkAccountLockStatus(userId);
        
        if (lockStatus.isLocked && lockStatus.lockInfo) {
          // Nếu tài khoản bị khóa, thực hiện đăng xuất ngay lập tức
          performLogout(lockStatus.lockInfo, user.username, user.email);
        }
      } catch (error) {
        console.error('Lỗi khi kiểm tra trạng thái tài khoản:', error);
      }
    };
    
    // Kiểm tra ngay khi component được mount
    checkAccountStatus();
    
    // Thiết lập kiểm tra định kỳ (mỗi 30 giây)
    checkIntervalRef.current = window.setInterval(() => {
      checkAccountStatus();
    }, 30000);
    
    return () => {
      // Xóa interval khi component unmount
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [navigate]);
  
  return <>{children}</>;
};

export default AccountLockGuard; 