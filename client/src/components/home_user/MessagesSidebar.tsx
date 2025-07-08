import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';
import type { Conversation } from '../../services/api';
import socketService from '../../services/socketService';

interface MessagesSidebarProps {
  userId: number;
  currentConversation: Conversation | null;
  setCurrentConversation: (conversation: Conversation) => void;
  conversations?: Conversation[];  // Thêm danh sách cuộc trò chuyện từ prop
  setConversations?: React.Dispatch<React.SetStateAction<Conversation[]>>;  // Thêm function để cập nhật danh sách
}

interface Styles {
  conversationList: React.CSSProperties;
  conversationItem: React.CSSProperties;
  conversationItemActive: React.CSSProperties;
  conversationAvatar: React.CSSProperties;
  conversationTime: React.CSSProperties;
  unreadBadge: React.CSSProperties;
  conversationInfo: React.CSSProperties;
  conversationHeader: React.CSSProperties;
  conversationName: React.CSSProperties;
  conversationNameActive: React.CSSProperties;
  conversationLastMessage: React.CSSProperties;
  conversationLastMessageActive: React.CSSProperties;
  loadingConversations: React.CSSProperties;
  emptyConversations: React.CSSProperties;
  emptyIcon: React.CSSProperties;
  emptyText: React.CSSProperties;
  emptyDescription: React.CSSProperties;
  sidebarHeader: React.CSSProperties;
  searchBar: React.CSSProperties;
  searchInput: React.CSSProperties;
  searchIcon: React.CSSProperties;
  strangerSection: React.CSSProperties;
  strangerHeader: React.CSSProperties;
  strangerBadge: React.CSSProperties;
  strangerConversationItem: React.CSSProperties;
  strangerIcon: React.CSSProperties;
  strangerMessagesHeader: React.CSSProperties;
  strangerMessagesTitle: React.CSSProperties;
  strangerMessagesBadge: React.CSSProperties;
  strangerMessagesArrow: React.CSSProperties;
  strangerMessagesContent: React.CSSProperties;
  strangerMessagesContentVisible: React.CSSProperties;
  newMessageDot: React.CSSProperties;
  strangerCountDot: React.CSSProperties;
}

const baseConversationItem: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '12px 15px',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  borderRadius: '8px',
};

const MessagesSidebar: React.FC<MessagesSidebarProps> = ({ 
  userId, 
  currentConversation, 
  setCurrentConversation,
  conversations: propConversations, // Prop conversations từ component cha
  setConversations: propSetConversations // Prop setConversations từ component cha
}) => {
  const [localConversations, setLocalConversations] = useState<Conversation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [friendIds, setFriendIds] = useState<number[]>([]);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('darkMode') === 'true';
  });
  // Thêm state cho dropdown tin nhắn từ người lạ
  const [showStrangerMessages, setShowStrangerMessages] = useState(false);
  const [hasNewStrangerMessage, setHasNewStrangerMessage] = useState(false);

  // Sử dụng conversations từ prop nếu có, ngược lại sử dụng state nội bộ
  const conversations = propConversations || localConversations;
  const setConversations = propSetConversations || setLocalConversations;

  // Định nghĩa styles
  const styles: Styles = {
    conversationList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
    },
    conversationItem: baseConversationItem,
    conversationItemActive: {
      backgroundColor: isDarkMode ? '#000000' : '#e9f5ff',
      border: isDarkMode ? '1px solid #444444' : 'none',
      boxShadow: isDarkMode ? '0 2px 8px rgba(255, 255, 255, 0.1)' : 'none',
    },
    conversationAvatar: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      backgroundColor: '#0066ff',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      fontSize: '16px',
      marginRight: '12px',
      position: 'relative' as const,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      border: '1px solid #e0e0e0',
    },
    conversationTime: {
      fontSize: '12px',
      color: '#888',
      whiteSpace: 'nowrap' as const,
      position: 'relative' as const,
    },
    unreadBadge: {
      position: 'absolute' as const,
      top: '100%',
      right: '0',
      backgroundColor: '#ff3b30',
      color: 'white',
      fontSize: '10px',
      minWidth: '16px',
      height: '16px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid white',
      marginTop: '2px',
    },
    conversationInfo: {
      flex: 1,
      minWidth: 0,
    },
    conversationHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '4px',
    },
    conversationName: {
      fontWeight: 500,
      fontSize: '14px',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden' as const,
      textOverflow: 'ellipsis' as const,
      color: isDarkMode ? '#ffffff' : '#000000',
    },
    conversationNameActive: {
      color: isDarkMode ? '#ffffff' : '#000000',
      fontWeight: 600,
    },
    conversationLastMessage: {
      fontSize: '13px',
      color: isDarkMode ? '#aaaaaa' : '#666',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden' as const,
      textOverflow: 'ellipsis' as const,
    },
    conversationLastMessageActive: {
      color: isDarkMode ? '#cccccc' : '#333',
    },
    loadingConversations: {
      padding: '20px',
      textAlign: 'center' as const,
      color: '#888',
    },
    emptyConversations: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      textAlign: 'center' as const,
      color: isDarkMode ? '#cccccc' : '#000',
      height: '100%',
    },
    emptyIcon: {
      width: '80px',
      height: '80px',
      margin: '0 auto 20px',
      backgroundColor: isDarkMode ? '#333333' : '#f0f0f0',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      fontWeight: 500,
      fontSize: '16px',
      marginBottom: '5px',
      color: isDarkMode ? '#ffffff' : '#000',
    },
    emptyDescription: {
      fontSize: '14px',
      color: isDarkMode ? '#aaaaaa' : '#444',
      maxWidth: '220px',
      lineHeight: '1.5',
    },
    sidebarHeader: {
      padding: '15px 15px 10px',
    },
    searchBar: {
      padding: '10px 15px',
      backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5',
      borderRadius: '8px',
      margin: '10px 15px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      border: isDarkMode ? '1px solid #444' : '1px solid #e0e0e0'
    },
    searchInput: {
      flex: 1,
      border: 'none',
      outline: 'none',
      backgroundColor: 'transparent',
      color: isDarkMode ? '#e0e0e0' : '#000000',
      fontSize: '14px',
    },
    searchIcon: {
      color: isDarkMode ? '#7a7a7a' : '#888888',
      fontSize: '16px',
    },
    strangerSection: {
      marginTop: '15px',
      paddingTop: '15px',
      borderTop: isDarkMode ? '1px solid #333' : '1px solid #eee',
    },
    strangerHeader: {
      padding: '10px 15px',
      fontSize: '14px',
      fontWeight: 500,
      color: isDarkMode ? '#888' : '#666',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    strangerBadge: {
      backgroundColor: isDarkMode ? '#333' : '#f0f0f0',
      color: isDarkMode ? '#aaa' : '#666',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 'normal',
    },
    strangerConversationItem: {
      ...baseConversationItem,
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
      border: isDarkMode ? '1px solid #333' : '1px solid #eee',
      marginBottom: '2px',
    },
    strangerIcon: {
      marginRight: '8px',
      color: isDarkMode ? '#666' : '#999',
      fontSize: '14px',
    },
    strangerMessagesHeader: {
      display: 'flex',
      alignItems: 'center',
      padding: '12px 15px',
      cursor: 'pointer',
      backgroundColor: isDarkMode ? '#1a1a1a' : '#f5f5f5',
      borderRadius: '8px',
      marginTop: '8px',
      marginBottom: '4px',
      transition: 'all 0.2s ease',
      position: 'relative',
    },
    strangerMessagesTitle: {
      flex: 1,
      fontSize: '14px',
      fontWeight: 600,
      color: isDarkMode ? '#ffffff' : '#000000',
    },
    strangerMessagesBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginLeft: '8px',
    },
    strangerMessagesArrow: {
      marginLeft: '8px',
      transition: 'transform 0.2s ease',
    },
    strangerMessagesContent: {
      overflow: 'hidden',
      transition: 'max-height 0.3s ease-in-out',
      maxHeight: '0',
    },
    strangerMessagesContentVisible: {
      maxHeight: '500px',
    },
    newMessageDot: {
      backgroundColor: '#ff3b30',
      color: 'white',
      fontSize: '10px',
      minWidth: '16px',
      height: '16px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 4px',
    },
    strangerCountDot: {
      backgroundColor: '#4CAF50',
      color: 'white',
      fontSize: '10px',
      minWidth: '16px',
      height: '16px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 4px',
    },
  };

  // Thêm CSS cho placeholder riêng biệt
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .messages-search-input::placeholder {
        color: ${isDarkMode ? '#7a7a7a' : '#888888'};
      }
    `;
    document.head.appendChild(styleElement);
    return () => {
      document.head.removeChild(styleElement);
    };
  }, [isDarkMode]);

  // Phân loại cuộc trò chuyện thành 2 nhóm: bạn bè và người lạ
  const categorizedConversations = useMemo(() => {
    const friends: Conversation[] = [];
    const strangers: Conversation[] = [];

    conversations.forEach(conversation => {
      if (conversation.conversation_type === 'personal' && conversation.members) {
        const otherMember = conversation.members.find(member => member.user_id !== userId);
        if (otherMember) {
          // Nếu là bạn bè hoặc tài khoản hệ thống
          if (friendIds.includes(otherMember.user_id) || otherMember.user_id === 1) {
            friends.push(conversation);
          } else {
            strangers.push(conversation);
          }
        }
      } else {
        // Các cuộc trò chuyện nhóm luôn nằm trong danh sách bạn bè
        friends.push(conversation);
      }
    });

    return { friends, strangers };
  }, [conversations, friendIds, userId]);

  // Hàm lấy danh sách cuộc trò chuyện
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      if (!userId) return;
      
      // Lấy danh sách cuộc trò chuyện từ API
      const userConversations = await api.getUserConversations(userId);
      // Enrich: lấy avatar và status cho thành viên khác trong cuộc trò chuyện cá nhân
      const enrichedConversations = await Promise.all(
        userConversations.map(async (conv) => {
          if (conv.conversation_type === 'personal' && conv.members) {
            const other = conv.members.find(m => m.user_id !== userId);
            if (other) {
              try {
                const userData = await api.getUserById(other.user_id);
                if (userData) {
                  other.avatar = userData.avatar;
                  other.status = userData.status;
                }
              } catch (err) {
                console.error('Lỗi khi lấy thông tin người dùng:', err);
              }
            }
          }
          return conv;
        })
      );
       
      // Cập nhật state với dữ liệu đã enrich
      if (!propConversations) {
        setLocalConversations(enrichedConversations);
      } else if (propSetConversations) {
        propSetConversations(enrichedConversations);
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách cuộc trò chuyện:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, propConversations, propSetConversations]);

  // Lắng nghe sự kiện thay đổi theme
  useEffect(() => {
    // Hàm xử lý khi localStorage thay đổi
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'darkMode') {
        const newDarkMode = event.newValue === 'true';
        setIsDarkMode(newDarkMode);
        // Làm mới danh sách cuộc trò chuyện
        setLoading(true);
        fetchConversations();
      }
    };

    // Hàm xử lý sự kiện tùy chỉnh cho thay đổi theme
    const handleThemeChange = (e: Event) => {
      const newDarkMode = localStorage.getItem('darkMode') === 'true';
      if (isDarkMode !== newDarkMode) {
        setIsDarkMode(newDarkMode);
        // Làm mới danh sách cuộc trò chuyện
        setLoading(true);
        fetchConversations();
      }
    };

    // Kiểm tra thay đổi theme
    const checkThemeChange = () => {
      const currentDarkMode = localStorage.getItem('darkMode') === 'true';
      if (isDarkMode !== currentDarkMode) {
        setIsDarkMode(currentDarkMode);
        // Làm mới danh sách cuộc trò chuyện
        setLoading(true);
        fetchConversations();
      }
    };

    // Đăng ký lắng nghe các sự kiện
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('themeChanged', handleThemeChange);
    document.addEventListener('themeToggled', handleThemeChange);
    
    // Kiểm tra định kỳ mỗi 500ms
    const intervalCheck = setInterval(checkThemeChange, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('themeChanged', handleThemeChange);
      document.removeEventListener('themeToggled', handleThemeChange);
      clearInterval(intervalCheck);
    };
  }, [isDarkMode, fetchConversations]);

  // Tải ban đầu danh sách cuộc trò chuyện
  useEffect(() => {
    // Chỉ gọi API lấy danh sách cuộc trò chuyện nếu không nhận được từ props
    if (!propConversations) {
      fetchConversations();
      
      // Cập nhật danh sách cuộc trò chuyện mỗi 30 giây nếu không có prop
      const intervalId = setInterval(fetchConversations, 30000);
      
      return () => clearInterval(intervalId);
    } else {
      // Nếu có prop conversations thì không cần loading nữa
      setLoading(false);
    }
  }, [userId, propConversations, fetchConversations]);

  // Lắng nghe sự kiện tin nhắn mới
  useEffect(() => {
    if (!userId) return;

    const handleNewMessage = (data: any) => {
      // Cập nhật thông tin tin nhắn mới nhất vào cuộc trò chuyện
      setConversations(prevConversations => {
        const conversationExists = prevConversations.some(
          conv => conv.conversation_id === data.conversation_id
        );

        if (!conversationExists) {
          fetchConversations();
          return prevConversations;
        }

        const updatedConversations = prevConversations.map(conv => {
          if (conv.conversation_id === data.conversation_id) {
            return {
              ...conv,
              last_message_id: data.message_id,
              last_message_content: data.content,
              last_message_time: data.created_at
            };
          }
          return conv;
        });

        return updatedConversations.sort((a, b) => {
          const timeA = new Date(a.last_message_time || a.updated_at || 0).getTime();
          const timeB = new Date(b.last_message_time || b.updated_at || 0).getTime();
          return timeB - timeA;
        });
      });
    };
    
    // Cập nhật unread_count khi nhận được sự kiện tin nhắn đã đọc
    const handleMessageRead = (data: any) => {
      if (data.conversation_id) {
        // Cập nhật state ngay lập tức để UI phản hồi nhanh
        setConversations(prevConversations => {
          return prevConversations.map(conv => {
            if (conv.conversation_id === data.conversation_id) {
              // Đặt unread_count về 0 trong các trường hợp:
              // 1. Người đọc là người dùng hiện tại
              // 2. Tin nhắn được đánh dấu là đã đọc
              // 3. Có danh sách message_ids và tất cả tin nhắn đều đã được đọc
              if (data.reader_id === userId || 
                  data.is_read || 
                  (data.message_ids && data.message_ids.length > 0)) {
                return { ...conv, unread_count: 0 };
              }
            }
            return conv;
          });
        });

        // Gọi API để đồng bộ trạng thái với server
        fetchConversations();
      }
    };

    // Cập nhật unread_count khi nhận được sự kiện
    const handleUnreadCountUpdate = (data: any) => {
      if (data.conversation_id && typeof data.unread_count === 'number') {
        setConversations(prevConversations => {
          return prevConversations.map(conv => {
            if (conv.conversation_id === data.conversation_id) {
              return { ...conv, unread_count: data.unread_count };
            }
            return conv;
          });
        });
      } else if (data.reader_id === userId) {
        // Nếu người đọc là người dùng hiện tại, cập nhật tất cả cuộc trò chuyện
        fetchConversations();
      }
    };

    // Đăng ký lắng nghe các sự kiện
    socketService.on('new_message', handleNewMessage);
    socketService.on('message_read_receipt', handleMessageRead);
    socketService.on('unread_count_update', handleUnreadCountUpdate);
    
    // Hủy đăng ký khi component unmount
    return () => {
      socketService.off('new_message', handleNewMessage);
      socketService.off('message_read_receipt', handleMessageRead);
      socketService.off('unread_count_update', handleUnreadCountUpdate);
    };
  }, [userId, currentConversation, setConversations, fetchConversations]);

  // Tải danh sách bạn bè
  useEffect(() => {
    const loadFriends = async () => {
      if (!userId) return;
      
      try {
        const friends = await api.getFriends(userId);
        // Lấy mảng các ID của bạn bè
        const ids = friends.map(friend => friend.user_id);
        setFriendIds(ids);
      } catch (error) {
        console.error('Lỗi khi tải danh sách bạn bè:', error);
      }
    };
    
    loadFriends();
    
    // Thêm interval để làm mới trạng thái bạn bè mỗi 10 giây và làm mới cuộc trò chuyện
    const statusRefreshInterval = setInterval(async () => {
      await loadFriends();
      // Làm mới danh sách cuộc trò chuyện với fetchConversations (bao gồm enrich avatar)
      if (!propConversations) {
        fetchConversations();
      }
    }, 10000);
    
    return () => {
      clearInterval(statusRefreshInterval);
    };
  }, [userId, propConversations, fetchConversations]);

  // Lắng nghe sự kiện thay đổi trạng thái bạn bè
  useEffect(() => {
    const handleFriendshipChange = async (data: any) => {
      if (data.user_id === userId || data.friend_id === userId) {
        // Cập nhật lại danh sách bạn bè
        try {
          const friends = await api.getFriends(userId);
          const ids = friends.map(friend => friend.user_id);
          setFriendIds(ids);
          
          // Làm mới danh sách cuộc trò chuyện để cập nhật phân loại
          fetchConversations();
        } catch (error) {
          console.error('Lỗi khi cập nhật danh sách bạn bè:', error);
        }
      }
    };

    // Đăng ký lắng nghe các sự kiện liên quan đến thay đổi trạng thái bạn bè
    socketService.on('friend_request_accepted', handleFriendshipChange);
    socketService.on('friend_removed', handleFriendshipChange);

    return () => {
      socketService.off('friend_request_accepted', handleFriendshipChange);
      socketService.off('friend_removed', handleFriendshipChange);
    };
  }, [userId, fetchConversations]);

  // Thêm useEffect để kiểm tra tin nhắn mới từ người lạ
  useEffect(() => {
    const hasUnread = categorizedConversations.strangers.some(
      conv => (conv.unread_count ?? 0) > 0
    );
    setHasNewStrangerMessage(hasUnread);
  }, [categorizedConversations.strangers]);

  // Xử lý cập nhật trạng thái khi người dùng truy cập lại tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Làm mới danh sách cuộc trò chuyện khi quay lại tab
        fetchConversations();
      }
    };

    // Thêm event listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchConversations]);

  // Lọc cuộc trò chuyện theo từ khóa tìm kiếm
  const filteredConversations = useMemo(() => {
    if (!searchTerm) {
      return categorizedConversations;
    }

    const searchLower = searchTerm.toLowerCase();
    
    const filterConversation = (conversation: Conversation) => {
      // Tìm kiếm trong tên người dùng của thành viên
      const matchesMembers = conversation.members?.some(member => 
        member.username?.toLowerCase().includes(searchLower)
      );
      
      // Tìm kiếm trong nội dung tin nhắn cuối cùng
      const matchesContent = conversation.last_message_content?.toLowerCase().includes(searchLower);
      
      return matchesMembers || matchesContent;
    };

    return {
      friends: categorizedConversations.friends.filter(filterConversation),
      strangers: categorizedConversations.strangers.filter(filterConversation)
    };
  }, [searchTerm, categorizedConversations]);

  // Xử lý chọn cuộc trò chuyện
  const handleSelectConversation = async (conversation: Conversation) => {
    // Không lưu vào localStorage nữa để không tự động tải khi khởi động
    // Chỉ cập nhật state hiện tại
    
    // Gọi callback để cập nhật cuộc trò chuyện hiện tại
    setCurrentConversation(conversation);

    // Đánh dấu tin nhắn đã đọc khi chọn cuộc trò chuyện
    if (conversation.unread_count && conversation.unread_count > 0) {
      try {
        // Đánh dấu tất cả tin nhắn trong cuộc trò chuyện là đã đọc
        await api.markAllMessagesAsRead(conversation.conversation_id, userId);
        
        // Cập nhật state local
        setConversations(prevConversations => 
          prevConversations.map(conv => 
            conv.conversation_id === conversation.conversation_id
              ? { ...conv, unread_count: 0 }
              : conv
          )
        );

        // Thông báo cho server về việc đọc tin nhắn
        socketService.emit('message_read', {
          conversation_id: conversation.conversation_id,
          reader_id: userId,
          is_read: true
        });

        // Làm mới danh sách cuộc trò chuyện
        fetchConversations();
      } catch (error) {
        console.error('Lỗi khi đánh dấu tin nhắn đã đọc:', error);
      }
    }
  };

  // Định dạng thời gian
  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    const today = new Date();
    
    // Kiểm tra nếu cùng ngày
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // Nếu trong tuần này
    const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return date.toLocaleDateString('vi-VN', { weekday: 'short' });
    }
    
    // Nếu khác thì hiển thị ngày tháng
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  // Lấy tên hiển thị cho cuộc trò chuyện
  const getConversationName = (conversation: Conversation) => {
    // Nếu là cuộc trò chuyện hệ thống
    if (conversation.conversation_type === 'system') {
      return 'Thông báo Hệ thống';
    }
    
    // Nếu là cuộc trò chuyện 1-1
    if (conversation.conversation_type === 'personal' && conversation.members) {
      // Tìm thành viên khác không phải người dùng hiện tại
      const otherMember = conversation.members.find(member => member.user_id !== userId);
      
      // Nếu người dùng kia là tài khoản hệ thống (ID: 1)
      if (otherMember && otherMember.user_id === 1) {
        return 'Thông báo Hệ thống';
      }
      
      return otherMember?.username || 'Người dùng';
    }
    
    // Nếu là cuộc trò chuyện nhóm
    return `Nhóm (${conversation.members?.length || 0} thành viên)`;
  };

  // Thêm hàm tính thời gian hoạt động cuối cùng
  function getLastActiveText(lastActivity: string) {
    try {
      const date = new Date(lastActivity);
      if (isNaN(date.getTime())) return '';
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      if (diffMins < 60) {
        return `${diffMins} phút trước`;
      } else if (diffHours < 24) {
        return `${diffHours} giờ trước`;
      } else {
        return `${diffDays} ngày trước`;
      }
    } catch {
      return '';
    }
  }

  // Tự động cập nhật lại giao diện mỗi phút để hiển thị last active chính xác
  useEffect(() => {
    const interval = setInterval(() => {
      setLocalConversations(convs => [...convs]); // Trigger re-render
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="messages-sidebar">
      <div className="messages-sidebar-header" style={styles.sidebarHeader}>
        <h3>Tất cả tin nhắn</h3>
      </div>
      <div className="messages-search-bar" style={styles.searchBar}>
        <div className="search-icon" style={styles.searchIcon}>
          <i className="fas fa-search"></i>
        </div>
        <input 
          type="text" 
          placeholder="Tìm kiếm tin nhắn..."
          className="messages-search-input"
          style={styles.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              color: isDarkMode ? '#7a7a7a' : '#888888',
              fontSize: '14px'
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        )}
      </div>
      <div className="messages-sidebar-content">
        {loading ? (
          <div style={styles.loadingConversations}>Đang tải...</div>
        ) : filteredConversations.friends.length === 0 && filteredConversations.strangers.length === 0 ? (
          <div style={{
            ...styles.emptyConversations,
            padding: '20px',
            textAlign: 'center'
          }}>
            {searchTerm ? (
              <>
                <div style={{ marginBottom: '10px', color: isDarkMode ? '#888' : '#666' }}>
                  <i className="fas fa-search" style={{ fontSize: '24px', marginBottom: '10px' }}></i>
                </div>
                <p style={{ margin: 0, color: isDarkMode ? '#aaa' : '#666' }}>
                  Không tìm thấy kết quả nào cho "{searchTerm}"
                </p>
              </>
            ) : (
              <>
                <div style={styles.emptyIcon}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16Z" fill={isDarkMode ? "#aaaaaa" : "#888888"}/>
                  </svg>
                </div>
                <p style={styles.emptyText}>Không có cuộc trò chuyện nào</p>
                <p style={styles.emptyDescription}>Bắt đầu trò chuyện bằng cách nhấn vào nút nhắn tin trong hồ sơ bạn bè</p>
              </>
            )}
          </div>
        ) : (
          <div style={styles.conversationList}>
            {/* Hiển thị cuộc trò chuyện với bạn bè */}
            {filteredConversations.friends.map((conversation) => {
              // Xác định thành viên khác và màu trạng thái
              const otherMember = conversation.conversation_type === 'personal' && conversation.members
                ? conversation.members.find(member => member.user_id !== userId)
                : null;
              
              // Kiểm tra xem người dùng có phải là bạn bè không dựa trên danh sách đã tải
              const canViewStatus = otherMember ? friendIds.includes(otherMember.user_id) : false;
              const statusColor = canViewStatus && otherMember?.status === 'online' ? '#4CAF50' : '#CCCCCC';
              
              // Kiểm tra xem đây có phải là cuộc trò chuyện đang active không
              const isActive = currentConversation?.conversation_id === conversation.conversation_id;
              
              return (
                <div
                  key={conversation.conversation_id}
                  style={{
                    ...styles.conversationItem,
                    ...(isActive ? styles.conversationItemActive : {})
                  }}
                  onClick={() => handleSelectConversation(conversation)}
                  onMouseOver={e => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = isDarkMode ? '#222222' : '#f5f5f5';
                    }
                  }}
                  onMouseOut={e => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '';
                    }
                  }}
                >
                  <div style={{
                    ...styles.conversationAvatar,
                    ...(otherMember && otherMember.avatar
                      ? { backgroundImage: `url(${otherMember.avatar})` }
                      : {}),
                  }}>
                    {(!otherMember || !otherMember.avatar) &&
                      (conversation.conversation_type === 'personal' &&
                      otherMember?.user_id === 1 ? (
                        <i className="fas fa-wrench" style={{ fontSize: '18px' }}></i>
                      ) : (
                        getConversationName(conversation).charAt(0).toUpperCase()
                      ))}
                    {otherMember && canViewStatus && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '2px',
                          right: '2px',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: statusColor,
                          border: '2px solid white'
                        }} />
                    )}
                  </div>
                  <div style={styles.conversationInfo}>
                    <div style={styles.conversationHeader}>
                      <div style={{
                        ...styles.conversationName,
                        ...(isActive ? styles.conversationNameActive : {})
                      }}>
                        {getConversationName(conversation)}
                      </div>
                      <div style={styles.conversationTime}>
                        {conversation.last_message_time ? formatTime(conversation.last_message_time) : ''}
                        {(conversation.unread_count ?? 0) > 0 && (
                          <div style={styles.unreadBadge}>
                            {(conversation.unread_count ?? 0) > 99 ? '99+' : (conversation.unread_count ?? 0)}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Thêm trạng thái online/offline và last active */}
                    {otherMember && canViewStatus && otherMember.status !== 'online' && (otherMember as any).last_activity && (
                      <div style={{ fontSize: '12px', color: '#888', margin: '2px 0 0 0' }}>
                        Ngoại tuyến · {getLastActiveText((otherMember as any).last_activity)}
                      </div>
                    )}
                    <div style={{
                      ...styles.conversationLastMessage,
                      ...(isActive ? styles.conversationLastMessageActive : {})
                    }}>
                      {conversation.last_message_content || 'Bắt đầu cuộc trò chuyện...'}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Dropdown tin nhắn từ người lạ */}
            {filteredConversations.strangers.length > 0 && (
              <>
                <div 
                  style={styles.strangerMessagesHeader}
                  onClick={() => setShowStrangerMessages(!showStrangerMessages)}
                >
                  <div style={styles.strangerMessagesTitle}>
                    Tin nhắn từ người lạ ({filteredConversations.strangers.length})
                  </div>
                  <div style={styles.strangerMessagesBadge}>
                    <div style={styles.strangerCountDot} title="Số người lạ">
                      {filteredConversations.strangers.length}
                    </div>
                    {hasNewStrangerMessage && !showStrangerMessages && (
                      <div style={styles.newMessageDot} title="Tin nhắn mới">
                        {filteredConversations.strangers.reduce((count, conv) => count + (conv.unread_count || 0), 0)}
                      </div>
                    )}
                    <i 
                      className={`fas fa-chevron-${showStrangerMessages ? 'up' : 'down'}`} 
                      style={{
                        ...styles.strangerMessagesArrow,
                        transform: 'none'
                      }}
                    />
                  </div>
                </div>
                <div style={{
                  ...styles.strangerMessagesContent,
                  ...(showStrangerMessages ? styles.strangerMessagesContentVisible : {})
                }}>
                  {filteredConversations.strangers.map((conversation) => {
                    // Xác định thành viên khác và màu trạng thái
                    const otherMember = conversation.conversation_type === 'personal' && conversation.members
                      ? conversation.members.find(member => member.user_id !== userId)
                      : null;
                    
                    // Kiểm tra xem người dùng có phải là bạn bè không dựa trên danh sách đã tải
                    const canViewStatus = otherMember ? friendIds.includes(otherMember.user_id) : false;
                    const statusColor = canViewStatus && otherMember?.status === 'online' ? '#4CAF50' : '#CCCCCC';
                    
                    // Kiểm tra xem đây có phải là cuộc trò chuyện đang active không
                    const isActive = currentConversation?.conversation_id === conversation.conversation_id;
                    
                    return (
                      <div
                        key={conversation.conversation_id}
                        style={{
                          ...styles.strangerConversationItem,
                          ...(isActive ? styles.conversationItemActive : {})
                        }}
                        onClick={() => handleSelectConversation(conversation)}
                        onMouseOver={e => {
                          if (currentConversation?.conversation_id !== conversation.conversation_id) {
                            e.currentTarget.style.backgroundColor = isDarkMode 
                              ? 'rgba(255, 255, 255, 0.05)' 
                              : 'rgba(0, 0, 0, 0.03)';
                          }
                        }}
                        onMouseOut={e => {
                          if (currentConversation?.conversation_id !== conversation.conversation_id) {
                            e.currentTarget.style.backgroundColor = isDarkMode 
                              ? 'rgba(255, 255, 255, 0.03)' 
                              : 'rgba(0, 0, 0, 0.02)';
                          }
                        }}
                      >
                        <div style={{
                          ...styles.conversationAvatar,
                          ...(otherMember && otherMember.avatar
                            ? { backgroundImage: `url(${otherMember.avatar})` }
                            : {}),
                        }}>
                          {(!otherMember || !otherMember.avatar) &&
                            (conversation.conversation_type === 'personal' &&
                            otherMember?.user_id === 1 ? (
                              <i className="fas fa-wrench" style={{ fontSize: '18px' }}></i>
                            ) : (
                              getConversationName(conversation).charAt(0).toUpperCase()
                            ))}
                          {otherMember && canViewStatus && (
                            <span
                              style={{
                                position: 'absolute',
                                bottom: '2px',
                                right: '2px',
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                backgroundColor: statusColor,
                                border: '2px solid white'
                              }} />
                          )}
                        </div>
                        <div style={styles.conversationInfo}>
                          <div style={styles.conversationHeader}>
                            <div style={{
                              ...styles.conversationName,
                              ...(isActive ? styles.conversationNameActive : {})
                            }}>
                              {getConversationName(conversation)}
                            </div>
                            <div style={styles.conversationTime}>
                              {conversation.last_message_time ? formatTime(conversation.last_message_time) : ''}
                              {(conversation.unread_count ?? 0) > 0 && (
                                <div style={styles.unreadBadge}>
                                  {(conversation.unread_count ?? 0) > 99 ? '99+' : (conversation.unread_count ?? 0)}
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Thêm trạng thái online/offline và last active */}
                          {otherMember && canViewStatus && otherMember.status !== 'online' && (otherMember as any).last_activity && (
                            <div style={{ fontSize: '12px', color: '#888', margin: '2px 0 0 0' }}>
                              Ngoại tuyến · {getLastActiveText((otherMember as any).last_activity)}
                            </div>
                          )}
                          <div style={{
                            ...styles.conversationLastMessage,
                            ...(isActive ? styles.conversationLastMessageActive : {})
                          }}>
                            {conversation.last_message_content || 'Bắt đầu cuộc trò chuyện...'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(MessagesSidebar); 