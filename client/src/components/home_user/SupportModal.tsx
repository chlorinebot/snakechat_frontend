import React, { useState, useEffect } from 'react';
import './SupportModal.css';
import api from '../../services/api';
import type { Report } from '../../services/api';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const [supportTab, setSupportTab] = useState<'info' | 'report' | 'feedback' | 'contact'>('info');
  const [reportTitle, setReportTitle] = useState<string>('');
  const [reportContent, setReportContent] = useState<string>('');
  const [feedbackTitle, setFeedbackTitle] = useState<string>('');
  const [feedbackContent, setFeedbackContent] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [user, setUser] = useState<any>(null);

  // Lấy thông tin người dùng từ localStorage
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error('Lỗi khi parse thông tin người dùng:', error);
      }
    }
  }, []);

  // Ghi log khi modal được mở/đóng để dễ debug
  useEffect(() => {
    console.log('SupportModal state changed:', isOpen ? 'opened' : 'closed');
  }, [isOpen]);

  // Xử lý phím ESC để đóng modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Hàm xử lý gửi báo cáo sự cố
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.user_id) {
      setSubmitMessage({
        type: 'error',
        text: 'Bạn cần đăng nhập để gửi báo cáo'
      });
      return;
    }

    if (!reportTitle.trim() || !reportContent.trim()) {
      setSubmitMessage({
        type: 'error',
        text: 'Vui lòng nhập đầy đủ tiêu đề và nội dung báo cáo'
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const reportData: Report = {
        id_user: user.user_id,
        title: reportTitle,
        content: reportContent,
        report_type: 'bug_report'
      };

      const response = await api.sendBugReport(reportData);
      
      if (response.success) {
        setSubmitMessage({
          type: 'success',
          text: 'Đã gửi báo cáo sự cố thành công. Chúng tôi sẽ xem xét và phản hồi sớm nhất.'
        });
        // Reset form
        setReportTitle('');
        setReportContent('');
      } else {
        setSubmitMessage({
          type: 'error',
          text: response.message || 'Có lỗi xảy ra khi gửi báo cáo'
        });
      }
    } catch (error) {
      console.error('Lỗi khi gửi báo cáo sự cố:', error);
      setSubmitMessage({
        type: 'error',
        text: 'Có lỗi xảy ra khi gửi báo cáo'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hàm xử lý gửi góp ý
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.user_id) {
      setSubmitMessage({
        type: 'error',
        text: 'Bạn cần đăng nhập để gửi góp ý'
      });
      return;
    }

    if (!feedbackTitle.trim() || !feedbackContent.trim()) {
      setSubmitMessage({
        type: 'error',
        text: 'Vui lòng nhập đầy đủ tiêu đề và nội dung góp ý'
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const feedbackData: Report = {
        id_user: user.user_id,
        title: feedbackTitle,
        content: feedbackContent,
        report_type: 'suggestion'
      };

      const response = await api.sendFeedback(feedbackData);
      
      if (response.success) {
        setSubmitMessage({
          type: 'success',
          text: 'Đã gửi góp ý thành công. Cảm ơn bạn đã đóng góp ý kiến.'
        });
        // Reset form
        setFeedbackTitle('');
        setFeedbackContent('');
      } else {
        setSubmitMessage({
          type: 'error',
          text: response.message || 'Có lỗi xảy ra khi gửi góp ý'
        });
      }
    } catch (error) {
      console.error('Lỗi khi gửi góp ý:', error);
      setSubmitMessage({
        type: 'error',
        text: 'Có lỗi xảy ra khi gửi góp ý'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Nếu modal không mở, không render gì cả
  if (!isOpen) return null;

  return (
    <div className="support-modal-overlay">
      <div className="support-modal">
        <div className="support-modal-header">
          <h2 id="support-title-heading">Trung tâm hỗ trợ</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        <div className="support-modal-content">
          <div className="support-sidebar">
            <div 
              className={`support-sidebar-item ${supportTab === 'info' ? 'active' : ''}`}
              onClick={() => setSupportTab('info')}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill={supportTab === 'info' ? "#0084ff" : "#000"}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
              <span>Thông tin</span>
            </div>
            <div 
              className={`support-sidebar-item ${supportTab === 'report' ? 'active' : ''}`}
              onClick={() => setSupportTab('report')}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill={supportTab === 'report' ? "#0084ff" : "#000"}>
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
              </svg>
              <span>Báo cáo sự cố</span>
            </div>
            <div 
              className={`support-sidebar-item ${supportTab === 'feedback' ? 'active' : ''}`}
              onClick={() => setSupportTab('feedback')}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill={supportTab === 'feedback' ? "#0084ff" : "#000"}>
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z"/>
              </svg>
              <span>Góp ý</span>
            </div>
            <div 
              className={`support-sidebar-item ${supportTab === 'contact' ? 'active' : ''}`}
              onClick={() => setSupportTab('contact')}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill={supportTab === 'contact' ? "#0084ff" : "#000"}>
                <path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"/>
              </svg>
              <span>Liên hệ CSKH</span>
              <div className="online-tag">24/7</div>
            </div>
          </div>
          <div className="support-content">
            {supportTab === 'info' && (
              <div className="info-content">
                <h3>Thông tin hệ thống</h3>
                <p className="support-description">Thông tin về SnakeChat và phiên bản hiện tại</p>
                
                <div className="info-card">
                  <div className="info-item">
                    <div className="info-label">Tên ứng dụng:</div>
                    <div className="info-value">SnakeChat</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Phiên bản:</div>
                    <div className="info-value">1.0.0</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Website:</div>
                    <div className="info-value">
                      <a href="https://snakechat.com" target="_blank" rel="noopener noreferrer">
                        https://snakechat.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {supportTab === 'report' && (
              <div className="report-content">
                <h3>Báo cáo sự cố</h3>
                <p className="support-description">Báo cáo lỗi hoặc sự cố bạn gặp phải trong quá trình sử dụng SnakeChat</p>
                
                {submitMessage && (
                  <div className={`alert alert-${submitMessage.type}`}>
                    {submitMessage.text}
                  </div>
                )}
                
                <form onSubmit={handleSubmitReport}>
                  <div className="form-group">
                    <label htmlFor="report-title">Tiêu đề báo cáo</label>
                    <input 
                      type="text" 
                      id="report-title" 
                      className="form-control"
                      placeholder="Nhập tiêu đề mô tả ngắn gọn về sự cố"
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="report-text">Mô tả chi tiết sự cố</label>
                    <textarea 
                      id="report-text" 
                      className="form-control"
                      rows={5}
                      placeholder="Vui lòng mô tả chi tiết sự cố bạn gặp phải, bao gồm các bước tái hiện lỗi..."
                      value={reportContent}
                      onChange={(e) => setReportContent(e.target.value)}
                      required
                    ></textarea>
                  </div>
                  
                  <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Đang gửi...' : 'Gửi báo cáo'}
                  </button>
                </form>
              </div>
            )}
            
            {supportTab === 'feedback' && (
              <div className="feedback-content">
                <h3>Góp ý cải thiện</h3>
                <p className="support-description">Chia sẻ ý kiến và đề xuất của bạn để chúng tôi cải thiện trải nghiệm người dùng</p>
                
                {submitMessage && (
                  <div className={`alert alert-${submitMessage.type}`}>
                    {submitMessage.text}
                  </div>
                )}
                
                <form onSubmit={handleSubmitFeedback}>
                  <div className="form-group">
                    <label htmlFor="feedback-title">Tiêu đề góp ý</label>
                    <input 
                      type="text" 
                      id="feedback-title" 
                      className="form-control"
                      placeholder="Nhập tiêu đề mô tả ngắn gọn về góp ý"
                      value={feedbackTitle}
                      onChange={(e) => setFeedbackTitle(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="feedback-text">Nội dung góp ý</label>
                    <textarea 
                      id="feedback-text" 
                      className="form-control"
                      rows={5}
                      placeholder="Chia sẻ ý kiến của bạn về SnakeChat và những cải tiến bạn muốn thấy..."
                      value={feedbackContent}
                      onChange={(e) => setFeedbackContent(e.target.value)}
                      required
                    ></textarea>
                  </div>
                  
                  <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Đang gửi...' : 'Gửi góp ý'}
                  </button>
                </form>
              </div>
            )}
            
            {supportTab === 'contact' && (
              <div className="contact-content">
                <h3>Liên hệ chăm sóc khách hàng</h3>
                <p className="support-description">Kết nối với đội ngũ hỗ trợ khách hàng của chúng tôi</p>
                
                <div className="contact-card">
                  <div className="contact-methods">
                    <div className="contact-method">
                      <div className="contact-icon">
                        <i className="fas fa-envelope"></i>
                      </div>
                      <div className="contact-info">
                        <div className="contact-type">Email</div>
                        <div className="contact-value">support@snakechat.com</div>
                      </div>
                    </div>
                    
                    <div className="contact-method">
                      <div className="contact-icon">
                        <i className="fas fa-phone"></i>
                      </div>
                      <div className="contact-info">
                        <div className="contact-type">Điện thoại</div>
                        <div className="contact-value">1900-xxxx</div>
                      </div>
                    </div>
                    
                    <div className="contact-method">
                      <div className="contact-icon">
                        <i className="fas fa-comment-alt"></i>
                      </div>
                      <div className="contact-info">
                        <div className="contact-type">Chat trực tiếp</div>
                        <div className="contact-value">Hỗ trợ 24/7</div>
                      </div>
                    </div>
                  </div>
                  
                  <button className="btn-primary btn-large">
                    <i className="fas fa-headset mr-2"></i>
                    Bắt đầu chat với CSKH
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportModal; 