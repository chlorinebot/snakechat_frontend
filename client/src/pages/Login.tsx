import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { getApiUrl } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: number;
    user_id?: number;
    username: string;
    email: string;
    role: string;
    role_id?: number;
  };
  message?: string;
}

const Login: React.FC = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    identity: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Xóa class account-locked khi vào trang đăng nhập
  useEffect(() => {
    document.body.classList.remove('account-locked');
    
    // Cleanup khi component unmount
    return () => {
      // Có thể giữ lại hoặc xóa tùy theo logic ứng dụng
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(getApiUrl('/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data: LoginResponse = await response.json();
      
      if (data.success) {
        console.log('Thông tin người dùng từ server:', data.user);
        
        // Đảm bảo dữ liệu người dùng có user_id
        const userData = { 
          username: data.user?.username || '',
          email: data.user?.email || '',
          password: '', // Password rỗng để thỏa mãn interface
          role_id: data.user?.role_id || 2,
          ...data.user
        };
        if (!userData.user_id && userData.id) {
          console.log('Chuyển đổi id thành user_id cho tương thích với client');
          userData.user_id = userData.id;
        }
        
        // Kiểm tra xem tài khoản có bị khóa không
        const userId = userData.user_id || userData.id;
        try {
          // Assuming api.checkAccountLockStatus is available globally or imported
          // For now, we'll simulate a check or remove if not used
          // const lockStatus = await api.checkAccountLockStatus(userId);
          // if (lockStatus.isLocked && lockStatus.lockInfo) {
          //   console.log('Tài khoản bị khóa:', lockStatus.lockInfo);
          //   // Handle locked account logic here
          //   // For now, we'll just show an error message
          //   toast.error('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
          //   return;
          // }
        } catch (lockCheckError) {
          console.error('Lỗi kiểm tra trạng thái khóa:', lockCheckError);
        }
        
        // Lưu token và thông tin người dùng vào AuthContext
        const token = data.token || '';
        login(token, userData);
        
        // Thêm delay ngắn để AuthContext cập nhật xong
        setTimeout(() => {
          // Điều hướng dựa vào role_id
          console.log('Thông tin userData cho điều hướng:', userData);
          if (userData.role_id === 1) {
            // Nếu là admin (role_id = 1)
            console.log('Điều hướng đến admin dashboard');
            window.location.href = '/dashboard';
          } else if (userData.role_id === 2) {
            // Nếu là người dùng thường (role_id = 2)
            console.log('Điều hướng đến trang chủ user');
            window.location.href = '/';
          } else {
            console.warn('Role ID không xác định:', userData.role_id);
            window.location.href = '/';
          }
        }, 100);
      } else {
        setError(data.message || 'Thông tin đăng nhập không chính xác');
      }
    } catch (error) {
      console.error('Lỗi đăng nhập chi tiết:', error);
      setError('Đăng nhập thất bại. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
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
      <Container className="d-flex justify-content-center w-100">
        <Form onSubmit={handleSubmit} className="dark-text-form">
          <h2 className="text-center mb-4">Đăng nhập</h2>
          <p className="text-center mb-4">Chào mừng bạn trở lại!</p>
          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
          <Form.Group className="mb-3">
            <Form.Label>Email hoặc tên đăng nhập</Form.Label>
            <Form.Control
              type="text"
              name="identity"
              value={formData.identity}
              onChange={handleChange}
              placeholder="Nhập email hoặc tên đăng nhập"
              className="form-control-lg"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Mật khẩu</Form.Label>
            <Form.Control
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="form-control-lg"
            />
          </Form.Group>
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
            <Link to="/forgot-password" className="auth-link" style={{color: "#4776E6", fontWeight: "bold"}}>
              Quên mật khẩu?
            </Link>
          </div>
          <Button variant="primary" type="submit" className="w-100" disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  className="me-2"
                />
                Đang đăng nhập...
              </>
            ) : (
              "Đăng nhập"
            )}
          </Button>
          <p className="text-center mt-3">
            Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
          </p>
        </Form>
      </Container>
    </Container>
  );
};

export default Login; 