import React from 'react';

type ActiveTab = 'messages' | 'contacts';

interface MainSidebarProps {
  activeTab: ActiveTab;
  userInitial: string;
  userAvatar?: string;
  onTabChange: (tab: ActiveTab) => void;
  onAvatarClick: (e: React.MouseEvent) => void;
  avatarRef: React.RefObject<HTMLDivElement | null>;
  onSettingsClick: () => void;
  friendRequestCount?: number; // Số lượng lời mời kết bạn
  unreadMessageCount?: number; // Thêm số lượng tin nhắn chưa đọc
}

const MainSidebar: React.FC<MainSidebarProps> = ({ 
  activeTab, 
  userInitial, 
  userAvatar,
  onTabChange, 
  onAvatarClick,
  avatarRef,
  onSettingsClick,
  friendRequestCount = 0,
  unreadMessageCount = 0 // Thêm giá trị mặc định
}) => {
  // Hiển thị badge chỉ khi có ít nhất 1 lời mời kết bạn
  const showFriendBadge = friendRequestCount > 0;
  // Hiển thị số 9+ nếu có hơn 9 lời mời kết bạn
  const friendBadgeText = friendRequestCount > 9 ? '9+' : friendRequestCount.toString();
  
  // Hiển thị badge tin nhắn khi có tin nhắn chưa đọc
  const showMessageBadge = unreadMessageCount > 0;
  // Hiển thị số 99+ nếu có hơn 99 tin nhắn chưa đọc
  const messageBadgeText = unreadMessageCount > 99 ? '99+' : unreadMessageCount.toString();

  return (
    <div className="sidebar">
      {/* Avatar người dùng */}
      <div className="sidebar-top">
        <div 
          className="user-avatar" 
          ref={avatarRef}
          onClick={onAvatarClick}
          style={{ 
            cursor: 'pointer',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease',
            backgroundColor: (() => {
              console.log('Rendering avatar với URL:', userAvatar);
              return userAvatar ? 'transparent' : '#0084ff';
            })(),
            backgroundImage: userAvatar ? `url(${userAvatar})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Nhấp để mở menu cài đặt"
        >
          {!userAvatar && userInitial}
        </div>
      </div>
      
      {/* Menu items */}
      <div className="sidebar-menu">
        <div 
          className={`sidebar-item ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => onTabChange('messages')}
          style={{ position: 'relative' }}
        >
          <div className="sidebar-icon message-icon"></div>
          <div className="sidebar-tooltip">Tin nhắn</div>
          
          {/* Hiển thị badge khi có tin nhắn chưa đọc */}
          {showMessageBadge && (
            <div className="message-badge" style={{
              position: 'absolute',
              top: '0',
              right: '0',
              backgroundColor: '#ff3b30',
              color: 'white',
              fontSize: unreadMessageCount > 99 ? '9px' : '10px', // Giảm font size khi số lớn
              minWidth: '18px',
              height: '18px',
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid white',
              padding: '0 3px', // Thêm padding để hiển thị số lớn
              fontWeight: 'bold',
            }}>
              {messageBadgeText}
            </div>
          )}
        </div>
        <div 
          className={`sidebar-item ${activeTab === 'contacts' ? 'active' : ''}`}
          onClick={() => onTabChange('contacts')}
          style={{ position: 'relative' }}
        >
          <div className="sidebar-icon contacts-icon"></div>
          <div className="sidebar-tooltip">Danh bạ</div>
          
          {/* Hiển thị badge khi có lời mời kết bạn */}
          {showFriendBadge && (
            <div className="friend-request-badge" style={{
              position: 'absolute',
              top: '0',
              right: '0',
              backgroundColor: '#ff3b30',
              color: 'white',
              fontSize: '10px',
              minWidth: '18px',
              height: '18px',
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid white',
              fontWeight: 'bold',
            }}>
              {friendBadgeText}
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom items */}
      <div className="sidebar-bottom">
        <div className="sidebar-item" onClick={onSettingsClick}>
          <div className="sidebar-icon settings-icon"></div>
          <div className="sidebar-tooltip">Cài đặt</div>
        </div>
      </div>
    </div>
  );
};

export default MainSidebar; 