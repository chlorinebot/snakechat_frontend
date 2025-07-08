import React from 'react';
import './MobileNavbar.css';

type ActiveTab = 'messages' | 'contacts';

interface MobileNavbarProps {
  activeTab: ActiveTab;
  userInitial: string;
  userAvatar?: string;
  onTabChange: (tab: ActiveTab) => void;
  onAvatarClick: (e: React.MouseEvent) => void;
  avatarRef: React.RefObject<HTMLDivElement | null>;
  friendRequestCount?: number;
  unreadMessageCount?: number;
  onMessagesClick?: () => void;
}

const MobileNavbar: React.FC<MobileNavbarProps> = ({
  activeTab,
  userInitial,
  userAvatar,
  onTabChange,
  onAvatarClick,
  avatarRef,
  friendRequestCount = 0,
  unreadMessageCount = 0,
  onMessagesClick
}) => {
  // Format badge text
  const messageBadgeText = unreadMessageCount > 99 ? '99+' : unreadMessageCount.toString();
  const friendBadgeText = friendRequestCount > 99 ? '99+' : friendRequestCount.toString();
  
  // Show badges only if count > 0
  const showMessageBadge = unreadMessageCount > 0;
  const showFriendBadge = friendRequestCount > 0;

  const handleMessagesClick = () => {
    onTabChange('messages');
    if (onMessagesClick) {
      onMessagesClick();
    }
  };

  return (
    <nav className="mobile-navbar">
      <div 
        className={`mobile-sidebar-item ${activeTab === 'messages' ? 'active' : ''}`}
        onClick={handleMessagesClick}
      >
        <div className="sidebar-icon message-icon"></div>
        {showMessageBadge && (
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
            {messageBadgeText}
          </div>
        )}
      </div>

      <div 
        className={`mobile-sidebar-item ${activeTab === 'contacts' ? 'active' : ''}`}
        onClick={() => onTabChange('contacts')}
      >
        <div className="sidebar-icon contacts-icon"></div>
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

      <div 
        className="mobile-sidebar-item"
        onClick={onAvatarClick}
        ref={avatarRef}
      >
        <div 
          className="user-avatar-mobile" 
          style={{ 
            backgroundColor: userAvatar ? 'transparent' : '#0084ff',
            backgroundImage: userAvatar ? `url(${userAvatar})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {!userAvatar && userInitial}
        </div>
      </div>
    </nav>
  );
};

export default MobileNavbar; 