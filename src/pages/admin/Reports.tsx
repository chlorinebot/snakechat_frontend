import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Alert, Button, Table, Badge, Card, Modal, Form, Pagination } from 'react-bootstrap';
import AdminLayout from '../../components/admin/Layout';
import api from '../../services/api';
import type { Report } from '../../services/api';
import './Dashboard.css';

interface ReportsProps {
  onLogout?: () => void;
}

const Reports: React.FC<ReportsProps> = ({ onLogout }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [noteText, setNoteText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'unresolved' | 'received' | 'resolved'>('unresolved');
  
  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [reportsPerPage] = useState(10);

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    // Lọc báo cáo khi searchTerm thay đổi
    const filtered = reports.filter(report => 
      (report.title && report.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (report.content && report.content.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (report.username && report.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (report.id_reports !== undefined && report.id_reports.toString().includes(searchTerm))
    );
    
    setFilteredReports(filtered);
    setCurrentPage(1);
  }, [searchTerm, reports]);

  const fetchReports = async () => {
    try {
      const data = await api.getAllReports();
      setReports(data);
      setFilteredReports(data);
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu báo cáo:', error);
      setMessage('Lỗi khi tải dữ liệu từ server');
    }
  };

  // Lấy danh sách báo cáo hiện tại dựa vào trang hiện tại
  const getCurrentReports = () => {
    const indexOfLastReport = currentPage * reportsPerPage;
    const indexOfFirstReport = indexOfLastReport - reportsPerPage;
    return filteredReports.slice(indexOfFirstReport, indexOfLastReport);
  };
  
  // Tính tổng số trang
  const totalPages = Math.ceil(filteredReports.length / reportsPerPage);
  
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

  const handleShowNoteModal = (report: Report) => {
    setSelectedReport(report);
    setNoteText(report.notes || '');
    setSelectedStatus(report.status as 'unresolved' | 'received' | 'resolved' || 'unresolved');
    setShowNoteModal(true);
  };

  const handleUpdateReport = async () => {
    if (!selectedReport?.id_reports) return;
    
    try {
      const result = await api.updateReportStatus(selectedReport.id_reports, selectedStatus, noteText);
      
      if (result.success) {
        setMessage('Đã cập nhật trạng thái báo cáo thành công');
        fetchReports(); // Tải lại danh sách báo cáo
      } else {
        setMessage(`Lỗi: ${result.message}`);
      }
      
      setShowNoteModal(false);
    } catch (error: any) {
      console.error('Lỗi khi cập nhật báo cáo:', error);
      setMessage(`Lỗi: ${error.message || 'Không thể cập nhật báo cáo'}`);
    }
  };

  const getReportTypeBadge = (reportType: string) => {
    switch (reportType) {
      case 'bug_report':
        return <Badge bg="danger">Báo lỗi</Badge>;
      case 'suggestion':
        return <Badge bg="primary">Góp ý</Badge>;
      case 'complaint':
        return <Badge bg="warning" text="dark">Khiếu nại</Badge>;
      default:
        return <Badge bg="secondary">Khác</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'unresolved':
        return <Badge bg="danger">Chưa xử lý</Badge>;
      case 'received':
        return <Badge bg="warning" text="dark">Đang xử lý</Badge>;
      case 'resolved':
        return <Badge bg="success">Đã xử lý</Badge>;
      default:
        return <Badge bg="secondary">Không xác định</Badge>;
    }
  };

  return (
    <AdminLayout onLogout={onLogout}>
      <h2 className="page-title mb-4">Quản lý báo cáo và góp ý</h2>
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
                <h5 className="mb-0">Danh sách báo cáo</h5>
              </Col>
              <Col md={4}>
                <div className="position-relative">
                  <Form.Control
                    type="text"
                    placeholder="Tìm kiếm theo tiêu đề, nội dung, người dùng..."
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
                  onClick={fetchReports}
                  className="d-flex align-items-center"
                >
                  <i className="fas fa-sync-alt me-1"></i> Làm mới
                </Button>
              </Col>
            </Row>
          </Card.Header>
          <div className="table-responsive">
            <Table hover className="align-middle mb-0 admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Người dùng</th>
                  <th>Tiêu đề</th>
                  <th>Loại</th>
                  <th>Trạng thái</th>
                  <th>Ngày gửi</th>
                  <th>Ngày xử lý</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentReports().length > 0 ? (
                  getCurrentReports().map((report) => (
                    <tr key={report.id_reports}>
                      <td>{report.id_reports}</td>
                      <td>{report.username || `User ID: ${report.id_user}`}</td>
                      <td>{report.title}</td>
                      <td>{getReportTypeBadge(report.report_type)}</td>
                      <td>{getStatusBadge(report.status || 'unresolved')}</td>
                      <td>{formatDate(report.submission_time)}</td>
                      <td>{report.resolution_time ? formatDate(report.resolution_time) : 'Chưa xử lý'}</td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-1"
                          onClick={() => handleShowNoteModal(report)}
                        >
                          <i className="fas fa-edit"></i>
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-4">Không có báo cáo nào</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
          <Card.Footer>
            <Row className="align-items-center">
              <Col>
                <small className="text-muted">
                  Hiển thị {filteredReports.length > 0 ? (currentPage - 1) * reportsPerPage + 1 : 0}-
                  {Math.min(currentPage * reportsPerPage, filteredReports.length)} 
                  {' '}trên tổng số {filteredReports.length} báo cáo
                </small>
              </Col>
              <Col md="auto">
                <Pagination className="mb-0">
                  {renderPaginationItems()}
                </Pagination>
              </Col>
            </Row>
          </Card.Footer>
        </Card>

        {/* Modal Cập nhật trạng thái báo cáo */}
        <Modal show={showNoteModal} onHide={() => setShowNoteModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Xử lý báo cáo</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedReport && (
              <>
                <div className="mb-3">
                  <h5>Tiêu đề:</h5>
                  <p>{selectedReport.title}</p>
                </div>
                <div className="mb-3">
                  <h5>Nội dung:</h5>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{selectedReport.content}</p>
                </div>
                <div className="mb-3">
                  <h5>Loại báo cáo:</h5>
                  <p>{getReportTypeBadge(selectedReport.report_type)}</p>
                </div>
                <div className="mb-3">
                  <h5>Ngày gửi:</h5>
                  <p>{formatDate(selectedReport.submission_time)}</p>
                </div>
                <Form.Group className="mb-3">
                  <Form.Label>Trạng thái:</Form.Label>
                  <Form.Select 
                    value={selectedStatus} 
                    onChange={(e) => setSelectedStatus(e.target.value as 'unresolved' | 'received' | 'resolved')}
                  >
                    <option value="unresolved">Chưa xử lý</option>
                    <option value="received">Đang xử lý</option>
                    <option value="resolved">Đã xử lý</option>
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Ghi chú:</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={3} 
                    value={noteText} 
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Nhập ghi chú về việc xử lý báo cáo..."
                  />
                </Form.Group>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowNoteModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleUpdateReport}>
              Cập nhật
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </AdminLayout>
  );
};

export default Reports; 