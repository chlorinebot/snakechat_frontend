import React, { useState, useRef, useEffect } from 'react';
import { Button, Image, Spinner, Alert } from 'react-bootstrap';
import { api } from '../../services/api';
import './AvatarUpload.css';
import { useAuth } from '../../contexts/AuthContext';

interface AvatarUploadProps {
  userId: number;
  currentAvatar?: string;
  onAvatarUpdate: (newAvatarUrl: string) => void;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({ userId, currentAvatar, onAvatarUpdate }) => {
  const [avatar, setAvatar] = useState<string | null>(currentAvatar || null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [publicId, setPublicId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateAvatar } = useAuth();

  // Cập nhật avatar khi prop thay đổi
  useEffect(() => {
    if (currentAvatar) {
      setAvatar(currentAvatar);
    }
  }, [currentAvatar]);

  // Xử lý khi người dùng chọn file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Kiểm tra định dạng file
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!validTypes.includes(selectedFile.type)) {
        setError('Chỉ chấp nhận file ảnh (jpg, jpeg, png, gif)');
        return;
      }

      // Kiểm tra kích thước file (tối đa 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('Kích thước file không được vượt quá 5MB');
        return;
      }

      setFile(selectedFile);
      setError(null);

      // Hiển thị preview ảnh
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAvatar(event.target.result as string);
        }
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  // Xử lý khi người dùng click vào nút upload
  const handleUpload = async () => {
    if (!file) {
      setError('Vui lòng chọn file ảnh');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Upload ảnh lên Cloudinary
      const uploadResponse = await api.uploadAvatar(file);
      
      if (!uploadResponse.success || !uploadResponse.data) {
        throw new Error(uploadResponse.message || 'Lỗi khi upload ảnh');
      }

      const { url, public_id } = uploadResponse.data;

      // 2. Cập nhật URL avatar vào database
      const updateResponse = await api.updateAvatarUrl(userId, url);
      
      if (!updateResponse.success) {
        // Nếu cập nhật database thất bại, xóa ảnh vừa upload
        try {
          await api.deleteOldAvatar(public_id);
        } catch (deleteError) {
          console.error('Không thể xóa ảnh sau khi cập nhật thất bại:', deleteError);
        }
        throw new Error(updateResponse.message || 'Lỗi khi cập nhật avatar');
      }

      // 3. Xóa avatar cũ nếu có public_id
      if (publicId) {
        try {
          await api.deleteOldAvatar(publicId);
        } catch (deleteError) {
          console.error('Lỗi khi xóa avatar cũ:', deleteError);
          // Không throw error vì việc xóa avatar cũ thất bại không ảnh hưởng đến luồng chính
        }
      }

      // 4. Cập nhật state và thông báo thành công
      setAvatar(url);
      setPublicId(public_id);
      setSuccess('Cập nhật avatar thành công');
      onAvatarUpdate(url);
      
      // 5. Cập nhật trong AuthContext
      updateAvatar(url);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setFile(null);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi cập nhật avatar');
      console.error('Lỗi chi tiết:', err);
    } finally {
      setLoading(false);
    }
  };

  // Xử lý khi người dùng click vào avatar để chọn file
  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="avatar-upload-container">
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
      
      <div className="avatar-preview-container">
        <div className="avatar-preview">
          {avatar ? (
            <Image 
              src={avatar} 
              roundedCircle 
              className="avatar-image" 
              alt="Avatar" 
            />
          ) : (
            <div className="avatar-placeholder">
              <i className="fas fa-user"></i>
            </div>
          )}
        </div>
        
        <button 
          className="camera-button" 
          type="button"
          onClick={handleAvatarClick}
          title="Thay đổi ảnh đại diện"
        >
          <i className="fas fa-camera"></i>
        </button>
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/jpg,image/png,image/gif"
        className="file-input"
      />
      
      {file && (
        <Button 
          variant="primary" 
          onClick={handleUpload} 
          disabled={loading} 
          className="mt-2"
        >
          {loading ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Đang tải lên...
            </>
          ) : (
            'Cập nhật avatar'
          )}
        </Button>
      )}
    </div>
  );
};

export default AvatarUpload; 