import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './HomePage.css';
import api from '../../services/api';
import socketService from '../../services/socketService';
import type { Conversation, ConversationMember } from '../../services/api';
import { playNotificationSound, playMessageSound } from '../../utils/sound';

// Import các components
import MainSidebar from '../../components/home_user/MainSidebar';
import MobileNavbar from '../../components/home_user/MobileNavbar';
import UserDropdown from '../../components/home_user/UserDropdown';
import MessagesSidebar from '../../components/home_user/MessagesSidebar';
import MessagesContent from '../../components/home_user/MessagesContent';
import ContactsSidebar from '../../components/home_user/ContactsSidebar';
import ContactsContent from '../../components/home_user/ContactsContent';
import SettingsModal from '../../components/home_user/SettingsModal';
import ProfileModal from '../../components/home_user/ProfileModal';
import UserProfileModal from '../../components/home_user/UserProfileModal';
import SupportModal from '../../components/home_user/SupportModal';

interface UserProps {
  onLogout: () => void;
}

type ActiveTab = 'messages' | 'contacts';
type ContactTab = 'friends' | 'requests' | 'explore' | 'blocked';

const HomePage: React.FC<UserProps> = ({ onLogout }) => {
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('user') || '{}'));
  // Đảm bảo cập nhật trạng thái user khi có thay đổi từ server
  useEffect(() => {
    if (user?.user_id) {
      // Hàm fetch thông tin người dùng (status, last_activity, avatar)
      const fetchUserInfo = async () => {
        try {
          console.log('Đang lấy thông tin user với ID:', user.user_id);
          const userData = await api.getUserById(user.user_id);
          console.log('Thông tin user từ API:', userData);
          
          if (userData) {
            // Cập nhật state user
            setUser((prevUser: any) => {
              const updatedUser = {
                ...prevUser,
                status: userData.status || prevUser.status,
                last_activity: userData.last_activity || prevUser.last_activity,
                avatar: userData.avatar
              };
              console.log('User state sau khi cập nhật:', updatedUser);
              return updatedUser;
            });

            // Cập nhật localStorage
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const updatedStoredUser = {
              ...storedUser,
              status: userData.status || storedUser.status,
              last_activity: userData.last_activity || storedUser.last_activity,
              avatar: userData.avatar
            };
            localStorage.setItem('user', JSON.stringify(updatedStoredUser));
            console.log('Đã cập nhật localStorage:', updatedStoredUser);
          } else {
            console.log('Không lấy được thông tin user từ API');
          }
        } catch (error) {
          console.error('Lỗi khi cập nhật thông tin người dùng:', error);
        }
      };

      fetchUserInfo();
      const userRefreshInterval = setInterval(fetchUserInfo, 30000);
      return () => clearInterval(userRefreshInterval);
    } else {
      console.log('Không có user_id để fetch thông tin');
    }
  }, [user?.user_id]);

  // Khởi tạo user từ localStorage khi component mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log('Khởi tạo user từ localStorage:', parsedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Lỗi khi parse user từ localStorage:', error);
      }
    }
  }, []);

  const [showProfileDropdown, setShowProfileDropdown] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('messages');
  const [contactsTab, setContactsTab] = useState<ContactTab>('friends');
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showSupportModal, setShowSupportModal] = useState<boolean>(false);
  const [friendRequestCount, setFriendRequestCount] = useState<number>(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState<number>(0);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [showUserProfileModal, setShowUserProfileModal] = useState<boolean>(false);
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(undefined);
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const avatarRef = useRef<HTMLDivElement | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [lastToastId, setLastToastId] = useState<number | null>(null);
  const [friendIds, setFriendIds] = useState<number[]>([]);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth <= 768);
  
  // State cho mobile messages view
  const [_showMobileMessagesContent, _setShowMobileMessagesContent] = useState<boolean>(false);
  
  // Tự động cập nhật tổng số tin nhắn chưa đọc khi danh sách conversations thay đổi
  useEffect(() => {
    const total = calculateTotalUnreadMessages(conversations);
    setUnreadMessageCount(total);
  }, [conversations]);

  const calculateTotalUnreadMessages = (conversations: Conversation[]) => {
    return conversations.reduce((total, conversation) => {
      return total + (conversation.unread_count || 0);
    }, 0);
  };

  const refreshConversations = async () => {
    if (user && user.user_id) {
      try {
        const userConversations = await api.getUserConversations(user.user_id);
        setConversations(userConversations);
      } catch (error) {
        console.error('Lỗi khi lấy danh sách cuộc trò chuyện:', error);
      }
    }
  };
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'messages') {
      setActiveTab('messages');
      navigate('/', { replace: true });
    }

    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        if (parsedUser.role_id !== 2) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        } else {
          setUser(parsedUser);
          // Đã di chuyển việc khởi tạo socket sang useEffect mới
          refreshConversations(); // Vẫn gọi refreshConversations
        }
      } catch (error) {
        console.error('Lỗi khi parse thông tin người dùng:', error);
        navigate('/login');
      }
    } else {
      navigate('/login');
    }

    const handleOpenConversation = (event: any) => {
      if (event.detail && event.detail.conversation) {
        const conversation = event.detail.conversation;
        setCurrentConversation(conversation);
        
        setActiveTab('messages');
      }
    };

    window.removeEventListener('openConversation', handleOpenConversation as EventListener);
    window.addEventListener('openConversation', handleOpenConversation as EventListener);

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        avatarRef.current && 
        !dropdownRef.current.contains(event.target as Node) && 
        !avatarRef.current.contains(event.target as Node)
      ) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('openConversation', handleOpenConversation as EventListener);
    };
  }, [navigate, location]);

  useEffect(() => {
    if (currentConversation && user?.user_id) {
      // Effect markAllMessagesAsRead đã chuyển logic sang MessagesContent
    }
  }, [currentConversation, user]);

  useEffect(() => {
    const fetchFriendRequests = async () => {
      if (user && user.user_id) {
        try {
          const requests = await api.getReceivedFriendRequests(user.user_id);
          if (requests && Array.isArray(requests)) {
            setFriendRequestCount(requests.length);
          }
        } catch (error) {
          console.error('Lỗi khi lấy số lượng lời mời kết bạn:', error);
        }
      }
    };

    fetchFriendRequests();
    
    const intervalId = setInterval(() => {
      refreshConversations();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [user]);

  useEffect(() => {
    const checkAccountStatus = async () => {
      const userJson = localStorage.getItem('user');
      if (userJson) {
        try {
          const user = JSON.parse(userJson);
          const userId = user.user_id || user.id;
          
          if (userId) {
            const lockStatus = await api.checkAccountLockStatus(userId);
            
            if (lockStatus.isLocked && lockStatus.lockInfo) {
              navigate('/login', {
                state: {
                  isLocked: true,
                  lockInfo: {
                    ...lockStatus.lockInfo,
                    username: user.username,
                    email: user.email
                  }
                }
              });
            }
          }
        } catch (error) {
          console.error('Lỗi khi kiểm tra trạng thái tài khoản:', error);
        }
      }
    };
    
    checkAccountStatus();
  }, [navigate]);

  const handleLogoutClick = () => {
    socketService.disconnect();
    onLogout();
    navigate('/login');
  };

  const toggleProfileDropdown = () => {
    setShowProfileDropdown(prevState => !prevState);
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleProfileDropdown();
  };

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
  };

  const handleContactsTabChange = (tab: ContactTab) => {
    setContactsTab(tab);
  };

  const handleSettingsClick = () => {
    setShowSettingsModal(true);
    setShowProfileDropdown(false);
  };

  const handleProfileClick = () => {
    setShowProfileModal(true);
    setShowProfileDropdown(false);
  };

  const handleSupportClick = () => {
    setShowSupportModal(true);
    setShowProfileDropdown(false);
  };

  const handleUpdateLastActivity = async () => {
    try {
      const result = await api.updateLastActivitySystem();
      alert(`Cập nhật thành công: ${result.message}`);
      
      if (user && user.user_id) {
        await api.updateUserActivity(user.user_id);
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật:', error);
      alert('Lỗi khi cập nhật hệ thống');
    }
  };

  const handleFriendRequestUpdate = async () => {
    if (user && user.user_id) {
      try {
        const requests = await api.getReceivedFriendRequests(user.user_id);
        if (requests && Array.isArray(requests)) {
          setFriendRequestCount(requests.length);
        }
      } catch (error) {
        console.error('Lỗi khi cập nhật số lượng lời mời kết bạn:', error);
      }
    }
  };

  // Thêm hàm kiểm tra và phát âm thanh
  const playSound = (type: 'message' | 'notification') => {
    const messageSoundEnabled = localStorage.getItem('messageSoundEnabled') === 'true';
    const notificationSoundEnabled = localStorage.getItem('notificationSoundEnabled') === 'true';

    if (type === 'message' && messageSoundEnabled) {
      playMessageSound();
    } else if (type === 'notification' && notificationSoundEnabled) {
      playNotificationSound();
    }
  };

  // Khởi tạo socket và đăng ký các sự kiện
  useEffect(() => {
    if (!user || !user.user_id) return;
    
    socketService.connect(user.user_id);
    
    const handleFriendRequest = (data: any) => {
      setFriendRequestCount(prev => data.count || prev + 1);
      
      if (activeTab === 'contacts') {
        setContactsTab('requests');
      }
      
      if (data.sender && data.friendship_id !== lastToastId) {
        setToastMessage(`${data.sender.username} đã gửi lời mời kết bạn`);
        setShowToast(true);
        setLastToastId(data.friendship_id);
        
        setTimeout(() => {
          setShowToast(false);
        }, 5000);
        
        playSound('notification');
      }
    };
    
    const handleFriendRequestCountUpdate = (data: any) => {
      if (typeof data.count === 'number') {
        setFriendRequestCount(data.count);
      }
    };
    
    const handleUnreadCountUpdate = (_data: any) => {
      refreshConversations();
    };
    
    const handleUserStatusUpdate = (data: any) => {
      const { user_id, status, last_activity } = data;
      setConversations(prev => prev.map(conv => ({
        ...conv,
        members: conv.members?.map(m => m.user_id === user_id ? { ...m, status, last_activity } : m)
      })));
      if (currentConversation?.members) {
        setCurrentConversation({
          ...currentConversation,
          members: currentConversation.members.map(m => m.user_id === user_id ? { ...m, status, last_activity } : m)
        });
      }
    };
    socketService.on('user_status_update', handleUserStatusUpdate);
    
    socketService.on('friend_request', handleFriendRequest);
    socketService.on('friend_request_count_update', handleFriendRequestCountUpdate);
    socketService.on('unread_count_update', handleUnreadCountUpdate);
    
    const socketCheckInterval = setInterval(() => {
      if (user && user.user_id && !socketService.isConnected()) {
        socketService.connect(user.user_id);
      }
    }, 10000);
    
    return () => {
      clearInterval(socketCheckInterval);
      socketService.off('friend_request', handleFriendRequest);
      socketService.off('friend_request_count_update', handleFriendRequestCountUpdate);
      socketService.off('unread_count_update', handleUnreadCountUpdate);
      socketService.off('user_status_update', handleUserStatusUpdate);
      socketService.disconnect();
    };
  }, [user, activeTab, lastToastId, currentConversation]);

  // Lấy danh sách bạn bè
  useEffect(() => {
    const loadFriends = async () => {
      if (user?.user_id) {
        try {
          const friends = await api.getFriends(user.user_id);
          const ids = friends.map(friend => friend.user_id);
          setFriendIds(ids);
        } catch (error) {
          console.error('Lỗi khi tải danh sách bạn bè:', error);
        }
      }
    };
    
    loadFriends();
    
    const statusRefreshInterval = setInterval(async () => {
      if (user?.user_id) {
        try {
          const friends = await api.getFriends(user.user_id);
          setFriendIds(friends.map(friend => friend.user_id));
          
          if (conversations.length > 0) {
            const updatedConversations = [...conversations];
            let hasChanges = false;
            
            for (const conversation of updatedConversations) {
              if (conversation.members) {
                for (const friend of friends) {
                  const memberIndex = conversation.members.findIndex(m => m.user_id === friend.user_id);
                  if (memberIndex !== -1) {
                    const oldStatus = conversation.members[memberIndex].status;
                    const oldActivity = (conversation.members[memberIndex] as any).last_activity;
                    
                    if (oldStatus !== friend.status || oldActivity !== friend.last_activity) {
                      const updatedMember = {
                        ...conversation.members[memberIndex],
                        status: friend.status
                      } as any;
                      
                      updatedMember.last_activity = friend.last_activity;
                      
                      conversation.members[memberIndex] = updatedMember;
                      hasChanges = true;
                    }
                  }
                }
              }
            }
            
            if (hasChanges) {
              setConversations(updatedConversations);
              
              if (currentConversation?.conversation_id) {
                const updatedCurrent = updatedConversations.find(
                  conv => conv.conversation_id === currentConversation.conversation_id
                );
                if (updatedCurrent) {
                  setCurrentConversation(updatedCurrent);
                }
              }
            }
          }
        } catch (error) {
          console.error('Lỗi khi làm mới trạng thái hoạt động:', error);
        }
      }
    }, 10000);
    
    return () => {
      clearInterval(statusRefreshInterval);
    };
  }, [user?.user_id, conversations, currentConversation]);

  // Đăng ký sự kiện socket cho tin nhắn mới
  useEffect(() => {
    const processedMessageIds = new Set<string>();

    const handleNewMessage = (data: any) => {
      const messageKey = `msg_${data.message_id}`;
      
      if (!processedMessageIds.has(messageKey)) {
        processedMessageIds.add(messageKey);
        
        setTimeout(() => {
          processedMessageIds.delete(messageKey);
        }, 5000);
        
        // Phát âm thanh nếu không phải tin nhắn của mình
        if (data.sender_id !== user?.user_id) {
          playSound('message');
        }

        // Refresh conversations để cập nhật unread count và last message
        refreshConversations();
      }
    };
    
    if (user) {
      socketService.on('new_message', handleNewMessage);
    }
    
    return () => {
      if (user) {
        socketService.off('new_message', handleNewMessage);
      }
    };
  }, [user, refreshConversations]);

  // Monitor socket connection status
  useEffect(() => {
    if (!user?.user_id) return;

    const checkConnection = setInterval(() => {
      if (!socketService.isConnected()) {
        console.log('[HOMEPAGE] Socket disconnected, attempting to reconnect...');
        socketService.connect(user.user_id);
      }
    }, 15000); // Check every 15 seconds

    return () => {
      clearInterval(checkConnection);
    };
  }, [user?.user_id]);

  useEffect(() => {
    const handleSwitchToMessagesTab = () => {
      setActiveTab('messages');
    };

    window.addEventListener('switchToMessagesTab', handleSwitchToMessagesTab);
    
    return () => {
      window.removeEventListener('switchToMessagesTab', handleSwitchToMessagesTab);
    };
  }, []);

  // Lắng nghe sự thay đổi kích thước màn hình
  useEffect(() => {
    const handleResize = () => {
      const newIsMobile = window.innerWidth <= 768;
      setIsMobile(newIsMobile);
      
      // Reset mobile messages content khi chuyển sang desktop
      if (!newIsMobile) {
        _setShowMobileMessagesContent(false);
        setCurrentConversation(null);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!user) {
    return <div className="loading">Đang tải...</div>;
  }

  const getContactsHeaderTitle = () => {
    switch (contactsTab) {
      case 'friends':
        return 'Danh sách bạn bè';
      case 'requests':
        return 'Lời mời kết bạn';
      case 'explore':
        return 'Thêm bạn bè';
      case 'blocked':
        return 'Người đã chặn';
      default:
        return 'Danh bạ';
    }
  };

  const userInitial = user.username ? user.username.charAt(0).toUpperCase() : '?';

  const handleConversationUpdate = (updatedConversation: Conversation) => {
    setConversations(prevConversations => 
      prevConversations.map(conv => 
        conv.conversation_id === updatedConversation.conversation_id 
          ? updatedConversation 
          : conv
      )
    );
    setCurrentConversation(updatedConversation);
  };

  // Lấy tên hiển thị cho cuộc trò chuyện
  const getConversationName = (conversation: Conversation) => {
    if (conversation.conversation_type === 'system') {
      return 'Thông báo Hệ thống';
    }
    
    if (conversation.conversation_type === 'personal' && conversation.members) {
      const otherMember = conversation.members.find(member => member.user_id !== user.user_id);
      
      if (otherMember && otherMember.user_id === 1) {
        return 'Thông báo Hệ thống';
      }
      
      return otherMember?.username || 'Người dùng';
    }
    
    return `Nhóm (${conversation.members?.length || 0} thành viên)`;
  };

  // Hàm tính thời gian chênh lệch và hiển thị trạng thái hoạt động
  const getMemberStatusText = (member?: ConversationMember) => {
    if (!member) return 'Ngoại tuyến';

    if (member.user_id === 1) {
      return '';
    }

    const isFriend = friendIds.includes(member.user_id);
    
    if (!isFriend) return 'Ngoại tuyến';
    
    if (member.status === 'online') return 'Đang hoạt động';
    if ((member as any).last_activity) {
      const last = (member as any).last_activity;
      const diffMin = Math.floor((Date.now() - new Date(last).getTime()) / 60000);
      if (diffMin < 60) return `Hoạt động lần cuối ${diffMin} phút trước`;
      const diffH = Math.floor(diffMin / 60);
      return `Hoạt động lần cuối ${diffH} giờ trước`;
    }
    return 'Ngoại tuyến';
  };
  const getMemberStatusColor = (member?: ConversationMember) => {
    if (!member) return '#CCCCCC';
    
    if (member.user_id === 1) {
      return 'transparent';
    }
    
    const isFriend = friendIds.includes(member.user_id);
    
    if (!isFriend) return '#CCCCCC';
    
    return member.status === 'online' ? '#4CAF50' : '#CCCCCC';
  };

  // Xử lý khi click vào avatar hoặc tên người dùng trong header tin nhắn
  const handleUserHeaderClick = () => {
    if (!currentConversation || currentConversation.conversation_type !== 'personal') return;
    
    const otherMember = currentConversation.members?.find(member => member.user_id !== user.user_id);
    
    if (otherMember && otherMember.user_id) {
      setSelectedUserId(otherMember.user_id);
      setShowUserProfileModal(true);
    }
  };
  
  // Đóng modal thông tin người dùng
  const handleCloseUserProfileModal = () => {
    setShowUserProfileModal(false);
    setSelectedUserId(undefined);
  };
  
  // Xử lý khi có cập nhật từ UserProfileModal (ví dụ: gửi lời mời kết bạn, chấp nhận lời mời...)
  const handleUserProfileUpdate = () => {
    if (friendIds.length > 0) {
      api.getFriends(user.user_id).then(friends => {
        setFriendIds(friends.map(friend => friend.user_id));
      }).catch(error => {
        console.error('Lỗi khi làm mới danh sách bạn bè:', error);
      });
    }
    
    handleFriendRequestUpdate();
  };

  // Handler cho mobile messages view
  const handleMobileMessagesBack = () => {
    if (isMobile) {
      _setShowMobileMessagesContent(false);
      setCurrentConversation(null);
    }
  };

  const handleMobileMessagesToggle = () => {
    if (isMobile) {
      // Không cần toggle nữa vì sidebar hiển thị trực tiếp
      setActiveTab('messages');
    }
  };

  const handleConversationSelect = (conversation: Conversation) => {
    handleConversationUpdate(conversation);
    if (isMobile) {
      // Trên mobile, chuyển sang view messages content
      _setShowMobileMessagesContent(true);
    }
  };

  return (
    <div className="user-home-container">
      <MainSidebar 
        activeTab={activeTab} 
        userInitial={userInitial} 
        userAvatar={(() => {
          console.log('userAvatar được truyền vào MainSidebar:', user.avatar);
          return user.avatar;
        })()}
        onTabChange={handleTabChange} 
        onAvatarClick={handleAvatarClick}
        avatarRef={avatarRef}
        onSettingsClick={handleSettingsClick}
        friendRequestCount={friendRequestCount}
        unreadMessageCount={unreadMessageCount}
      />
      
      <MobileNavbar
        activeTab={activeTab}
        userInitial={userInitial}
        userAvatar={user.avatar}
        onTabChange={handleTabChange}
        onAvatarClick={handleAvatarClick}
        avatarRef={avatarRef}
        friendRequestCount={friendRequestCount}
        unreadMessageCount={unreadMessageCount}
        onMessagesClick={handleMobileMessagesToggle}
      />
      
      <div className="main-content">
        {activeTab === 'messages' ? (
          <div className={`messages-container ${isMobile && currentConversation ? 'has-conversation' : ''}`}>
            <div className="content-header">
              {currentConversation ? (
                <>
                  {isMobile && (
                    <button
                      className="mobile-back-to-list"
                      onClick={handleMobileMessagesBack}
                    >
                      <i className="fas fa-arrow-left"></i>
                    </button>
                  )}
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      ...(currentConversation.conversation_type === 'personal' &&
                         currentConversation.members?.find(m => m.user_id !== user.user_id)?.avatar
                        ? {
                            backgroundImage: `url(${currentConversation.members.find(m => m.user_id !== user.user_id)?.avatar})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundColor: 'transparent',
                            color: 'transparent'
                          }
                        : {
                            backgroundColor: '#0066ff',
                            color: 'white'
                          }),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '18px',
                      marginRight: '12px',
                      cursor: 'pointer'
                    }}
                    onClick={handleUserHeaderClick}
                  >
                    {!(currentConversation.conversation_type === 'personal' &&
                       currentConversation.members?.find(m => m.user_id !== user.user_id)?.avatar) &&
                      (currentConversation.conversation_type === 'personal' &&
                       currentConversation.members?.find(member => member.user_id !== user.user_id)?.user_id === 1
                        ? <i className="fas fa-wrench" style={{ fontSize: '16px' }}></i>
                        : getConversationName(currentConversation).charAt(0).toUpperCase())
                    }
                  </div>
                  <div 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                    onClick={handleUserHeaderClick}
                  >
                    <h2 style={{ margin: 0 }}>{getConversationName(currentConversation)}</h2>
                    {(() => {
                      const otherMember = currentConversation.members?.find(m => m.user_id !== user.user_id);
                      if (otherMember && otherMember.user_id !== 1) {
                        return (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginTop: '4px',
                            fontSize: '14px',
                            color: '#888'
                          }}>
                            <span style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: getMemberStatusColor(otherMember),
                              display: 'inline-block',
                              marginRight: '6px'
                            }} />
                            {getMemberStatusText(otherMember)}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </>
              ) : (
                <h2>Tin nhắn</h2>
              )}
            </div>
            
            {/* Desktop view - hiển thị sidebar bình thường */}
            {!isMobile && (
              <MessagesSidebar 
                userId={user.user_id} 
                currentConversation={currentConversation}
                setCurrentConversation={handleConversationUpdate}
                conversations={conversations}
                setConversations={setConversations}
              />
            )}

            {/* Mobile view - hiển thị sidebar trực tiếp */}
            {isMobile && !currentConversation && (
              <MessagesSidebar 
                userId={user.user_id} 
                currentConversation={currentConversation}
                setCurrentConversation={handleConversationSelect}
                conversations={conversations}
                setConversations={setConversations}
              />
            )}
            
            <MessagesContent 
              userId={user.user_id}
              currentConversation={currentConversation}
            />
          </div>
        ) : (
          <div className="contacts-container">
            <div className="content-header">
              <h2>{getContactsHeaderTitle()}</h2>
            </div>
            <ContactsSidebar 
              activeTab={contactsTab}
              onTabChange={handleContactsTabChange} 
              friendRequestCount={friendRequestCount}
            />
            <ContactsContent 
              activeTab={contactsTab} 
              onFriendRequestUpdate={handleFriendRequestUpdate}
              userId={user.user_id}
              setCurrentConversation={setCurrentConversation}
            />
          </div>
        )}
      </div>

      {showProfileDropdown && (
        <UserDropdown
          username={user.username}
          dropdownRef={dropdownRef}
          onLogout={handleLogoutClick}
          onProfileClick={handleProfileClick}
          onSettingsClick={handleSettingsClick}
          onUpdateLastActivity={handleUpdateLastActivity}
          onSupportClick={handleSupportClick}
          userStatus={user.status}
          lastActivity={user.last_activity}
          isMobile={isMobile}
        />
      )}

      <SettingsModal 
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      {showSupportModal && (
        <SupportModal
          isOpen={showSupportModal}
          onClose={() => setShowSupportModal(false)}
        />
      )}

      {showToast && (
        <div className="toast-container">
          <div className="toast-notification">
            <div className="toast-icon">
              <i className="fas fa-user-plus"></i>
            </div>
            <div className="toast-content">
              <div className="toast-title">Lời mời kết bạn mới</div>
              <div className="toast-message">{toastMessage}</div>
            </div>
            <button 
              className="toast-close-button" 
              onClick={() => setShowToast(false)}
            >
              &times;
            </button>
          </div>
        </div>
      )}
      
      {showUserProfileModal && selectedUserId && (
        <UserProfileModal
          isOpen={showUserProfileModal}
          onClose={handleCloseUserProfileModal}
          userId={selectedUserId}
          onFriendRequestSent={handleUserProfileUpdate}
        />
      )}
      
      <style>
        {`
          .toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
          }
          
          .toast-notification {
            display: flex;
            align-items: center;
            background-color: #fff;
            border-left: 4px solid #0084ff;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            border-radius: 4px;
            padding: 12px 15px;
            min-width: 300px;
            max-width: 350px;
            animation: slideIn 0.3s ease forwards;
          }
          
          .toast-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background-color: #e6f3ff;
            margin-right: 12px;
            flex-shrink: 0;
          }
          
          .toast-icon i {
            color: #0084ff;
            font-size: 14px;
          }
          
          .toast-content {
            flex: 1;
          }
          
          .toast-title {
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 4px;
            color: #333;
          }
          
          .toast-message {
            font-size: 13px;
            color: #666;
          }
          
          .toast-close-button {
            background-color: transparent;
            border: none;
            font-size: 18px;
            color: #aaa;
            cursor: pointer;
            margin-left: 10px;
            padding: 0;
            line-height: 1;
          }
          
          .toast-close-button:hover {
            color: #666;
          }
          
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
};

export default HomePage; 