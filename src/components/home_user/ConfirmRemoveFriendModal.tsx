import React from 'react';
import './ConfirmModal.css';

interface ConfirmRemoveFriendModalProps {
  isOpen: boolean;
  username?: string;
  isProcessing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmRemoveFriendModal: React.FC<ConfirmRemoveFriendModalProps> = ({
  isOpen,
  username,
  isProcessing,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="confirm-modal-overlay">
      <div className="confirm-modal">
        <div className="confirm-modal-header">
          <h3>Xác nhận hủy kết bạn</h3>
        </div>
        <div className="confirm-modal-content">
          <p>Bạn có chắc chắn muốn hủy kết bạn với <strong>{username}</strong>?</p>
          <div className="confirm-modal-buttons">
            <button 
              className="confirm-button"
              onClick={onConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? 'Đang xử lý...' : 'Xác nhận'}
            </button>
            <button 
              className="cancel-button"
              onClick={onCancel}
              disabled={isProcessing}
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmRemoveFriendModal; 