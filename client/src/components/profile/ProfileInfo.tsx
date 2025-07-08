import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import { api } from '../../services/api';
import type { User } from '../../services/api';
import AvatarUpload from './AvatarUpload';
import './ProfileInfo.css';

interface ProfileInfoProps {
  userId: number;
}

const ProfileInfo: React.FC<ProfileInfoProps> = ({ userId }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  
  // Form state
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [birthday, setBirthday] = useState<string>('');
  const [avatar, setAvatar] = useState<string>('');

  // Lấy thông tin người dùng khi component được mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const userData = await api.getUserById(userId);
        
        if (userData) {
          setUser(userData);
          setUsername(userData.username || '');
          setEmail(userData.email || '');
          setBirthday(userData.birthday ? new Date(userData.birthday).toISOString().split('T')[0] : '');
          setAvatar(userData.avatar || '');
        } else {
          setError('Không thể tải thông tin người dùng');
        }
      } catch (err) {
        setError('Đã xảy ra lỗi khi tải thông tin người dùng');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  // Xử lý khi người dùng cập nhật thông tin
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      if (!user) return;

      const updateData: User = {
        user_id: user.user_id,
        username,
        email,
        password: user.password || '',
        role_id: user.role_id || 2,
        birthday,
        avatar
      };

      const response = await api.updateUser(updateData);
      
      if (response) {
        setUser({
          ...user,
          username,
          email,
          birthday,
          avatar
        });
        setSuccess('Cập nhật thông tin thành công');
        setIsEditing(false);
      } else {
        setError('Không thể cập nhật thông tin');
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi cập nhật thông tin');
    } finally {
      setLoading(false);
    }
  };

  // Xử lý khi avatar được cập nhật
  const handleAvatarUpdate = (newAvatarUrl: string) => {
    setAvatar(newAvatarUrl);
    if (user) {
      setUser({
        ...user,
        avatar: newAvatarUrl
      });
    }
  };

  // Hiển thị trạng thái loading
  if (loading && !user) {
    return (
      <div className="text-center my-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
        <p className="mt-2">Đang tải thông tin người dùng...</p>
      </div>
    );
  }

  // Hiển thị lỗi nếu có
  if (error && !user) {
    return (
      <Alert variant="danger" className="my-3">
        {error}
      </Alert>
    );
  }

  return (
    <Card className="profile-card">
      <Card.Header as="h5" className="d-flex justify-content-between align-items-center">
        <span>Thông tin cá nhân</span>
        {!isEditing ? (
          <Button 
            variant="outline-primary" 
            size="sm" 
            onClick={() => setIsEditing(true)}
          >
            <i className="fas fa-edit me-1"></i> Chỉnh sửa
          </Button>
        ) : (
          <Button 
            variant="outline-secondary" 
            size="sm" 
            onClick={() => setIsEditing(false)}
          >
            <i className="fas fa-times me-1"></i> Hủy
          </Button>
        )}
      </Card.Header>
      <Card.Body>
        {error && (
          <Alert variant="danger" onClose={() => setError(null)} dismissible>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert variant="success" onClose={() => setSuccess(null)} dismissible>
            {success}
          </Alert>
        )}
        
        <Row>
          <Col md={4} className="text-center mb-4">
            <AvatarUpload 
              userId={userId} 
              currentAvatar={avatar} 
              onAvatarUpdate={handleAvatarUpdate} 
            />
          </Col>
          <Col md={8}>
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Tên người dùng</Form.Label>
                <Form.Control 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!isEditing}
                  required
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isEditing}
                  required
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Ngày sinh</Form.Label>
                <Form.Control 
                  type="date" 
                  value={birthday} 
                  onChange={(e) => setBirthday(e.target.value)}
                  disabled={!isEditing}
                />
              </Form.Group>
              
              {isEditing && (
                <div className="d-flex justify-content-end">
                  <Button 
                    variant="primary" 
                    type="submit" 
                    disabled={loading}
                  >
                    {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </Button>
                </div>
              )}
            </Form>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default ProfileInfo; 