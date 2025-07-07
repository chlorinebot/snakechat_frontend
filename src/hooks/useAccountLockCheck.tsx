import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { User } from '../services/api';

interface UseLockCheckResult {
  isChecking: boolean;
  isLocked: boolean;
  lockedUserInfo: User | null;
  checkLockStatus: (userId: number) => Promise<boolean>;
}

export const useAccountLockCheck = (): UseLockCheckResult => {
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lockedUserInfo, setLockedUserInfo] = useState<User | null>(null);
  const navigate = useNavigate();

  // Kiểm tra trạng thái khóa khi component mount
  useEffect(() => {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        const userId = user.user_id || user.id;
        if (userId) {
          checkLockStatus(userId);
        }
      } catch (error) {
        console.error('Lỗi khi parse thông tin user:', error);
      }
    }
  }, []);

  // Hàm kiểm tra trạng thái khóa tài khoản
  const checkLockStatus = async (userId: number): Promise<boolean> => {
    try {
      setIsChecking(true);
      const lockStatus = await api.checkAccountLockStatus(userId);
      
      if (lockStatus.isLocked && lockStatus.lockInfo) {
        console.log('Tài khoản bị khóa:', lockStatus.lockInfo);
        
        // Lấy thông tin user từ localStorage
        const userJson = localStorage.getItem('user');
        if (userJson) {
          const user = JSON.parse(userJson);
          
          // Lưu thông tin tài khoản bị khóa
          const lockedUser: User = {
            ...user,
            reason: lockStatus.lockInfo.reason,
            lock_time: lockStatus.lockInfo.lock_time,
            unlock_time: lockStatus.lockInfo.unlock_time,
            lock_status: 'locked'
          };
          
          setLockedUserInfo(lockedUser);
        }
        
        // Đánh dấu tài khoản bị khóa
        setIsLocked(true);
        
        // Xóa thông tin đăng nhập
        localStorage.removeItem('token');
        
        // Chuyển hướng về trang đăng nhập với thông tin khóa tài khoản
        navigate('/login', { 
          state: { 
            isLocked: true,
            lockInfo: lockStatus.lockInfo
          }
        });
        
        return true;
      }
      
      setIsLocked(false);
      return false;
    } catch (error) {
      console.error('Lỗi khi kiểm tra trạng thái khóa tài khoản:', error);
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  return {
    isChecking,
    isLocked,
    lockedUserInfo,
    checkLockStatus
  };
};

export default useAccountLockCheck; 