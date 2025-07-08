import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/admin/Dashboard';
import Users from './pages/admin/Users';
import Roles from './pages/admin/Roles';
import LockedAccounts from './pages/admin/LockedAccounts';
import HomePage from './pages/home_user/HomePage';
import AccountLockGuard from './components/common/AccountLockGuard';
import DebugPanel from './components/debug/DebugPanel';
import TestConnection from './components/debug/TestConnection';
import NetworkTest from './components/debug/NetworkTest';
import BackendStatus from './components/debug/BackendStatus';
import api from './services/api';
import socketService from './services/socketService';
import Reports from './pages/admin/Reports';
import Announcements from './pages/admin/Announcements';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './styles/auth.css';
import { API_CONFIG } from './config/api';

const API_URL = API_CONFIG.API_URL;
const OFFLINE_URL = `${API_URL}/user/update-status-beacon`;
const HEARTBEAT_INTERVAL = 10000; // 10 giây

// Component for login page
const LoginPage: React.FC = () => {
  const { login } = useAuth();
  
  return <Login />;
};

const App: React.FC = () => {
  const [showTestConnection, setShowTestConnection] = useState(false);
  const [showNetworkTest, setShowNetworkTest] = useState(false);
  const [showBackendStatus, setShowBackendStatus] = useState(false);
  // Kiểm tra authentication và role từ localStorage
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(localStorage.getItem('token') !== null);
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('user') || '{}'));
  const isAdmin = user.role_id === 1;
  const isRegularUser = user.role_id === 2;
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isTabActive, setIsTabActive] = useState<boolean>(document.visibilityState === 'visible');
  const [theme, setTheme] = useState<string>(() => {
    const savedTheme = localStorage.getItem('darkMode');
    return savedTheme === 'true' ? 'dark' : 'light';
  });

  // Thêm state và ref để theo dõi refresh
  const [refreshCount, setRefreshCount] = useState<number>(0);
  const refreshTimestampsRef = useRef<number[]>([]);
  const refreshThreshold = 20; // Số lần refresh tối đa trong khoảng thời gian
  const refreshTimeWindow = 5000; // Khoảng thời gian 5 giây

  // Hàm thay đổi theme
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('darkMode', 'false');
    }
  };

  // Hàm cập nhật thời gian hoạt động cuối cùng
  const updateLastActivityTime = () => {
    const now = new Date().getTime();
    localStorage.setItem('lastActivity', now.toString());
  };

  // Thêm sự kiện để cập nhật trạng thái online
  const updateOnlineStatus = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        // Kiểm tra cả id và user_id
        const userId = parsedUser.user_id || parsedUser.id;
        if (userId) {
          api.updateUserActivity(userId);
          // Cập nhật thời gian hoạt động cuối cùng
          updateLastActivityTime();
        }
      } catch (error) {
        console.error('Lỗi khi parse user data trong updateOnlineStatus:', error);
      }
    }
  };

  // Hàm gửi heartbeat để xác nhận người dùng vẫn đang sử dụng hệ thống
  const sendHeartbeat = () => {
    if (!isTabActive) return; // Không gửi heartbeat nếu tab không hoạt động
    
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        const userId = parsedUser.user_id || parsedUser.id;
        if (userId) {
          api.sendHeartbeat(userId);
          updateLastActivityTime();
        }
      } catch (error) {
        console.error('Lỗi khi gửi heartbeat:', error);
      }
    }
  };

  // Hàm cập nhật trạng thái offline khi người dùng thoát
  const handleUserOffline = async () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        // Kiểm tra cả id và user_id
        const userId = parsedUser.user_id || parsedUser.id;
        if (userId) {
          await api.updateUserOffline(userId);
        }
      } catch (error) {
        console.error('Lỗi khi parse user data trong handleUserOffline:', error);
      }
    }
  };

  // Hàm sử dụng Beacon API để gửi trạng thái offline khi đóng tab
  const sendOfflineBeacon = () => {
    const userData = localStorage.getItem('user');
    if (userData && navigator.sendBeacon) {
      try {
        const parsedUser = JSON.parse(userData);
        const userId = parsedUser.user_id || parsedUser.id;
        if (userId) {
          const data = new FormData();
          data.append('user_id', userId.toString());
          data.append('status', 'offline');
          data.append('timestamp', new Date().getTime().toString()); // Thêm timestamp để tránh cache
          data.append('force', 'true'); // Thêm flag force để đảm bảo cập nhật ngay lập tức
          
          // Sử dụng navigator.sendBeacon để đảm bảo yêu cầu được gửi ngay cả khi đóng tab
          const beaconSent = navigator.sendBeacon(OFFLINE_URL, data);
          console.log('Đã gửi beacon offline:', beaconSent);
          
          // Thêm dữ liệu dự phòng vào localStorage
          localStorage.setItem('lastOfflineAction', JSON.stringify({
            userId,
            timestamp: new Date().getTime(),
            sent: beaconSent
          }));
          
          // Lưu trạng thái offline vào localStorage để các tab khác biết
          localStorage.setItem('userStatus', 'offline');
          localStorage.setItem('offlineTimestamp', new Date().getTime().toString());
          
          return beaconSent;
        }
      } catch (error) {
        console.error('Lỗi khi gửi beacon:', error);
      }
    }
    return false;
  };

  // Kiểm tra xem người dùng có hoạt động trong khoảng thời gian quy định không
  const checkUserActivity = () => {
    const lastActivity = localStorage.getItem('lastActivity');
    if (lastActivity) {
      const now = new Date().getTime();
      const lastActiveTime = parseInt(lastActivity, 10);
      const inactiveTime = now - lastActiveTime;
      
      // Log thời gian không hoạt động (debug)
      if (inactiveTime > 10000) { // 10 giây
        console.log(`Thời gian không hoạt động: ${Math.floor(inactiveTime / 1000)} giây`);
      }
      
      // Nếu không hoạt động trong 30 giây (30000ms), đánh dấu là offline
      if (inactiveTime > 30000) {
        console.log('Người dùng không hoạt động trong 30 giây, đánh dấu là offline');
        handleUserOffline();
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    // Khởi tạo thời gian hoạt động cuối cùng
    updateLastActivityTime();
    
    // Kiểm tra token khi component mount
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    setIsAuthenticated(token !== null);
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Cập nhật trạng thái online nếu người dùng đã đăng nhập
        // Kiểm tra cả id và user_id
        const userId = parsedUser.user_id || parsedUser.id;
        if (userId) {
          // Kiểm tra localStorage xem người dùng trước đó có ở trạng thái offline không
          const offlineTimestamp = localStorage.getItem('offlineTimestamp');
          if (offlineTimestamp) {
            const now = new Date().getTime();
            const lastOfflineTime = parseInt(offlineTimestamp, 10);
            // Nếu mới đánh dấu offline < 3 giây trước, không cập nhật lại online
            if ((now - lastOfflineTime) < 3000) {
              console.log('Đã đánh dấu offline gần đây, không cập nhật lại online');
              return;
            }
          }
          
          // Cập nhật trạng thái online
          api.updateUserActivity(userId);
          updateLastActivityTime();
          
          // Thiết lập lắng nghe sự kiện force_logout
          socketService.on('force_logout', (data) => {
            console.log('Nhận yêu cầu đăng xuất bắt buộc:', data);
            
            // Ngăn chặn tất cả các hành động tiếp theo ngay lập tức
            document.body.classList.add('account-locked');
            
            // Hiển thị thông báo cho người dùng
            toast.error(`${data.reason || 'Tài khoản của bạn đã bị khóa'}. Bạn sẽ bị đăng xuất trong 1 giây.`, {
              position: "top-center",
              autoClose: 1000,
              hideProgressBar: false,
              closeOnClick: false,
              pauseOnHover: false,
              draggable: false,
            });
            
            // Tự động đăng xuất ngay lập tức
            setTimeout(() => {
              // Xóa dữ liệu người dùng và token
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              localStorage.removeItem('lastActivity');
              localStorage.removeItem('tabHiddenTime');
              localStorage.removeItem('userStatus');
              localStorage.removeItem('offlineTimestamp');
              localStorage.removeItem('offlineTimerId');
              localStorage.removeItem('lastOfflineAction');
              sessionStorage.clear();
              
              // Hủy tất cả timers
              if (heartbeatTimerRef.current) {
                clearInterval(heartbeatTimerRef.current);
                heartbeatTimerRef.current = null;
              }
              
              // Đặt trạng thái xác thực thành false
              setIsAuthenticated(false);
              setUser({});
              
              // Chuyển hướng người dùng về trang đăng nhập
              window.location.href = '/login?locked=true';
            }, 1000);
          });
          
          // Lắng nghe sự kiện global_force_logout để đăng xuất tất cả các tab
          socketService.on('global_force_logout', (data) => {
            console.log('Nhận thông báo global_force_logout:', data);
            
            // Kiểm tra xem thông báo có phải dành cho người dùng hiện tại không
            const userData = localStorage.getItem('user');
            if (userData) {
              try {
                const parsedUser = JSON.parse(userData);
                const currentUserId = parsedUser.user_id || parsedUser.id;
                
                // Nếu thông báo nhắm đến người dùng hiện tại
                if (currentUserId && data.target_user_id && currentUserId.toString() === data.target_user_id.toString()) {
                  console.log('Thông báo global_force_logout dành cho người dùng hiện tại, đang đăng xuất...');
                  
                  // Ngăn chặn tất cả các hành động tiếp theo
                  document.body.classList.add('account-locked');
                  
                  // Hiển thị thông báo
                  toast.error(`${data.reason || 'Tài khoản của bạn đã bị khóa'}. Đang đăng xuất...`, {
                    position: "top-center",
                    autoClose: 1000,
                    hideProgressBar: false,
                    closeOnClick: false,
                    pauseOnHover: false,
                    draggable: false,
                  });
                  
                  // Thực hiện đăng xuất
                  setTimeout(() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('lastActivity');
                    localStorage.removeItem('tabHiddenTime');
                    localStorage.removeItem('userStatus');
                    localStorage.removeItem('offlineTimestamp');
                    localStorage.removeItem('offlineTimerId');
                    localStorage.removeItem('lastOfflineAction');
                    sessionStorage.clear();
                    
                    // Hủy tất cả timers
                    if (heartbeatTimerRef.current) {
                      clearInterval(heartbeatTimerRef.current);
                      heartbeatTimerRef.current = null;
                    }
                    
                    setIsAuthenticated(false);
                    setUser({});
                    
                    window.location.href = '/login?locked=true';
                  }, 1000);
                }
              } catch (error) {
                console.error('Lỗi khi xử lý thông báo global_force_logout:', error);
              }
            }
          });
        }
      } catch (error) {
        console.error('Lỗi khi parse thông tin user từ localStorage:', error);
      }
    }
    
    // Thiết lập interval để cập nhật trạng thái online
    const intervalId = setInterval(() => {
      // Chỉ cập nhật nếu người dùng vẫn hoạt động
      if (checkUserActivity()) {
        updateOnlineStatus();
      }
    }, 10000); // Cập nhật mỗi 10 giây
    
    // Thiết lập interval cho heartbeat
    heartbeatTimerRef.current = setInterval(() => {
      sendHeartbeat();
    }, 10000); // Gửi heartbeat mỗi 10 giây
    
    // Thiết lập interval để kiểm tra định kỳ sự hoạt động của người dùng
    const activityCheckId = setInterval(() => {
      checkUserActivity();
    }, 10000); // Kiểm tra mỗi 10 giây
    
    // Thiết lập interval để cập nhật thông tin bạn bè
    const friendsUpdateId = setInterval(() => {
      // Cập nhật trạng thái bạn bè mỗi 10 giây
      if (isTabActive && isAuthenticated) {
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const parsedUser = JSON.parse(userData);
            const userId = parsedUser.user_id || parsedUser.id;
            if (userId) {
              // Cập nhật thông tin bạn bè để lấy trạng thái mới nhất
              console.log('Cập nhật trạng thái bạn bè...');
              // Sử dụng hàm refreshFriendStatus mới để cập nhật
              api.refreshFriendStatus(userId);
            }
          } catch (error) {
            console.error('Lỗi khi cập nhật trạng thái bạn bè:', error);
          }
        }
      }
    }, 10000); // 10 giây
    
    // Kiểm tra trạng thái khi reload
    const checkOfflineOnReload = () => {
      const lastOfflineAction = localStorage.getItem('lastOfflineAction');
      if (lastOfflineAction) {
        try {
          const offlineData = JSON.parse(lastOfflineAction);
          const now = new Date().getTime();
          // Nếu có dữ liệu offline được lưu trong vòng 5 giây gần đây, gửi lại yêu cầu để đảm bảo
          if (now - offlineData.timestamp < 5000) {
            console.log('Phát hiện yêu cầu offline gần đây, gửi lại để đảm bảo...');
            api.updateUserOffline(offlineData.userId);
          }
          // Xóa dữ liệu sau khi xử lý
          localStorage.removeItem('lastOfflineAction');
        } catch (error) {
          console.error('Lỗi khi xử lý dữ liệu offline tại lúc tải lại:', error);
        }
      }
    };
    
    // Thực hiện kiểm tra ngay khi tải trang
    checkOfflineOnReload();
    
    // Xử lý sự kiện khi người dùng đóng tab/trình duyệt
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      console.log('Sự kiện beforeunload đã được kích hoạt');
      
      // Thực hiện các hành động offline ngay lập tức
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          const userId = parsedUser.user_id || parsedUser.id;
          
          // Đánh dấu offline ngay lập tức
          localStorage.setItem('userStatus', 'offline');
          localStorage.setItem('offlineTimestamp', new Date().getTime().toString());
          
          // Sử dụng Beacon API để đảm bảo yêu cầu được gửi
          if (!sendOfflineBeacon()) {
            // Fallback nếu sendBeacon không được hỗ trợ
            // Lưu vào localStorage để xử lý khi tải lại
            localStorage.setItem('lastOfflineAction', JSON.stringify({
              userId,
              timestamp: new Date().getTime(),
              sent: false
            }));
            
            handleUserOffline();
          }
        } catch (error) {
          console.error('Lỗi khi xử lý đóng tab:', error);
        }
      }
      
      // Không cần hiển thị cảnh báo, chỉ cần cập nhật trạng thái offline
    };
    
    // Thêm sự kiện unload để đảm bảo hơn nữa
    const handleUnload = () => {
      console.log('Sự kiện unload đã được kích hoạt');
      
      // Cũng thực hiện các hành động giống như beforeunload
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          const userId = parsedUser.user_id || parsedUser.id;
          
          // Đánh dấu offline ngay lập tức
          localStorage.setItem('userStatus', 'offline');
          localStorage.setItem('offlineTimestamp', new Date().getTime().toString());
          
          // Sử dụng Beacon API để đảm bảo yêu cầu được gửi
          if (!sendOfflineBeacon()) {
            // Fallback nếu sendBeacon không được hỗ trợ
            localStorage.setItem('lastOfflineAction', JSON.stringify({
              userId,
              timestamp: new Date().getTime(),
              sent: false
            }));
            
            // Thử sử dụng XMLHttpRequest đồng bộ
            try {
              const xhr = new XMLHttpRequest();
              xhr.open('POST', `${API_URL}/user/update-status`, false); // Đặt false để làm cho nó đồng bộ
              xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
              
              if (userId) {
                xhr.send(JSON.stringify({ user_id: userId, status: 'offline', force: true }));
              }
            } catch (xhrError) {
              console.error('Lỗi khi gửi yêu cầu offline đồng bộ:', xhrError);
            }
          }
        } catch (error) {
          console.error('Lỗi khi gửi yêu cầu offline:', error);
        }
      }
    };
    
    // Xử lý sự kiện khi mất kết nối internet
    const handleOffline = () => {
      handleUserOffline();
    };
    
    // Xử lý sự kiện khi có kết nối internet trở lại
    const handleOnline = () => {
      updateOnlineStatus();
    };
    
    // Xử lý sự kiện khi tab không còn hiển thị
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      setIsTabActive(isVisible);
      
      if (!isVisible) {
        // Tab không còn hiển thị
        const currentTime = new Date().getTime();
        localStorage.setItem('tabHiddenTime', currentTime.toString());
        
        // Dừng heartbeat khi tab không hiển thị
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = null;
        }
        
        // Đặt hẹn giờ để chuyển trạng thái thành offline nếu tab không hiển thị trong 30 giây
        const offlineTimerId = setTimeout(() => {
          console.log('Tab đã ẩn quá lâu, đánh dấu người dùng là offline');
          handleUserOffline();
          localStorage.setItem('userStatus', 'offline');
        }, 30000); // 30 giây
        
        // Lưu timer ID để có thể xóa nếu tab hiển thị lại trước khi hết thời gian
        localStorage.setItem('offlineTimerId', offlineTimerId.toString());
      } else {
        // Tab hiển thị lại
        const hiddenTime = localStorage.getItem('tabHiddenTime');
        const userStatus = localStorage.getItem('userStatus');
        const offlineTimerId = localStorage.getItem('offlineTimerId');
        
        // Xóa timer đánh dấu offline nếu có
        if (offlineTimerId) {
          clearTimeout(parseInt(offlineTimerId, 10));
          localStorage.removeItem('offlineTimerId');
        }
        
        if (hiddenTime) {
          const now = new Date().getTime();
          const hiddenDuration = now - parseInt(hiddenTime, 10);
          
          // Nếu tab đã ẩn quá lâu (30 giây) hoặc đã được đánh dấu là offline
          if (hiddenDuration > 30000 || userStatus === 'offline') {
            console.log('Tab trở lại sau thời gian dài, cập nhật trạng thái online');
            updateOnlineStatus();
            localStorage.setItem('userStatus', 'online');
          }
        }
        
        // Khởi động lại heartbeat khi tab hiển thị lại
        if (!heartbeatTimerRef.current) {
          heartbeatTimerRef.current = setInterval(() => {
            sendHeartbeat();
          }, 10000);
        }
        
        // Cập nhật lại thời gian hoạt động
        updateLastActivityTime();
        updateOnlineStatus();
      }
    };
    
    // Theo dõi hoạt động người dùng trên trang
    const handleUserActivity = () => {
      updateOnlineStatus();
      updateLastActivityTime();
    };
    
    // Đăng ký các sự kiện
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Theo dõi các sự kiện tương tác của người dùng
    document.addEventListener('click', handleUserActivity);
    document.addEventListener('scroll', handleUserActivity);
    
    return () => {
      // Xóa đăng ký sự kiện và dừng interval khi component unmount
      clearInterval(intervalId);
      clearInterval(activityCheckId);
      clearInterval(friendsUpdateId);
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('click', handleUserActivity);
      document.removeEventListener('scroll', handleUserActivity);
      
      // Cập nhật trạng thái offline khi unmount
      handleUserOffline();
    };
  }, []);

  // Thêm useEffect để phát hiện refresh liên tục
  useEffect(() => {
    // Lấy danh sách timestamps từ localStorage
    const savedTimestamps = localStorage.getItem('refreshTimestamps');
    let timestamps: number[] = [];
    
    if (savedTimestamps) {
      try {
        timestamps = JSON.parse(savedTimestamps);
      } catch (error) {
        console.error('Lỗi khi parse timestamps:', error);
        timestamps = [];
      }
    }
    
    const now = Date.now();
    
    // Thêm timestamp hiện tại vào mảng
    timestamps.push(now);
    
    // Chỉ giữ lại các timestamps trong khoảng thời gian quy định
    timestamps = timestamps.filter(timestamp => now - timestamp <= refreshTimeWindow);
    
    // Lưu lại timestamps vào localStorage
    localStorage.setItem('refreshTimestamps', JSON.stringify(timestamps));
    
    console.log(`Số lần refresh trong ${refreshTimeWindow/1000} giây: ${timestamps.length}/${refreshThreshold}`);
    
    // Kiểm tra số lần refresh trong khoảng thời gian
    if (timestamps.length >= refreshThreshold) {
      console.log(`Phát hiện ${refreshThreshold} lần refresh trong ${refreshTimeWindow/1000} giây!`);
      
      // Lấy thông tin người dùng
      const userJson = localStorage.getItem('user');
      if (userJson) {
        try {
          const user = JSON.parse(userJson);
          const userId = user.user_id || user.id;
          
          if (userId) {
            // Khóa tài khoản tạm thời
            const lockTime = new Date();
            const unlockTime = new Date(lockTime.getTime() + 10 * 60000); // Thêm 10 phút
            
            // Sử dụng ISO string để đảm bảo định dạng chuẩn
            const lockTimeISO = lockTime.toISOString();
            const unlockTimeISO = unlockTime.toISOString();
            
            console.log('Thời gian khóa (local):', lockTime.toLocaleString());
            console.log('Thời gian mở khóa (local):', unlockTime.toLocaleString());
            console.log('Thời gian khóa (ISO):', lockTimeISO);
            console.log('Thời gian mở khóa (ISO):', unlockTimeISO);
            
            api.lockUser({
              user_id: userId,
              reason: 'Phát hiện refresh trang liên tục (F5 spam)',
              lock_time: lockTimeISO,
              unlock_time: unlockTimeISO
            }).then(response => {
              console.log('Đã khóa tài khoản tạm thời:', response);
              
              // Hiển thị thông báo
              toast.error('Tài khoản của bạn đã bị khóa tạm thời 10 phút do refresh trang liên tục', {
                position: "top-center",
                autoClose: 1000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
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
              localStorage.removeItem('refreshTimestamps');
              sessionStorage.clear();
              
              // Chuyển hướng đến trang đăng nhập
              window.location.href = '/login?locked=true';
            }).catch(error => {
              console.error('Lỗi khi khóa tài khoản:', error);
            });
          }
        } catch (error) {
          console.error('Lỗi khi xử lý thông tin người dùng:', error);
        }
      }
      
      // Reset mảng timestamp
      localStorage.setItem('refreshTimestamps', '[]');
    }
  }, []);

  // Xử lý đăng xuất
  const handleLogout = async () => {
    // Cập nhật trạng thái offline trước khi đăng xuất
    await handleUserOffline();
    
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
    setIsAuthenticated(false);
    setUser({});
    
    // Ngắt kết nối socket
    socketService.disconnect();
    
    // Thông báo đăng xuất thành công
    toast.success('Đã đăng xuất thành công', {
      position: "top-center",
      autoClose: 3000,
    });
  };

  return (
    <AuthProvider>
      <Router>
        <ToastContainer />
        {/* Add DebugPanel for API debugging */}
        <DebugPanel />
        
        {/* Test Connection Component - chỉ hiển thị trong development */}
        {process.env.NODE_ENV === 'development' && (
          <>
            <button
              onClick={() => setShowTestConnection(!showTestConnection)}
              className="fixed top-4 right-16 bg-blue-600 text-white p-2 rounded-lg shadow-lg hover:bg-blue-700 z-50 text-sm"
              title="Test API Connection"
            >
              🔧 Test API
            </button>
            <button
              onClick={() => setShowNetworkTest(!showNetworkTest)}
              className="fixed top-4 right-32 bg-purple-600 text-white p-2 rounded-lg shadow-lg hover:bg-purple-700 z-50 text-sm"
              title="Network Test"
            >
              🌐 Network
            </button>
            <button
              onClick={() => setShowBackendStatus(!showBackendStatus)}
              className="fixed top-4 right-4 bg-green-600 text-white p-2 rounded-lg shadow-lg hover:bg-green-700 z-50 text-sm"
              title="Backend Status"
            >
              🚂 Backend
            </button>
          </>
        )}
        
        {showTestConnection && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold">Test Kết Nối API</h2>
                <button
                  onClick={() => setShowTestConnection(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ×
                </button>
              </div>
              <TestConnection />
            </div>
          </div>
        )}

        {showNetworkTest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-7xl w-full max-h-[95vh] overflow-auto">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold">Network & Backend Test</h2>
                <button
                  onClick={() => setShowNetworkTest(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ×
                </button>
              </div>
              <NetworkTest />
            </div>
          </div>
        )}

        {showBackendStatus && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-6xl max-h-[90vh] overflow-y-auto w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">🚂 Backend Status Dashboard</h3>
                <button
                  onClick={() => setShowBackendStatus(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <BackendStatus />
            </div>
          </div>
        )}

        <Routes>
          <Route path="/login" element={!isAuthenticated ? <LoginPage /> : (isAdmin ? <Navigate to="/dashboard" /> : <Navigate to="/" />)} />
          
          <Route path="/register" element={!isAuthenticated ? <Register /> : (isAdmin ? <Navigate to="/dashboard" /> : <Navigate to="/" />)} />
          
          {/* Admin routes */}
          <Route path="/dashboard" element={isAuthenticated && isAdmin ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/login" />} />
          <Route path="/users" element={isAuthenticated && isAdmin ? <Users onLogout={handleLogout} /> : <Navigate to="/login" />} />
          <Route path="/roles" element={isAuthenticated && isAdmin ? <Roles onLogout={handleLogout} /> : <Navigate to="/login" />} />
          <Route path="/locked-accounts" element={isAuthenticated && isAdmin ? <LockedAccounts onLogout={handleLogout} /> : <Navigate to="/login" />} />
          <Route path="/reports" element={isAuthenticated && isAdmin ? <Reports onLogout={handleLogout} /> : <Navigate to="/login" />} />
          <Route path="/announcements" element={isAuthenticated && isAdmin ? <Announcements onLogout={handleLogout} /> : <Navigate to="/login" />} />
          
          {/* User routes - với AccountLockGuard để kiểm tra trạng thái khóa */}
          <Route path="/" element={
            isAuthenticated && isRegularUser ? (
              <AccountLockGuard>
                <HomePage onLogout={handleLogout} />
              </AccountLockGuard>
            ) : (
              <Navigate to="/login" />
            )
          } />
          
          {/* Fallback route */}
          <Route path="*" element={<Navigate to={isAuthenticated ? (isAdmin ? "/dashboard" : "/") : "/login"} />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;