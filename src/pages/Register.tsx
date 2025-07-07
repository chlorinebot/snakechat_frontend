import React, { useState } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import UserForm from '../components/admin/UserForm';

const Register: React.FC = () => {
  const [error, setError] = useState('');

  const handleSubmit = async (data: any) => {
    try {
      if (data.password !== data.confirmPassword) {
        setError('Mật khẩu xác nhận không khớp');
        return;
      }

      const userData = {
        ...data,
        role_id: 2,
        confirmPassword: undefined
      };

      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Đăng ký thành công!');
        window.location.href = '/login';
      } else {
        setError(result.message || 'Đăng ký thất bại');
      }
    } catch (error) {
      setError('Đăng ký thất bại. Vui lòng thử lại sau.');
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
      <Row className="justify-content-center w-100">
        <Col xs={12} sm={10} md={8} lg={6} xl={4}>
          <Card className="border-0 bg-transparent">
            <Card.Body className="p-0">
              <div className="dark-text-form">
                <UserForm
                  title="Đăng ký"
                  subtitle="Tạo tài khoản mới"
                  fields={registerFields}
                  onSubmit={handleSubmit}
                  error={error}
                  buttonText="Đăng ký"
                  footerText="Đã có tài khoản?"
                  footerLink={{
                    text: "Đăng nhập",
                    to: "/login"
                  }}
                  formLogo="/logo.png"
                  extraFields={
                    <div className="form-check mb-4">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="agreeTerms"
                        required
                      />
                      <label className="form-check-label small" htmlFor="agreeTerms" style={{color: "#000", fontWeight: "bold"}}>
                        Tôi đồng ý với <a href="#" className="auth-link" style={{fontWeight: "bold"}}>điều khoản sử dụng</a> và{' '}
                        <a href="#" className="auth-link" style={{fontWeight: "bold"}}>chính sách bảo mật</a>
                      </label>
                    </div>
                  }
                />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Register; 