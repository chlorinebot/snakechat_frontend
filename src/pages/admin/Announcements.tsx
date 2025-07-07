import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Alert, Button, Table, Card, Modal, Form, Pagination, Badge } from 'react-bootstrap';
import AdminLayout from '../../components/admin/Layout';
import { api } from '../../services/api';
import './Dashboard.css';

// Định nghĩa kiểu dữ liệu cho thông báo
interface Announcement {
  AnnouncementID: number;
  AnnouncementContent: string;
  AnnouncementType: string;
  CreatedAt: string;
}

interface AnnouncementsProps {
  onLogout: () => void;
}

const Announcements: React.FC<AnnouncementsProps> = ({ onLogout }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [announcementsPerPage] = useState<number>(10);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null);
  
  // Form states
  const [content, setContent] = useState<string>('');
  const [announcementType, setAnnouncementType] = useState<string>('Thông tin');
  
  // Lấy danh sách thông báo
  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const response = await api.getAnnouncements();
      if (response.success) {
        setAnnouncements(response.items);
        setMessage(''); // Clear error message khi thành công
      } else {
        setMessage('⚠️ Không thể tải danh sách thông báo: ' + response.message);
      }
    } catch (error: any) {
      console.error('Lỗi khi tải danh sách thông báo:', error);
      
      // Hiển thị thông báo lỗi chi tiết hơn
      if (error.response?.status === 500) {
        setMessage('❌ Lỗi server: Có vấn đề với cơ sở dữ liệu. Vui lòng kiểm tra:\n' +
                  '1. Kết nối database\n' +
                  '2. Bảng GeneralAnnouncement có tồn tại không\n' +
                  '3. Khởi động lại backend server');
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        setMessage('🌐 Lỗi kết nối mạng: Không thể kết nối đến server backend. ' +
                  'Vui lòng kiểm tra backend có đang chạy không.');
      } else {
        setMessage('❌ Lỗi khi tải danh sách thông báo: ' + (error.message || 'Lỗi không xác định'));
      }
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchAnnouncements();
  }, []);
  
  // Tìm kiếm thông báo
  const filteredAnnouncements = announcements.filter(announcement => {
    return (
      announcement.AnnouncementContent.toLowerCase().includes(searchTerm.toLowerCase()) ||
      announcement.AnnouncementType.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });
  
  // Phân trang
  const indexOfLastAnnouncement = currentPage * announcementsPerPage;
  const indexOfFirstAnnouncement = indexOfLastAnnouncement - announcementsPerPage;
  const currentAnnouncements = filteredAnnouncements.slice(indexOfFirstAnnouncement, indexOfLastAnnouncement);
  
  // Thay đổi trang
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  
  // Hiển thị phân trang
  const renderPaginationItems = () => {
    const totalPages = Math.ceil(filteredAnnouncements.length / announcementsPerPage);
    const pageItems = [];
    
    // Previous button
    pageItems.push(
      <Pagination.Prev 
        key="prev"
        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
        disabled={currentPage === 1}
      />
    );
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      pageItems.push(
        <Pagination.Item 
          key={i} 
          active={i === currentPage}
          onClick={() => paginate(i)}
        >
          {i}
        </Pagination.Item>
      );
    }
    
    // Next button
    pageItems.push(
      <Pagination.Next 
        key="next"
        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
        disabled={currentPage === totalPages || totalPages === 0}
      />
    );
    
    return pageItems;
  };
  
  // Reset form
  const resetForm = () => {
    setContent('');
    setAnnouncementType('Thông tin');
  };
  
  // Mở modal thêm thông báo
  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };
  
  // Mở modal xem chi tiết thông báo
  const openViewModal = (announcement: Announcement) => {
    setCurrentAnnouncement(announcement);
    setContent(announcement.AnnouncementContent);
    setAnnouncementType(announcement.AnnouncementType);
    setShowEditModal(true);
  };
  
  // Mở modal xóa thông báo
  const openDeleteModal = (announcement: Announcement) => {
    setCurrentAnnouncement(announcement);
    setShowDeleteModal(true);
  };
  
  // Thêm thông báo mới
  const handleAdd = async () => {
    if (!content || !announcementType) {
      setMessage('Vui lòng điền đầy đủ thông tin');
      return;
    }
    
    try {
      const response = await api.createAnnouncement({
        content,
        announcementType
      });
      
      if (response.success) {
        setMessage('Thêm thông báo thành công và đã gửi đến tất cả người dùng');
        fetchAnnouncements();
        setShowAddModal(false);
        resetForm();
      } else {
        setMessage('Không thể thêm thông báo: ' + response.message);
      }
    } catch (error) {
      console.error('Lỗi khi thêm thông báo:', error);
      setMessage('Lỗi khi thêm thông báo');
    }
  };
  
  // Xóa thông báo
  const handleDelete = async () => {
    if (!currentAnnouncement) return;
    
    try {
      const response = await api.deleteAnnouncement(currentAnnouncement.AnnouncementID);
      
      if (response.success) {
        setMessage('Xóa thông báo thành công');
        fetchAnnouncements();
        setShowDeleteModal(false);
      } else {
        setMessage('Không thể xóa thông báo: ' + response.message);
      }
    } catch (error) {
      console.error('Lỗi khi xóa thông báo:', error);
      setMessage('Lỗi khi xóa thông báo');
    }
  };
  
  // Format thời gian
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Hiển thị loại thông báo
  const getAnnouncementTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'thông tin':
        return <Badge bg="info">Thông tin</Badge>;
      case 'cảnh báo':
        return <Badge bg="warning">Cảnh báo</Badge>;
      case 'quan trọng':
        return <Badge bg="danger">Quan trọng</Badge>;
      case 'bảo trì':
        return <Badge bg="secondary">Bảo trì</Badge>;
      case 'cập nhật':
        return <Badge bg="success">Cập nhật</Badge>;
      default:
        return <Badge bg="primary">{type}</Badge>;
    }
  };
  
  return (
    <AdminLayout onLogout={onLogout}>
      <h2 className="page-title mb-4">Quản lý thông báo chung</h2>
      <Container fluid className="admin-container">
        {message && (
          <Alert
            variant={message.includes('❌') || message.includes('⚠️') ? 'danger' : 
                   message.includes('✅') || message.includes('thành công') ? 'success' : 'info'}
            dismissible
            onClose={() => setMessage('')}
            className="my-3"
          >
            <div style={{ whiteSpace: 'pre-line' }}>{message}</div>
            {(message.includes('❌') || message.includes('⚠️')) && (
              <div className="mt-2">
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  onClick={fetchAnnouncements}
                  disabled={loading}
                >
                  <i className="fas fa-sync-alt me-1"></i>
                  {loading ? 'Đang thử lại...' : 'Thử lại'}
                </Button>
              </div>
            )}
          </Alert>
        )}

        <Card className="mb-4">
          <Card.Header>
            <Row className="align-items-center">
              <Col>
                <h5 className="mb-0">Danh sách thông báo</h5>
              </Col>
              <Col md={4}>
                <div className="position-relative">
                  <Form.Control
                    type="text"
                    placeholder="Tìm kiếm thông báo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pe-4"
                  />
                  <i className="fas fa-search position-absolute" style={{ right: '10px', top: '10px', color: '#aaa' }}></i>
                </div>
              </Col>
              <Col md="auto">
                <Button
                  variant="primary"
                  onClick={openAddModal}
                  className="d-flex align-items-center"
                >
                  <i className="fas fa-plus me-1"></i> Thêm thông báo mới
                </Button>
              </Col>
            </Row>
          </Card.Header>
          <Card.Body className="p-0">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Đang tải...</span>
                </div>
                <p className="mt-2">Đang tải dữ liệu...</p>
              </div>
            ) : (
              <Table responsive striped hover className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th className="text-center" style={{ width: '80px' }}>ID</th>
                    <th>Nội dung thông báo</th>
                    <th className="text-center" style={{ width: '150px' }}>Loại</th>
                    <th className="text-center" style={{ width: '180px' }}>Ngày tạo</th>
                    <th className="text-center" style={{ width: '150px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {currentAnnouncements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4">
                        Không có dữ liệu thông báo nào
                      </td>
                    </tr>
                  ) : (
                    currentAnnouncements.map((announcement) => (
                      <tr key={announcement.AnnouncementID}>
                        <td className="text-center">{announcement.AnnouncementID}</td>
                        <td>
                          <div className="announcement-content">{announcement.AnnouncementContent}</div>
                        </td>
                        <td className="text-center">
                          {getAnnouncementTypeBadge(announcement.AnnouncementType)}
                        </td>
                        <td className="text-center">{formatDate(announcement.CreatedAt)}</td>
                        <td className="text-center">
                          <div className="d-flex justify-content-center">
                            <Button
                              variant="outline-info"
                              size="sm"
                              className="me-2"
                              onClick={() => openViewModal(announcement)}
                            >
                              <i className="fas fa-eye"></i>
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => openDeleteModal(announcement)}
                            >
                              <i className="fas fa-trash-alt"></i>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            )}
          </Card.Body>
          {filteredAnnouncements.length > announcementsPerPage && (
            <Card.Footer>
              <div className="d-flex justify-content-between align-items-center">
                <small className="text-muted">
                  Hiển thị {indexOfFirstAnnouncement + 1} đến {Math.min(indexOfLastAnnouncement, filteredAnnouncements.length)} trong số {filteredAnnouncements.length} thông báo
                </small>
                <Pagination className="mb-0">
                  {renderPaginationItems()}
                </Pagination>
              </div>
            </Card.Footer>
          )}
        </Card>

        {/* Modal thêm thông báo */}
        <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Thêm thông báo mới</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Loại thông báo</Form.Label>
                <Form.Select
                  value={announcementType}
                  onChange={(e) => setAnnouncementType(e.target.value)}
                >
                  <option value="Thông tin">Thông tin</option>
                  <option value="Cảnh báo">Cảnh báo</option>
                  <option value="Quan trọng">Quan trọng</option>
                  <option value="Bảo trì">Bảo trì</option>
                  <option value="Cập nhật">Cập nhật</option>
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Nội dung thông báo</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  placeholder="Nhập nội dung thông báo"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <Form.Text className="text-muted">
                  Thông báo này sẽ được gửi đến tất cả người dùng trong hệ thống
                </Form.Text>
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleAdd}>
              Tạo và gửi thông báo
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Modal sửa thông báo */}
        <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Xem chi tiết thông báo</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Loại thông báo</Form.Label>
                <Form.Select
                  value={announcementType}
                  onChange={(e) => setAnnouncementType(e.target.value)}
                  disabled
                >
                  <option value="Thông tin">Thông tin</option>
                  <option value="Cảnh báo">Cảnh báo</option>
                  <option value="Quan trọng">Quan trọng</option>
                  <option value="Bảo trì">Bảo trì</option>
                  <option value="Cập nhật">Cập nhật</option>
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Nội dung thông báo</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  placeholder="Nhập nội dung thông báo"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  readOnly
                />
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Đóng
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Modal xác nhận xóa */}
        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
          <Modal.Header closeButton className="bg-danger text-white">
            <Modal.Title>Xác nhận xóa</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>Bạn có chắc chắn muốn xóa thông báo này không?</p>
            {currentAnnouncement && (
              <div className="p-3 bg-light rounded">
                <strong>ID:</strong> {currentAnnouncement.AnnouncementID} <br />
                <strong>Loại:</strong> {currentAnnouncement.AnnouncementType} <br />
                <strong>Nội dung:</strong> {currentAnnouncement.AnnouncementContent}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Hủy
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Xóa
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
      
      <style>
        {`
          .announcement-content {
            max-height: 100px;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
          }
        `}
      </style>
    </AdminLayout>
  );
};

export default Announcements; 