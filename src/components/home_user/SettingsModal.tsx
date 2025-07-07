import React, { useState, useEffect } from 'react';
import './SettingsModal.css';
import { playNotificationSound, playMessageSound } from '../../utils/sound';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'general' | 'privacy' | 'interface' | 'notifications' | 'messages' | 'utilities';

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('notifications');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('notificationsEnabled');
    return saved === null ? true : saved === 'true';
  });
  
  // Tách riêng state cho âm thanh thông báo và tin nhắn
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('notificationSoundEnabled');
    return saved === null ? true : saved === 'true';
  });
  
  const [messageSoundEnabled, setMessageSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('messageSoundEnabled');
    return saved === null ? true : saved === 'true';
  });

  const [theme, setTheme] = useState<string>(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') return 'dark';
    return 'light';
  });

  // Lưu cài đặt thông báo vào localStorage
  useEffect(() => {
    localStorage.setItem('notificationsEnabled', notificationsEnabled.toString());
  }, [notificationsEnabled]);

  // Lưu cài đặt âm thanh thông báo vào localStorage
  useEffect(() => {
    localStorage.setItem('notificationSoundEnabled', notificationSoundEnabled.toString());
  }, [notificationSoundEnabled]);

  // Lưu cài đặt âm thanh tin nhắn vào localStorage
  useEffect(() => {
    localStorage.setItem('messageSoundEnabled', messageSoundEnabled.toString());
  }, [messageSoundEnabled]);

  const handleThemeChange = (value: string) => {
    setTheme(value);
    if (value === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('darkMode', 'false');
    }
  };

  // Hàm test âm thanh thông báo
  const handleTestNotificationSound = () => {
    if (notificationSoundEnabled) {
      playNotificationSound();
    }
  };

  // Hàm test âm thanh tin nhắn
  const handleTestMessageSound = () => {
    if (messageSoundEnabled) {
      playMessageSound();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay">
      <div className="settings-modal">
        <div className="settings-modal-header">
          <h2 id="settings-title-heading" style={{ color: "#000000", fontWeight: 900, fontSize: "20px" }}><span style={{ color: "#000000" }}>Cài đặt</span></h2>
          <button className="close-button" onClick={onClose}></button>
        </div>
        <div className="settings-modal-content">
          <div className="settings-sidebar">
            <div 
              className={`settings-sidebar-item ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill={activeTab === 'general' ? "#0084ff" : "#000"}>
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
              </svg>
              <span style={{ color: "#000000", fontWeight: 600 }}>Cài đặt chung</span>
            </div>
            <div 
              className={`settings-sidebar-item ${activeTab === 'privacy' ? 'active' : ''}`}
              onClick={() => setActiveTab('privacy')}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill={activeTab === 'privacy' ? "#0084ff" : "#000"}>
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
              </svg>
              <span style={{ color: "#000000", fontWeight: 600 }}>Quyền riêng tư</span>
            </div>
            <div 
              className={`settings-sidebar-item ${activeTab === 'interface' ? 'active' : ''}`}
              onClick={() => setActiveTab('interface')}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill={activeTab === 'interface' ? "#0084ff" : "#000"}>
                <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
              </svg>
              <span style={{ color: "#000000", fontWeight: 600 }}>Giao diện</span>
              <div className="beta-tag">Beta</div>
            </div>
            <div 
              className={`settings-sidebar-item ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill={activeTab === 'notifications' ? "#0084ff" : "#000"}>
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
              </svg>
              <span style={{ color: "#000000", fontWeight: 600 }}>Thông báo</span>
            </div>
            <div 
              className={`settings-sidebar-item ${activeTab === 'messages' ? 'active' : ''}`}
              onClick={() => setActiveTab('messages')}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill={activeTab === 'messages' ? "#0084ff" : "#000"}>
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
              </svg>
              <span style={{ color: "#000000", fontWeight: 600 }}>Tin nhắn</span>
            </div>
            <div 
              className={`settings-sidebar-item ${activeTab === 'utilities' ? 'active' : ''}`}
              onClick={() => setActiveTab('utilities')}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill={activeTab === 'utilities' ? "#0084ff" : "#000"}>
                <path d="M17.6 10.12c.23-.67.4-1.37.4-2.12 0-3.31-2.69-6-6-6-.65 0-1.35.17-2.02.4.23-1.14 1.06-2 2.02-2.39V0h-2v1c-2.45 0-4.2 2.39-4 5.01.25 2.81 1.78 4.99 4 4.99v7.5c-1.6-.82-2.72-2.49-3-4.5C6.4 13.5 6 13 5.5 13c-.83 0-1.5.67-1.5 1.5 0 .84.4 1.65 1 2.15.41 2.19 1.86 3.95 3.5 4.85.97.61 2.09 1 3.5 1 3.31 0 6-2.69 6-6 0-.34-.04-.67-.09-1h4.09v-2h-5.51c.32-.89.51-1.87.51-2.9 0-1.76-.54-3.35-1.39-4.48z"/>
              </svg>
              <span style={{ color: "#000000", fontWeight: 600 }}>Tiện ích</span>
            </div>
          </div>
          <div className="settings-content">
            {activeTab === 'interface' && (
              <div className="interface-settings">
                <h3>Chế độ giao diện</h3>
                <div className="theme-options" style={{marginTop: '20px'}}>
                  <label style={{marginRight: '30px', fontWeight: 600, color: '#000'}}>
                    <input
                      type="radio"
                      name="theme-mode"
                      value="light"
                      checked={theme === 'light'}
                      onChange={() => handleThemeChange('light')}
                      style={{marginRight: '8px'}}
                    />
                    Sáng
                  </label>
                  <label style={{fontWeight: 600, color: '#000'}}>
                    <input
                      type="radio"
                      name="theme-mode"
                      value="dark"
                      checked={theme === 'dark'}
                      onChange={() => handleThemeChange('dark')}
                      style={{marginRight: '8px'}}
                    />
                    Tối
                  </label>
                </div>
                <p style={{marginTop: '16px', color: '#555'}}>Bạn có thể chuyển đổi giữa giao diện sáng và tối. Lựa chọn của bạn sẽ được ghi nhớ cho các lần đăng nhập sau.</p>
              </div>
            )}
            {activeTab === 'notifications' && (
              <div className="notification-settings">
                <h3>Cài đặt thông báo</h3>
                <p className="settings-description">Nhận được thông báo mới khi có tin nhắn mới</p>
                
                <div className="notification-options">
                  <div className="notification-option-images">
                    <div className={`option-image ${notificationsEnabled ? 'selected' : ''}`} onClick={() => setNotificationsEnabled(true)}>
                      <div className="laptop-image laptop-blue"></div>
                    </div>
                    <div className={`option-image ${!notificationsEnabled ? 'selected' : ''}`} onClick={() => setNotificationsEnabled(false)}>
                      <div className="laptop-image laptop-gray"></div>
                    </div>
                  </div>
                  <div className="notification-option-radios">
                    <div className="radio-option">
                      <input 
                        type="radio" 
                        id="notifications-on" 
                        name="notifications"
                        checked={notificationsEnabled}
                        onChange={() => setNotificationsEnabled(true)}
                      />
                      <label htmlFor="notifications-on" style={{ color: "#000000", fontWeight: 600 }}>Bật</label>
                    </div>
                    <div className="radio-option">
                      <input 
                        type="radio" 
                        id="notifications-off" 
                        name="notifications"
                        checked={!notificationsEnabled}
                        onChange={() => setNotificationsEnabled(false)}
                      />
                      <label htmlFor="notifications-off" style={{ color: "#000000", fontWeight: 600 }}>Tắt</label>
                    </div>
                  </div>
                </div>

                <div className="notification-sound-section">
                  <h3>Âm thanh thông báo</h3>
                  
                  {/* Điều khiển âm thanh thông báo */}
                  <div className="sound-toggle" style={{ marginBottom: '16px' }}>
                    <span style={{ color: "#000000", fontWeight: 600 }}>
                      <i className="fas fa-bell" style={{ marginRight: '8px', color: '#0084ff' }}></i>
                      Âm thanh thông báo hệ thống
                    </span>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox"
                        checked={notificationSoundEnabled}
                        onChange={() => setNotificationSoundEnabled(!notificationSoundEnabled)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  {/* Điều khiển âm thanh tin nhắn */}
                  <div className="sound-toggle" style={{ marginBottom: '24px' }}>
                    <span style={{ color: "#000000", fontWeight: 600 }}>
                      <i className="fas fa-comment" style={{ marginRight: '8px', color: '#0084ff' }}></i>
                      Âm thanh tin nhắn mới
                    </span>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox"
                        checked={messageSoundEnabled}
                        onChange={() => setMessageSoundEnabled(!messageSoundEnabled)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  
                  {/* Nút test âm thanh */}
                  <div style={{ 
                    display: 'flex',
                    gap: '12px'
                  }}>
                    <button 
                      onClick={handleTestNotificationSound}
                      style={{
                        backgroundColor: notificationSoundEnabled ? '#0084ff' : '#ccc',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        cursor: notificationSoundEnabled ? 'pointer' : 'not-allowed',
                        fontSize: '14px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s ease',
                        flex: 1,
                        opacity: notificationSoundEnabled ? 1 : 0.6
                      }}
                      disabled={!notificationSoundEnabled}
                    >
                      <i className="fas fa-bell"></i>
                      Thử âm thanh thông báo
                    </button>
                    <button 
                      onClick={handleTestMessageSound}
                      style={{
                        backgroundColor: messageSoundEnabled ? '#0084ff' : '#ccc',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        cursor: messageSoundEnabled ? 'pointer' : 'not-allowed',
                        fontSize: '14px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s ease',
                        flex: 1,
                        opacity: messageSoundEnabled ? 1 : 0.6
                      }}
                      disabled={!messageSoundEnabled}
                    >
                      <i className="fas fa-comment"></i>
                      Thử âm thanh tin nhắn
                    </button>
                  </div>
                  <p style={{
                    marginTop: '12px',
                    fontSize: '13px',
                    color: '#666',
                    fontStyle: 'italic'
                  }}>
                    Bấm vào các nút trên để nghe thử âm thanh tương ứng
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal; 