import React from 'react';

interface UserDropdownProps {
  username: string;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  onLogout: () => void;
  onProfileClick: () => void;
  onSettingsClick: () => void;
  onUpdateLastActivity?: () => void;
  onSupportClick?: () => void;
  userStatus?: string;
  lastActivity?: string;
  isMobile?: boolean;
}

const UserDropdown: React.FC<UserDropdownProps> = ({ 
  username, 
  dropdownRef, 
  onLogout, 
  onProfileClick,
  onSettingsClick,
  onUpdateLastActivity,
  onSupportClick,
  userStatus = 'offline',
  lastActivity,
  isMobile = false
}) => {
  const isOnline = userStatus === 'online';
  
  const getStatusText = () => {
    if (!lastActivity) return isOnline ? 'Đang hoạt động' : 'Ngoại tuyến';
    
    if (isOnline) return 'Đang hoạt động';
    
    try {
      const lastActiveTime = new Date(lastActivity);
      const now = new Date();
      const diffMs = now.getTime() - lastActiveTime.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Vừa mới hoạt động';
      if (diffMins < 60) return `Hoạt động ${diffMins} phút trước`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Hoạt động ${diffHours} giờ trước`;
      
      const diffDays = Math.floor(diffHours / 24);
      return `Hoạt động ${diffDays} ngày trước`;
    } catch (e) {
      return 'Ngoại tuyến';
    }
  };

  // Xác định màu nền và màu văn bản dựa trên isMobile
  const backgroundColor = isMobile ? '#333333' : 'white';
  const textColor = isMobile ? '#ffffff' : '#444444';
  const secondaryTextColor = isMobile ? '#aaaaaa' : '#777777';
  const borderColor = isMobile ? '#444444' : '#f5f5f5';
  const iconColor = isMobile ? '#ffffff' : '#0084ff';

  const dropdownStyle = isMobile 
    ? {
        position: 'fixed' as const,
        bottom: '80px',
        left: '0',
        right: '0',
        width: '100%',
        margin: '0',
        borderRadius: '20px 20px 0 0',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.3)',
        backgroundColor: backgroundColor,
        zIndex: 99999
      }
    : {
        position: 'absolute' as const,
        top: '70px',
        left: '15px',
        zIndex: 99999,
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        backgroundColor: backgroundColor,
        borderRadius: '8px',
        width: '240px'
      };

  return (
    <div 
      className={`profile-dropdown show ${isMobile ? 'mobile-dropdown' : ''}`}
      ref={dropdownRef}
      style={{
        ...dropdownStyle,
        paddingBottom: isMobile ? '20px' : '0'
      }}
    >
      <div style={{ padding: '15px 20px', borderBottom: `1px solid ${borderColor}` }}>
        <div style={{ fontWeight: 'bold', fontSize: isMobile ? '18px' : '16px', color: textColor, marginBottom: '2px' }}>{username}</div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px', color: secondaryTextColor }}>
          <span 
            style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: isOnline ? '#4CAF50' : '#CCCCCC',
              display: 'inline-block', 
              marginRight: '6px' 
            }} 
          />
          {getStatusText()}
        </div>
      </div>
      <div style={{ padding: isMobile ? '12px 0' : '8px 0' }}>
        <div 
          className="dropdown-menu-item"
          style={{ padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          onClick={onProfileClick}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={iconColor} style={{ marginRight: '8px' }}>
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          <span style={{ color: textColor }}>Hồ sơ của bạn</span>
        </div>
        <div 
          className="dropdown-menu-item"
          style={{ padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          onClick={onSettingsClick}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={iconColor} style={{ marginRight: '8px' }}>
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
          <span style={{ color: textColor }}>Cài đặt</span>
        </div>
        {onUpdateLastActivity && (
          <div 
            className="dropdown-menu-item"
            style={{ padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            onClick={onUpdateLastActivity}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={iconColor} style={{ marginRight: '8px' }}>
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 9h7V2l-2.35 4.35z"/>
            </svg>
            <span style={{ color: textColor }}>Cập nhật thời gian hoạt động</span>
          </div>
        )}
        {onSupportClick && (
          <div 
            className="dropdown-menu-item"
            style={{ padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            onClick={onSupportClick}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={iconColor} style={{ marginRight: '8px' }}>
              <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/>
            </svg>
            <span style={{ color: textColor }}>Hỗ trợ</span>
          </div>
        )}
        <div style={{ height: '1px', backgroundColor: borderColor, margin: '5px 0' }}></div>
        <div 
          className="dropdown-menu-item"
          style={{ 
            padding: '10px 20px', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            color: isMobile ? '#ffffff' : '#ff3b30',
            backgroundColor: isMobile ? '#222222' : 'transparent'
          }}
          onClick={onLogout}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={isMobile ? '#ffffff' : '#ff3b30'} style={{ marginRight: '8px' }}>
            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
          </svg>
          <span style={{ fontWeight: 'bold' }}>Đăng xuất</span>
        </div>
      </div>
    </div>
  );
};

export default UserDropdown; 