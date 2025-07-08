import React, { useEffect, useState } from 'react';
import './SuccessToast.css';

interface SuccessToastProps {
  message: string;
  duration?: number; // thời gian hiển thị tính bằng milliseconds, mặc định 3000ms (3 giây)
  onClose?: () => void;
}

const SuccessToast: React.FC<SuccessToastProps> = ({ 
  message, 
  duration = 3000, 
  onClose 
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Thiết lập hẹn giờ để ẩn thông báo sau khoảng thời gian duration
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) {
        onClose();
      }
    }, duration);

    // Dọn dẹp timer khi component bị hủy
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  // Nếu không hiển thị, không render gì cả
  if (!visible) return null;

  return (
    <div className="success-toast">
      <div className="success-toast-icon">
        <i className="fas fa-check-circle"></i>
      </div>
      <div className="success-toast-message">{message}</div>
    </div>
  );
};

export default SuccessToast; 