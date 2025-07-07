import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Alert, Button, Table, Badge, Card, Modal, Form, Pagination } from 'react-bootstrap';
import AdminLayout from '../../components/admin/Layout';
import { api } from '../../services/api';
import type { User } from '../../services/api';
import './Dashboard.css';

interface LockedAccountsProps {
  onLogout?: () => void;
}

const LockedAccounts: React.FC<LockedAccountsProps> = ({ onLogout }) => {
  const [lockedUsers, setLockedUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  
  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);

  useEffect(() => {
    fetchLockedAccounts();
  }, []);

  useEffect(() => {
    // Lọc người dùng bị khóa khi searchTerm thay đổi
    const filtered = lockedUsers.filter(user => 
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.reason && user.reason.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.user_id !== undefined && user.user_id.toString().includes(searchTerm))
    );
    
    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [searchTerm, lockedUsers]);

  const fetchLockedAccounts = async () => {
    try {
      const data = await api.getLockedAccounts();
      setLockedUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu tài khoản bị khóa:', error);
      setMessage('Lỗi khi tải dữ liệu từ server');
    }
  };

  // Lấy danh sách người dùng hiện tại dựa vào trang hiện tại
  const getCurrentUsers = () => {
    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    return filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  };
  
  // Tính tổng số trang
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  
  // Xử lý chuyển trang
  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };
  
  // Tạo các mục phân trang
  const renderPaginationItems = () => {
    const items = [];
    
    // Nút Previous
    items.push(
      <Pagination.Prev 
        key="prev" 
        onClick={() => paginate(currentPage - 1)} 
        disabled={currentPage === 1}
      />
    );
    
    // Hiển thị trang đầu tiên
    if (currentPage > 3) {
      items.push(
        <Pagination.Item key={1} onClick={() => paginate(1)}>
          1
        </Pagination.Item>
      );
      
      if (currentPage > 4) {
        items.push(<Pagination.Ellipsis key="ellipsis1" />);
      }
    }
    
    // Hiển thị các trang xung quanh trang hiện tại
    for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages, currentPage + 1); i++) {
      items.push(
        <Pagination.Item 
          key={i} 
          active={i === currentPage}
          onClick={() => paginate(i)}
        >
          {i}
        </Pagination.Item>
      );
    }
    
    // Hiển thị trang cuối cùng
    if (currentPage < totalPages - 2) {
      if (currentPage < totalPages - 3) {
        items.push(<Pagination.Ellipsis key="ellipsis2" />);
      }
      
      items.push(
        <Pagination.Item 
          key={totalPages} 
          onClick={() => paginate(totalPages)}
        >
          {totalPages}
        </Pagination.Item>
      );
    }
    
    // Nút Next
    items.push(
      <Pagination.Next 
        key="next" 
        onClick={() => paginate(currentPage + 1)} 
        disabled={currentPage === totalPages || totalPages === 0}
      />
    );
    
    return items;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return 'Ngày không hợp lệ';
    }
  };

  const handleShowInfo = (user: User) => {
    setSelectedUser(user);
    setShowInfoModal(true);
  };

  const handleShowUnlockConfirm = (user: User) => {
    setSelectedUser(user);
    setShowUnlockModal(true);
  };

  const handleUnlock = async (userId: number | undefined) => {
    if (!userId) return;
    
    try {
      await api.unlockUser(userId);
      fetchLockedAccounts();
      setMessage('Đã mở khóa tài khoản thành công');
      setShowUnlockModal(false);
      setShowInfoModal(false);
    } catch (error: any) {
      console.error('Lỗi khi mở khóa tài khoản:', error);
      setMessage(error.message || 'Lỗi khi mở khóa tài khoản');
    }
  };

  const getRoleBadge = (roleId: number) => {
    switch (roleId) {
      case 1:
        return <Badge bg="danger">Admin</Badge>;
      case 2:
        return <Badge bg="primary">User</Badge>;
      default:
        return <Badge bg="secondary">Unknown</Badge>;
    }
  };

  const getLockStatus = (user: User) => {
    if (user.lock_status === 'locked') {
      return <Badge bg="danger">Đã khóa</Badge>;
    } else {
      return <Badge bg="success">Đã mở khóa</Badge>;
    }
  };

  return (
    <AdminLayout onLogout={onLogout}>
      <h2 className="page-title mb-4">Danh sách tài khoản bị khóa</h2>
      <Container fluid className="admin-container">
        {message && (
          <Alert
            variant="info"
            dismissible
            onClose={() => setMessage('')}
            className="my-3"
          >
            {message}
          </Alert>
        )}

        <Card className="mb-4">
          <Card.Header>
            <Row className="align-items-center">
              <Col>
                <h5 className="mb-0">Danh sách tài khoản bị khóa</h5>
              </Col>
              <Col md={4}>
                <div className="position-relative">
                  <Form.Control
                    type="text"
                    placeholder="Tìm kiếm theo tên, email, lý do khóa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pe-4"
                  />
                  <i className="fas fa-search position-absolute" style={{ right: '10px', top: '10px', color: '#aaa' }}></i>
                </div>
              </Col>
              <Col md="auto">
                <Button 
                  variant="success" 
                  onClick={async () => {
                    try {
                      const result = await api.autoUnlockExpiredAccounts();
                      fetchLockedAccounts();
                      setMessage(result.message || 'Đã tự động mở khóa các tài khoản đến hạn');
                    } catch (error: any) {
                      setMessage(error.message || 'Lỗi khi tự động mở khóa');
                    }
                  }}
                  className="d-flex align-items-center me-2"
                >
                  <i className="fas fa-unlock-alt me-1"></i> Tự động mở khóa đến hạn
                </Button>
                <Button 
                  variant="primary" 
                  onClick={fetchLockedAccounts}
                  className="d-flex align-items-center"
                >
                  <i className="fas fa-sync-alt me-1"></i> Làm mới
                </Button>
              </Col>
            </Row>
          </Card.Header>
          <Card.Body>
            <Table responsive hover className="mb-0">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tài khoản</th>
                  <th>Vai trò</th>
                  <th>Lý do khóa</th>
                  <th>Thời gian khóa</th>
                  <th>Thời gian mở khóa</th>
                  <th style={{ width: '120px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentUsers().length > 0 ? (
                  getCurrentUsers().map((user) => (
                    <tr key={user.user_id}>
                      <td>{user.user_id}</td>
                      <td>
                        <div className="d-flex flex-column">
                          <span>{user.username}</span>
                          <small className="text-muted">{user.email}</small>
                        </div>
                      </td>
                      <td>{user.role_name && getRoleBadge(user.role_id)}</td>
                      <td>
                        <div className="text-truncate" style={{ maxWidth: '200px' }}>
                          {user.reason || 'Không có lý do'}
                        </div>
                      </td>
                      <td>{formatDate(user.lock_time)}</td>
                      <td>{formatDate(user.unlock_time)}</td>
                      <td>
                        <Button
                          variant="outline-info"
                          size="sm"
                          className="me-1"
                          onClick={() => handleShowInfo(user)}
                          title="Xem chi tiết"
                        >
                          <i className="fas fa-info-circle"></i>
                        </Button>
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() => handleShowUnlockConfirm(user)}
                          title="Mở khóa"
                        >
                          <i className="fas fa-unlock"></i>
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-4">
                      <div className="d-flex flex-column align-items-center">
                        <i className="fas fa-lock text-muted mb-2" style={{ fontSize: '2rem' }}></i>
                        <p className="mb-0">Không có tài khoản nào bị khóa</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card.Body>
          {totalPages > 1 && (
            <Card.Footer>
              <Pagination className="justify-content-center mb-0">
                {renderPaginationItems()}
              </Pagination>
            </Card.Footer>
          )}
        </Card>

        {/* Modal thông tin chi tiết khóa tài khoản */}
        <Modal 
          show={showInfoModal} 
          onHide={() => setShowInfoModal(false)}
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>Chi tiết khóa tài khoản</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedUser && (
              <div>
                <Row className="mb-3">
                  <Col md={6}>
                    <h5>Thông tin người dùng</h5>
                    <Table bordered hover size="sm">
                      <tbody>
                        <tr>
                          <td className="fw-bold" style={{ width: '150px' }}>ID</td>
                          <td>{selectedUser.user_id}</td>
                        </tr>
                        <tr>
                          <td className="fw-bold">Tên người dùng</td>
                          <td>{selectedUser.username}</td>
                        </tr>
                        <tr>
                          <td className="fw-bold">Email</td>
                          <td>{selectedUser.email}</td>
                        </tr>
                        <tr>
                          <td className="fw-bold">Vai trò</td>
                          <td>{getRoleBadge(selectedUser.role_id)}</td>
                        </tr>
                      </tbody>
                    </Table>
                  </Col>
                  <Col md={6}>
                    <h5>Thông tin khóa tài khoản</h5>
                    <Table bordered hover size="sm">
                      <tbody>
                        <tr>
                          <td className="fw-bold" style={{ width: '150px' }}>Trạng thái</td>
                          <td>{getLockStatus(selectedUser)}</td>
                        </tr>
                        <tr>
                          <td className="fw-bold">ID khóa</td>
                          <td>{selectedUser.lock_id || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="fw-bold">Thời gian khóa</td>
                          <td>{formatDate(selectedUser.lock_time)}</td>
                        </tr>
                        <tr>
                          <td className="fw-bold">Thời gian mở khóa</td>
                          <td>{formatDate(selectedUser.unlock_time)}</td>
                        </tr>
                      </tbody>
                    </Table>
                  </Col>
                </Row>
                <div className="mb-3">
                  <h5>Lý do khóa tài khoản</h5>
                  <div className="p-3 bg-light rounded">
                    {selectedUser.reason || 'Không có lý do'}
                  </div>
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            {selectedUser && (
              <>
                <Button 
                  variant="success" 
                  onClick={() => handleShowUnlockConfirm(selectedUser)}
                >
                  <i className="fas fa-unlock me-1"></i> Mở khóa tài khoản
                </Button>
                <Button variant="secondary" onClick={() => setShowInfoModal(false)}>
                  Đóng
                </Button>
              </>
            )}
          </Modal.Footer>
        </Modal>

        {/* Modal xác nhận mở khóa tài khoản */}
        <Modal
          show={showUnlockModal}
          onHide={() => setShowUnlockModal(false)}
        >
          <Modal.Header closeButton>
            <Modal.Title>Xác nhận mở khóa tài khoản</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedUser && (
              <div>
                <Alert variant="warning">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  Bạn có chắc chắn muốn mở khóa tài khoản này?
                </Alert>
                
                <h6 className="fw-bold mt-3">Thông tin tài khoản:</h6>
                <p><strong>Tên người dùng:</strong> {selectedUser.username}</p>
                <p><strong>Email:</strong> {selectedUser.email}</p>
                
                <h6 className="fw-bold mt-3">Thông tin khóa:</h6>
                <div className="mb-2">
                  <strong>Lý do khóa:</strong>
                  <div className="p-2 bg-light rounded mt-1">
                    {selectedUser.reason || 'Không có lý do'}
                  </div>
                </div>
                
                <div className="d-flex">
                  <div className="me-3">
                    <strong>Thời gian khóa:</strong>
                    <div className="text-danger">{formatDate(selectedUser.lock_time)}</div>
                  </div>
                  <div>
                    <strong>Thời hạn khóa đến:</strong>
                    <div className="text-danger">{formatDate(selectedUser.unlock_time)}</div>
                  </div>
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowUnlockModal(false)}>
              Hủy
            </Button>
            <Button 
              variant="success" 
              onClick={() => selectedUser && handleUnlock(selectedUser.user_id)}
            >
              <i className="fas fa-unlock me-1"></i> Xác nhận mở khóa
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </AdminLayout>
  );
};

export default LockedAccounts; 