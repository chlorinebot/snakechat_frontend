import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { getApiUrl } from '../config/api';

interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface RegisterResponse {
  success: boolean;
  message: string;
  user?: any;
}

const Register: React.FC = () => {
  const [formData, setFormData] = useState<RegisterData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Xóa class account-locked khi vào trang đăng ký
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

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(getApiUrl('/auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password
        }),
      });

      const data: RegisterResponse = await response.json();
      
      if (data.success) {
        toast.success('Đăng ký thành công!');
        navigate('/login');
      } else {
        setError(data.message || 'Đăng ký thất bại');
      }
    } catch (err) {
      setError('Đăng ký thất bại. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  const registerFields = [
    {
      name: 'username',
      label: 'Tên người dùng',
      type: 'text',
      placeholder: 'Nhập tên người dùng',
      icon: 'fas fa-user'
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      placeholder: 'name@example.com',
      icon: 'fas fa-envelope'
    },
    {
      name: 'birthday',
      label: 'Ngày sinh',
      type: 'date',
      placeholder: 'Chọn ngày sinh',
      icon: 'fas fa-calendar'
    },
    {
      name: 'password',
      label: 'Mật khẩu',
      type: 'password',
      placeholder: '••••••••',
      icon: 'fas fa-lock'
    },
    {
      name: 'confirmPassword',
      label: 'Xác nhận mật khẩu',
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
      <Container className="d-flex align-items-center justify-content-center">
        <div className="col-md-8 col-lg-6 col-xl-5">
          <div className="card border-0 bg-transparent">
            <div className="card-body p-0">
              <div className="dark-text-form">
                <Form onSubmit={handleSubmit}>
                  <h3 className="text-center mb-4">Đăng ký</h3>
                  <p className="text-center mb-4">Tạo tài khoản mới</p>

                  {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

                  {registerFields.map((field) => (
                    <Form.Group key={field.name} className="mb-3">
                      <Form.Label className="form-label">
                        <i className={field.icon}></i> {field.label}
                      </Form.Label>
                      <Form.Control
                        type={field.type}
                        name={field.name}
                        placeholder={field.placeholder}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  ))}

                  <Button
                    type="submit"
                    className="w-100"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          className="me-2"
                        />
                        Đang đăng ký...
                      </>
                    ) : (
                      'Đăng ký'
                    )}
                  </Button>

                  <div className="text-center mt-4">
                    <p>
                      Đã có tài khoản?{' '}
                      <Link to="/login" className="auth-link">
                        Đăng nhập
                      </Link>
                    </p>
                  </div>
                </Form>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Container>
  );
};

export default Register; 