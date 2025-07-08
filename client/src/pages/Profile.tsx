import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Spinner } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import ProfileInfo from '../components/profile/ProfileInfo';
import { useAuth } from '../contexts/AuthContext';
import './Profile.css';

const Profile: React.FC = () => {
  const { userId: paramUserId } = useParams<{ userId?: string }>();
  const { currentUser } = useAuth();
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Nếu có userId trong params, sử dụng nó, ngược lại sử dụng currentUser.user_id
    if (paramUserId) {
      setUserId(parseInt(paramUserId, 10));
    } else if (currentUser?.user_id) {
      setUserId(currentUser.user_id);
    }
    setLoading(false);
  }, [paramUserId, currentUser]);

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Đang tải...</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <Container className="my-5">
        <div className="text-center">
          <h3>Không tìm thấy người dùng</h3>
          <p>Không thể xác định người dùng để hiển thị thông tin.</p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="my-4 profile-container">
      <Row className="justify-content-center">
        <Col lg={10}>
          <h2 className="mb-4 text-center">Hồ sơ người dùng</h2>
          <ProfileInfo userId={userId} />
        </Col>
      </Row>
    </Container>
  );
};

export default Profile; 