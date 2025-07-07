import React, { useState, useEffect } from 'react';
import { Modal, Button, Card, Badge, Alert } from 'react-bootstrap';
import type { User } from '../../services/api';

interface LockedAccountModalProps {
  show: boolean;
  user: User;
  onHide: () => void;
  onLogout: () => void;
  onAppeal: () => void;
  appealSuccess?: boolean;
}

const LockedAccountModal: React.FC<LockedAccountModalProps> = ({
  show,
  user,
  onHide,
  onLogout,
  onAppeal,
  appealSuccess = false
}) => {
  // State để hiển thị thông báo thành công
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Hiển thị thông báo thành công khi appealSuccess thay đổi
  useEffect(() => {
    if (appealSuccess) {
      setShowSuccess(true);
      // Tự động ẩn thông báo sau 5 giây
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [appealSuccess]);

  // Format dates for better display
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Không xác định';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Hàm đăng xuất tức thời
  const handleInstantLogout = () => {
    // Xóa token và thông tin người dùng từ localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Xóa state của location để tránh hiển thị lại modal khi tải lại trang
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // Gọi hàm onLogout để thông báo cho component cha
    onLogout();
    
    // Tải lại trang để làm mới hoàn toàn trạng thái ứng dụng thay vì chỉ chuyển hướng
    window.location.reload();
  };

  // CSS styles
  const styles = {
    modalContent: {
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 15px 30px rgba(0,0,0,0.15)'
    },
    iconContainer: {
      width: '24px',
      textAlign: 'center' as const
    },
    userInfo: {
      background: 'linear-gradient(to right, #f8f9fa, #ffffff)'
    },
    userName: {
      color: '#000000',
      fontWeight: 600
    },
    userEmail: {
      color: '#000000',
      opacity: 0.7
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      backdrop="static"
      keyboard={false}
      centered
      size="lg"
      className="locked-account-modal"
    >
      <div className="modal-content border-0" style={styles.modalContent}>
        <div className="modal-header border-0 bg-danger text-white p-4">
          <div className="d-flex align-items-center w-100 justify-content-center position-relative">
            <div className="position-absolute" style={{ left: 0 }}>
              <div className="lock-icon-container bg-white rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '50px', height: '50px' }}>
                <i className="fas fa-lock text-danger" style={{ fontSize: '22px' }}></i>
              </div>
            </div>
            <h3 className="modal-title text-center mb-0 fw-bold">Tài khoản bị khóa</h3>
          </div>
        </div>
        
        <div className="modal-body p-0">
          {showSuccess && (
            <Alert variant="success" className="m-3 d-flex align-items-center shadow-sm">
              <div className="me-3 fs-4">
                <i className="fas fa-check-circle text-success"></i>
              </div>
              <div>
                <h5 className="alert-heading mb-1">Gửi khiếu nại thành công!</h5>
                <p className="mb-0">
                  Khiếu nại của bạn đã được gửi thành công. Chúng tôi sẽ xem xét và phản hồi sớm nhất có thể.
                </p>
              </div>
            </Alert>
          )}
          
          <div className="user-info p-4 text-center border-bottom" style={styles.userInfo}>
            <div className="user-avatar mx-auto mb-3 bg-white rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '80px', height: '80px' }}>
              <span className="fw-bold text-danger" style={{ fontSize: '30px' }}>
                {user.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <h4 className="mb-2" style={styles.userName}>{user.username}</h4>
            <p className="mb-0" style={styles.userEmail}>{user.email}</p>
            <div className="mt-2">
              <Badge bg="danger" className="py-2 px-3 fs-6">Đã bị khóa</Badge>
            </div>
          </div>
          
          <div className="lock-details p-4">
            <Card className="mb-4 border-0 shadow-sm">
              <Card.Body>
                <h5 className="card-title mb-3 text-danger">
                  <i className="fas fa-exclamation-circle me-2"></i>
                  Thông tin khóa tài khoản
                </h5>
                
                <div className="lock-info">
                  <div className="info-item d-flex mb-3 align-items-start">
                    <div className="icon-container me-3 mt-1" style={styles.iconContainer}>
                      <i className="fas fa-info-circle text-primary"></i>
                    </div>
                    <div>
                      <h6 className="mb-1 fw-bold">Lý do khóa</h6>
                      <p className="mb-0">{user.reason || 'Không có thông tin'}</p>
                    </div>
                  </div>
                  
                  <div className="info-item d-flex mb-3 align-items-start">
                    <div className="icon-container me-3 mt-1" style={styles.iconContainer}>
                      <i className="fas fa-calendar-times text-danger"></i>
                    </div>
                    <div>
                      <h6 className="mb-1 fw-bold">Thời gian khóa</h6>
                      <p className="mb-0">{formatDate(user.lock_time)}</p>
                    </div>
                  </div>
                  
                  <div className="info-item d-flex align-items-start">
                    <div className="icon-container me-3 mt-1" style={styles.iconContainer}>
                      <i className="fas fa-calendar-check text-success"></i>
                    </div>
                    <div>
                      <h6 className="mb-1 fw-bold">Thời gian mở khóa dự kiến</h6>
                      <p className="mb-0">{formatDate(user.unlock_time)}</p>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
            
            <div className="alert alert-warning border-0 shadow-sm d-flex">
              <div className="me-3 fs-4">
                <i className="fas fa-lightbulb text-warning"></i>
              </div>
              <div>
                <h5 className="alert-heading mb-1">Lưu ý</h5>
                <p className="mb-0">
                  Nếu bạn cho rằng tài khoản của bạn bị khóa nhầm, vui lòng gửi khiếu nại để được hỗ trợ.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="modal-footer border-0 p-4 d-flex justify-content-between bg-light">
          <Button variant="outline-secondary" onClick={handleInstantLogout} className="px-4 py-2">
            <i className="fas fa-sign-out-alt me-2"></i>
            Đăng xuất
          </Button>
          <Button variant="danger" onClick={onAppeal} className="px-4 py-2">
            <i className="fas fa-paper-plane me-2"></i>
            Gửi khiếu nại
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default LockedAccountModal; 