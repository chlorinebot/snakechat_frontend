import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import UserForm from '../components/admin/UserForm';
import api from '../services/api';
import LockedAccountModal from '../components/modals/LockedAccountModal';
import AppealForm from '../components/modals/AppealForm';
import type { AppealData } from '../components/modals/AppealForm';
import type { User } from '../services/api';

interface LocationState {
  isLocked?: boolean;
  lockInfo?: {
    user_id: number;
    username: string;
    email: string;
    reason: string;
    lock_time: string;
    unlock_time: string;
  };
}

interface LoginProps {
  onLoginSuccess?: (token: string, userData: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [error, setError] = useState('');
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [lockedUser, setLockedUser] = useState<User | null>(null);
  const [appealSuccess, setAppealSuccess] = useState(false);
  const location = useLocation();

  // Kiểm tra xem có thông tin khóa tài khoản từ redirect không
  useEffect(() => {
    const state = location.state as LocationState;
    if (state && state.isLocked && state.lockInfo) {
      console.log('Nhận thông tin tài khoản bị khóa từ redirect:', state.lockInfo);
      
      // Hiển thị modal cảnh báo tài khoản bị khóa
      setLockedUser({
        user_id: state.lockInfo.user_id,
        username: state.lockInfo.username,
        email: state.lockInfo.email,
        password: '',
        reason: state.lockInfo.reason,
        lock_time: state.lockInfo.lock_time,
        unlock_time: state.lockInfo.unlock_time,
        role_id: 2 // Mặc định là người dùng thường
      });
      setShowLockedModal(true);
    }
  }, [location]);

  const handleLogout = () => {
    // Xóa dữ liệu đăng nhập
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Đóng modal tài khoản bị khóa
    setShowLockedModal(false);
    
    // Đặt lại trạng thái người dùng bị khóa
    setLockedUser(null);
    
    // Xóa state của location để tránh hiển thị lại modal khi tải lại trang
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // Tải lại trang để làm mới hoàn toàn trạng thái ứng dụng
    window.location.reload();
  };

  const handleAppeal = () => {
    // Đặt lại trạng thái khiếu nại thành công
    setAppealSuccess(false);
    setShowLockedModal(false);
    setShowAppealForm(true);
  };

  const handleSubmitAppeal = async (appealData: AppealData) => {
    try {
      await api.sendAccountAppeal(appealData);
      
      // Đánh dấu khiếu nại thành công
      setAppealSuccess(true);
      
      // Đóng form khiếu nại
      setShowAppealForm(false);
      
      // Hiển thị lại modal tài khoản bị khóa sau khi gửi khiếu nại thành công
      setTimeout(() => {
        setShowLockedModal(true);
      }, 200); // Đợi một chút để đảm bảo modal khiếu nại đã đóng hoàn toàn
    } catch (error) {
      console.error('Lỗi khi gửi khiếu nại:', error);
      // Xử lý lỗi
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('Thông tin người dùng từ server:', result.user);
        
        // Đảm bảo dữ liệu người dùng có user_id
        const userData = { ...result.user };
        if (!userData.user_id && userData.id) {
          console.log('Chuyển đổi id thành user_id cho tương thích với client');
          userData.user_id = userData.id;
        }
        
        // Kiểm tra xem tài khoản có bị khóa không
        const userId = userData.user_id || userData.id;
        try {
          const lockStatus = await api.checkAccountLockStatus(userId);
          
          if (lockStatus.isLocked && lockStatus.lockInfo) {
            console.log('Tài khoản bị khóa:', lockStatus.lockInfo);
            
            // Hiển thị modal cảnh báo tài khoản bị khóa
            setLockedUser({
              ...userData,
              reason: lockStatus.lockInfo.reason,
              lock_time: lockStatus.lockInfo.lock_time,
              unlock_time: lockStatus.lockInfo.unlock_time
            });
            setShowLockedModal(true);
            
            // Không cho phép đăng nhập khi tài khoản bị khóa
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            return;
          }
        } catch (lockCheckError) {
          console.error('Lỗi kiểm tra trạng thái khóa:', lockCheckError);
        }
        
        // Lưu token và thông tin người dùng vào localStorage
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Cập nhật trạng thái online cho người dùng
        if (userId) {
          try {
            await api.updateStatus(userId, 'online');
            console.log('Đã cập nhật trạng thái online cho user ID:', userId);
          } catch (err) {
            console.error('Lỗi khi cập nhật trạng thái online:', err);
          }
        } else {
          console.error('Không tìm thấy user_id hoặc id trong dữ liệu đăng nhập:', userData);
        }
        
        // Gọi callback nếu có
        if (onLoginSuccess) {
          onLoginSuccess(result.token, userData);
        }
        
        // Điều hướng dựa vào role_id
        if (result.user.role_id === 1) {
          // Nếu là admin (role_id = 1)
          window.location.href = '/admin/dashboard';
        } else {
          // Nếu là người dùng thường (role_id = 2)
          window.location.href = '/';
        }
      } else {
        setError(result.message || 'Thông tin đăng nhập không chính xác');
      }
    } catch (error) {
      console.error('Lỗi đăng nhập chi tiết:', error);
      setError('Đăng nhập thất bại. Vui lòng thử lại sau.');
    }
  };

  const loginFields = [
    {
      name: 'identity',
      label: 'Email hoặc tên đăng nhập',
      type: 'text',
      placeholder: 'Nhập email hoặc tên đăng nhập',
      icon: 'fas fa-user'
    },
    {
      name: 'password',
      label: 'Mật khẩu',
      type: 'password',
      placeholder: '••••••••',
      icon: 'fas fa-lock'
    }
  ];

  return (
    <Container fluid className="min-vh-100 d-flex align-items-center justify-content-center bg-auth">
      <div className="auth-background"></div>
      <div className="light-effect light-effect-1"></div>
      <div className="light-effect light-effect-2"></div>
      <Row className="justify-content-center w-100">
        <Col xs={12} sm={10} md={8} lg={6} xl={4}>
          <Card className="border-0 bg-transparent">
            <Card.Body className="p-0">
              <div className="dark-text-form">
                <UserForm
                  title="Đăng nhập"
                  subtitle="Chào mừng bạn trở lại!"
                  fields={loginFields}
                  onSubmit={handleSubmit}
                  error={error}
                  buttonText="Đăng nhập"
                  footerText="Chưa có tài khoản?"
                  footerLink={{
                    text: "Đăng ký ngay",
                    to: "/register"
                  }}
                  formLogo="/logo.png"
                  extraFields={
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <div className="form-check mb-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="rememberMe"
                        />
                        <label className="form-check-label" htmlFor="rememberMe" style={{color: "#000", fontWeight: "bold"}}>
                          Ghi nhớ đăng nhập
                        </label>
                      </div>
                      <a href="/forgot-password" className="auth-link" style={{color: "#4776E6", fontWeight: "bold"}}>
                        Quên mật khẩu?
                      </a>
                    </div>
                  }
                />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal hiển thị khi tài khoản bị khóa */}
      {lockedUser && (
        <LockedAccountModal
          show={showLockedModal}
          user={lockedUser}
          onHide={() => {}} // Không cho phép đóng modal bằng nút X
          onLogout={handleLogout}
          onAppeal={handleAppeal}
          appealSuccess={appealSuccess}
        />
      )}

      {/* Form gửi khiếu nại */}
      {lockedUser && (
        <AppealForm
          show={showAppealForm}
          user={lockedUser}
          onHide={() => setShowAppealForm(false)}
          onSubmit={handleSubmitAppeal}
        />
      )}
    </Container>
  );
};

export default Login; 