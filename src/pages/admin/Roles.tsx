import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Alert, Button, Table, Card, Modal, Form, Pagination } from 'react-bootstrap';
import AdminLayout from '../../components/admin/Layout';
import { api } from '../../services/api';
import type { Role } from '../../services/api';
import './Dashboard.css';

type SortField = 'role_id' | 'role_name';
type SortDirection = 'asc' | 'desc';

interface RolesProps {
  onLogout?: () => void;
}

const Roles: React.FC<RolesProps> = ({ onLogout }) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [filteredRoles, setFilteredRoles] = useState<Role[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [sortField, setSortField] = useState<SortField>('role_id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<number | null>(null);
  
  // Form states
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  
  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [rolesPerPage] = useState(10);

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    // Lọc roles khi searchTerm thay đổi
    const filtered = roles.filter(role => 
      role.role_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (role.role_id !== undefined && role.role_id.toString().includes(searchTerm))
    );
    
    // Sắp xếp roles theo trường đang được chọn
    const sorted = sortRoles([...filtered]);
    setFilteredRoles(sorted);
    
    // Reset về trang đầu tiên khi thay đổi bộ lọc
    setCurrentPage(1);
  }, [searchTerm, roles, sortField, sortDirection]);

  const fetchRoles = async () => {
    try {
      const data = await api.getRoles();
      setRoles(data);
      const sorted = sortRoles([...data]);
      setFilteredRoles(sorted);
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu vai trò:', error);
      setMessage('Lỗi khi tải dữ liệu từ server');
    }
  };

  const sortRoles = (rolesToSort: Role[]) => {
    return rolesToSort.sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      
      switch(sortField) {
        case 'role_id':
          return ((a.role_id || 0) - (b.role_id || 0)) * direction;
        
        case 'role_name':
          return a.role_name.localeCompare(b.role_name) * direction;
        
        default:
          return 0;
      }
    });
  };

  // Lấy danh sách vai trò hiện tại dựa vào trang hiện tại
  const getCurrentRoles = () => {
    const indexOfLastRole = currentPage * rolesPerPage;
    const indexOfFirstRole = indexOfLastRole - rolesPerPage;
    return filteredRoles.slice(indexOfFirstRole, indexOfLastRole);
  };
  
  // Tính tổng số trang
  const totalPages = Math.ceil(filteredRoles.length / rolesPerPage);
  
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

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      // Nếu field đã được chọn, đổi hướng sắp xếp
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Nếu chọn field mới, đặt hướng sắp xếp mặc định (asc)
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (field !== sortField) {
      return <i className="fas fa-sort text-muted ms-1"></i>;
    }
    
    return sortDirection === 'asc' 
      ? <i className="fas fa-sort-up ms-1"></i> 
      : <i className="fas fa-sort-down ms-1"></i>;
  };

  const resetForm = () => {
    setRoleName('');
    setDescription('');
    setSelectedRole(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (role: Role) => {
    setSelectedRole(role);
    setRoleName(role.role_name);
    setDescription(role.description);
    setShowEditModal(true);
  };

  const openDeleteModal = (roleId: number) => {
    setRoleToDelete(roleId);
    setShowDeleteModal(true);
  };

  const handleAdd = async () => {
    if (!roleName || !description) {
      setMessage('Vui lòng nhập đầy đủ thông tin vai trò');
      return;
    }

    try {
      await api.createRole({
        role_name: roleName,
        description,
      });
      
      fetchRoles();
      setShowAddModal(false);
      resetForm();
      setMessage('Đã thêm vai trò mới thành công');
    } catch (error: any) {
      console.error('Lỗi khi thêm vai trò:', error);
      setMessage(error.message || 'Lỗi khi thêm vai trò');
    }
  };

  const handleEdit = async () => {
    if (!selectedRole || !roleName || !description) {
      setMessage('Vui lòng nhập đầy đủ thông tin vai trò');
      return;
    }

    try {
      await api.updateRole({
        role_id: selectedRole.role_id,
        role_name: roleName,
        description,
      });
      
      fetchRoles();
      setShowEditModal(false);
      resetForm();
      setMessage('Đã cập nhật vai trò thành công');
    } catch (error: any) {
      console.error('Lỗi khi cập nhật vai trò:', error);
      setMessage(error.message || 'Lỗi khi cập nhật vai trò');
    }
  };

  const handleDelete = async () => {
    if (!roleToDelete) return;

    try {
      await api.deleteRole(roleToDelete);
      fetchRoles();
      setShowDeleteModal(false);
      setRoleToDelete(null);
      setMessage('Đã xóa vai trò thành công');
    } catch (error: any) {
      console.error('Lỗi khi xóa vai trò:', error);
      setMessage(error.message || 'Lỗi khi xóa vai trò');
    }
  };

  return (
    <AdminLayout onLogout={onLogout}>
      <h2 className="page-title mb-4">Quản lý vai trò</h2>
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
                <h5 className="mb-0">Danh sách vai trò</h5>
              </Col>
              <Col md={4}>
                <div className="position-relative">
                  <Form.Control
                    type="text"
                    placeholder="Tìm kiếm vai trò..."
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
                  <i className="fas fa-plus me-1"></i> Thêm vai trò
                </Button>
              </Col>
            </Row>
          </Card.Header>
          <Card.Body>
            <Table responsive hover className="mb-0">
              <thead>
                <tr>
                  <th 
                    className="cursor-pointer" 
                    onClick={() => handleSort('role_id')}
                  >
                    ID {getSortIcon('role_id')}
                  </th>
                  <th 
                    className="cursor-pointer" 
                    onClick={() => handleSort('role_name')}
                  >
                    Tên vai trò {getSortIcon('role_name')}
                  </th>
                  <th>Mô tả</th>
                  <th style={{ width: '120px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentRoles().map((role) => (
                  <tr key={role.role_id}>
                    <td>{role.role_id}</td>
                    <td>{role.role_name}</td>
                    <td>{role.description}</td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-1"
                        onClick={() => openEditModal(role)}
                        title="Sửa"
                      >
                        <i className="fas fa-edit"></i>
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => openDeleteModal(role.role_id)}
                        title="Xóa"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </Button>
                    </td>
                  </tr>
                ))}
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

        {/* Modal thêm vai trò */}
        <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Thêm vai trò mới</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Tên vai trò</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Nhập tên vai trò"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Mô tả</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Nhập mô tả vai trò"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleAdd}>
              Thêm
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Modal sửa vai trò */}
        <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Sửa vai trò</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Tên vai trò</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Nhập tên vai trò"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Mô tả</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Nhập mô tả vai trò"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleEdit}>
              Cập nhật
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Modal xác nhận xóa */}
        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Xác nhận xóa</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Bạn có chắc chắn muốn xóa vai trò này không? <br />
            <strong className="text-danger">Lưu ý: Bạn không thể xóa vai trò đang được gán cho người dùng!</strong>
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
    </AdminLayout>
  );
};

export default Roles; 