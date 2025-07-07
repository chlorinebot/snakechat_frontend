import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import type { User } from '../../services/api';

interface AppealFormProps {
  show: boolean;
  user: User;
  onHide: () => void;
  onSubmit: (appealData: AppealData) => Promise<void>;
}

export interface AppealData {
  userId: number;
  username: string;
  email: string;
  reason: string;
  explanation: string;
}

const AppealForm: React.FC<AppealFormProps> = ({
  show,
  user,
  onHide,
  onSubmit
}) => {
  const [explanation, setExplanation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        onHide();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [success, onHide]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      if (!explanation.trim()) {
        setError('Vui lòng nhập nội dung giải thích');
        setIsSubmitting(false);
        return;
      }
      
      const appealData: AppealData = {
        userId: user.user_id || 0,
        username: user.username,
        email: user.email,
        reason: user.reason || 'Không có thông tin',
        explanation
      };
      
      await onSubmit(appealData);
      setSuccess('Khiếu nại của bạn đã được gửi thành công. Chúng tôi sẽ xem xét và phản hồi sớm nhất có thể.');
      setExplanation('');
    } catch (err) {
      setError('Đã xảy ra lỗi khi gửi khiếu nại. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header className="bg-primary text-white">
        <Modal.Title>
          <i className="bi bi-envelope-exclamation me-2"></i>
          Gửi khiếu nại
        </Modal.Title>
      </Modal.Header>
      
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          
          <div className="mb-4">
            <h5>Thông tin tài khoản</h5>
            <p><strong>Tên đăng nhập:</strong> {user.username}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Lý do khóa:</strong> {user.reason || 'Không có thông tin'}</p>
          </div>
          
          <Form.Group className="mb-3">
            <Form.Label><strong>Lý do khiếu nại</strong></Form.Label>
            <Form.Control
              as="textarea"
              rows={5}
              placeholder="Vui lòng giải thích vì sao bạn cho rằng tài khoản của bạn bị khóa nhầm..."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              required
            />
            <Form.Text className="text-muted">
              Hãy cung cấp chi tiết để giúp chúng tôi xem xét trường hợp của bạn nhanh nhất có thể.
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button 
            variant="primary" 
            type="submit" 
            disabled={isSubmitting || !explanation.trim()}
          >
            {isSubmitting ? 'Đang gửi...' : 'Gửi khiếu nại'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default AppealForm; 