import React, { useState, useEffect } from 'react';
import './ProfileModal.css';
import api from '../../services/api';
import type { User } from '../../services/api';
import AvatarUpload from '../profile/AvatarUpload';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: number;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, userId }) => {
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [formData, setFormData] = useState<Partial<User>>({
    username: '',
    email: '',
    password: '',
    birthday: ''
  });
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    const fetchUserData = async () => {
      if (!isOpen) return;
      
      setLoading(true);
      try {
        // Lấy thông tin người dùng hiện tại từ localStorage
        const storedUser = localStorage.getItem('user');
        let currentUserId: number | undefined;
        
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          currentUserId = userId || parsedUser.user_id;
        } else if (userId) {
          currentUserId = userId;
        }
        
        if (!currentUserId) {
          setError('Không thể xác định thông tin người dùng');
          setLoading(false);
          return;
        }
        
        // Luôn tải dữ liệu mới nhất từ API để đảm bảo thông tin cập nhật
        const users = await api.getUsers();
        const userFromAPI = users.find(u => u.user_id === currentUserId);
        
        if (!userFromAPI) {
          setError('Không tìm thấy thông tin người dùng');
          setLoading(false);
          return;
        }
        
        console.log('Dữ liệu người dùng từ API:', userFromAPI);
        
        // Cập nhật thông tin người dùng vào localStorage
        if (!userId) {
          localStorage.setItem('user', JSON.stringify(userFromAPI));
        }
        
        setUserData(userFromAPI);
        setFormData({
          username: userFromAPI.username,
          email: userFromAPI.email,
          password: '',
          birthday: userFromAPI.birthday || ''
        });
      } catch (error) {
        console.error('Lỗi khi lấy thông tin người dùng:', error);
        setError('Không thể tải thông tin người dùng. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [isOpen, userId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleEditToggle = () => {
    if (editMode) {
      // Reset form data when canceling edit
      if (userData) {
        setFormData({
          username: userData.username,
          email: userData.email,
          password: '',
          birthday: userData.birthday || ''
        });
      }
    }
    setEditMode(!editMode);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!userData) return;
    
    try {
      const updateData: Partial<User> = {
        user_id: userData.user_id,
        username: formData.username,
        email: formData.email,
        birthday: formData.birthday
      };
      
      // Chỉ cập nhật mật khẩu nếu người dùng nhập mật khẩu mới
      if (formData.password && formData.password.trim() !== '') {
        updateData.password = formData.password;
      }
      
      const response = await api.updateUser(updateData as User);
      console.log('Kết quả cập nhật:', response);
      
      // Tải lại dữ liệu người dùng từ server sau khi cập nhật
      const users = await api.getUsers();
      const updatedUser = users.find(u => u.user_id === userData.user_id);
      
      if (updatedUser) {
        setUserData(updatedUser);
        
        // Cập nhật dữ liệu người dùng trong localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser && !userId) {
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      }
      
      setSuccess('Cập nhật thông tin thành công!');
      
      // Tắt chế độ chỉnh sửa sau khi cập nhật thành công
      setTimeout(() => {
        setEditMode(false);
      }, 1500);
    } catch (error) {
      console.error('Lỗi khi cập nhật thông tin:', error);
      setError('Không thể cập nhật thông tin. Vui lòng thử lại sau.');
    }
  };

  // Xử lý khi avatar được cập nhật
  const handleAvatarUpdate = (newAvatarUrl: string) => {
    if (userData) {
      setUserData({
        ...userData,
        avatar: newAvatarUrl
      });
      
      // Cập nhật thông tin người dùng trong localStorage nếu là người dùng hiện tại
      const storedUser = localStorage.getItem('user');
      if (storedUser && !userId) {
        const parsedUser = JSON.parse(storedUser);
        parsedUser.avatar = newAvatarUrl;
        localStorage.setItem('user', JSON.stringify(parsedUser));
      }
    }
  };

  if (!isOpen) return null;

  // Format ngày thành dd/mm/yyyy
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      // Kiểm tra xem ngày có hợp lệ không
      if (isNaN(date.getTime())) return 'N/A';
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    } catch (error) {
      console.error('Lỗi khi format date:', error);
      return 'N/A';
    }
  };

  // Format ngày giờ
  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      // Kiểm tra xem ngày có hợp lệ không
      if (isNaN(date.getTime())) return 'N/A';
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Lỗi khi format datetime:', error);
      return 'N/A';
    }
  };

  return (
    <div className="profile-modal-overlay">
      <div className="profile-modal">
        <div className="profile-modal-header">
          <h2>Hồ sơ của bạn</h2>
          <button className="close-button" onClick={onClose}></button>
        </div>
        <div className="profile-modal-content">
          {loading ? (
            <div className="profile-loading">Đang tải thông tin...</div>
          ) : userData ? (
            <div className="profile-content">
              <div className="profile-avatar-section">
                {userData.user_id && (
                  <AvatarUpload
                    userId={userData.user_id}
                    currentAvatar={userData.avatar}
                    onAvatarUpdate={handleAvatarUpdate}
                  />
                )}
                <div className="profile-user-info">
                  <div className="profile-username">{userData.username}</div>
                  <div className="profile-status">
                    <span className={`status-indicator ${userData.status === 'online' ? 'online' : 'offline'}`}></span>
                    <span className="status-text">{userData.status === 'online' ? 'Đang hoạt động' : 'Ngoại tuyến'}</span>
                  </div>
                </div>
              </div>
              
              {editMode ? (
                <form className="profile-form" onSubmit={handleSubmit}>
                  {error && <div className="profile-error">{error}</div>}
                  {success && <div className="profile-success">{success}</div>}
                  
                  <div className="form-group">
                    <label>Tên người dùng:</label>
                    <input 
                      type="text" 
                      name="username" 
                      value={formData.username} 
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Email:</label>
                    <input 
                      type="email" 
                      name="email" 
                      value={formData.email} 
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Ngày sinh:</label>
                    <input 
                      type="date" 
                      name="birthday" 
                      value={formData.birthday ? new Date(formData.birthday).toISOString().split('T')[0] : ''} 
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Mật khẩu mới (để trống nếu không muốn thay đổi):</label>
                    <input 
                      type="password" 
                      name="password" 
                      value={formData.password} 
                      onChange={handleChange}
                      placeholder="Nhập mật khẩu mới"
                    />
                  </div>
                  
                  <div className="form-actions">
                    <button type="button" className="cancel-button" onClick={handleEditToggle}>
                      Hủy
                    </button>
                    <button type="submit" className="save-button">
                      Lưu thay đổi
                    </button>
                  </div>
                </form>
              ) : (
                <div className="profile-info">
                  {error && <div className="profile-error">{error}</div>}
                  {success && <div className="profile-success">{success}</div>}
                  
                  <div className="info-group">
                    <div className="info-label">Tên người dùng:</div>
                    <div className="info-value">{userData.username}</div>
                  </div>
                  
                  <div className="info-group">
                    <div className="info-label">Email:</div>
                    <div className="info-value">{userData.email}</div>
                  </div>
                  
                  <div className="info-group">
                    <div className="info-label">Ngày tham gia:</div>
                    <div className="info-value">{formatDate(userData.join_date)}</div>
                  </div>
                  
                  <div className="info-group">
                    <div className="info-label">Ngày sinh:</div>
                    <div className="info-value">{formatDate(userData.birthday)}</div>
                  </div>
                  
                  <div className="info-group">
                    <div className="info-label">Trạng thái tài khoản:</div>
                    <div className="info-value account-status">
                      <span className={`status-dot ${userData.status === 'online' ? 'online' : 'offline'}`}></span>
                      {userData.status === 'online' ? 'Đang hoạt động' : 'Ngoại tuyến'}
                    </div>
                  </div>
                  
                  {userData.last_activity && (
                    <div className="info-group">
                      <div className="info-label">Hoạt động gần đây:</div>
                      <div className="info-value">{formatDateTime(userData.last_activity)}</div>
                    </div>
                  )}
                  
                  <div className="info-group">
                    <div className="info-label">Loại tài khoản:</div>
                    <div className="info-value">{userData.role_id === 1 ? 'Quản trị viên' : 'Người dùng'}</div>
                  </div>
                  
                  <button className="edit-button" onClick={handleEditToggle}>
                    <i className="fas fa-pencil-alt"></i> Chỉnh sửa thông tin
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="profile-error">Không thể tải thông tin người dùng</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal; 