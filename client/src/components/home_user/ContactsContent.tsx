import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import type { User, FriendRequest } from '../../services/api';
import UserProfileModal from './UserProfileModal';
import SortDropdown from '../common/SortDropdown';
import type { SortOption } from '../common/SortDropdown';
import socketService from '../../services/socketService';
import SuccessToast from '../common/SuccessToast';

interface ContactsContentProps {
  activeTab?: 'friends' | 'requests' | 'explore' | 'blocked';
  onFriendRequestUpdate?: () => void; // Callback khi có thay đổi về lời mời kết bạn
  userId?: number; // ID của người dùng hiện tại
  onConversationStarted?: (conversation: any) => void; // Callback khi có thay đổi về cuộc trò chuyện
  setCurrentConversation?: (conversation: any) => void; // Thêm prop mới
}

interface BlockedUser {
  block_id: number;
  blocked_id: number;
  blocker_id: number;
  reason: string;
  block_type: string;
  blocked_at: string;
  user: User;
}

const ContactsContent: React.FC<ContactsContentProps> = ({ activeTab = 'friends', onFriendRequestUpdate, userId, onConversationStarted, setCurrentConversation }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(undefined);
  const [showUserProfileModal, setShowUserProfileModal] = useState<boolean>(false);
  const [friendsList, setFriendsList] = useState<User[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [sentFriendRequests, setSentFriendRequests] = useState<FriendRequest[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [processingRequest, setProcessingRequest] = useState<{ [key: number]: boolean }>({});
  
  // Thêm state để lưu trữ trạng thái kết bạn của các người dùng trong kết quả tìm kiếm
  const [friendshipStatuses, setFriendshipStatuses] = useState<{ [key: number]: string }>({});
  
  // Thêm state để lưu trữ trạng thái khóa của người dùng
  const [lockedUsers, setLockedUsers] = useState<{ [key: number]: boolean }>({});
  
  // Thêm state cho việc sắp xếp
  const [sortOptions] = useState<SortOption[]>([
    { id: 'name-asc', label: 'Tên (A-Z)' },
    { id: 'name-desc', label: 'Tên (Z-A)' },
    { id: 'newest', label: 'Mới nhất' },
    { id: 'oldest', label: 'Cũ nhất' }
  ]);
  const [selectedSortOption, setSelectedSortOption] = useState<SortOption>(sortOptions[0]);
  
  // Thêm state cho tìm kiếm bạn bè
  const [friendSearchTerm, setFriendSearchTerm] = useState<string>('');
  const [filteredFriends, setFilteredFriends] = useState<User[]>([]);
  
  // Thêm state cho modal xác nhận bỏ chặn và xử lý bỏ chặn
  const [showUnblockModal, setShowUnblockModal] = useState<boolean>(false);
  const [selectedBlockInfo, setSelectedBlockInfo] = useState<BlockedUser | null>(null);
  const [unblockingUser, setUnblockingUser] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  // Thêm state cho việc điều khiển trạng thái mở/đóng của dropdown
  const [receivedDropdownOpen, setReceivedDropdownOpen] = useState<boolean>(false);
  const [sentDropdownOpen, setSentDropdownOpen] = useState<boolean>(false);
  
  // Các style chung cho các thành phần
  const itemContainerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    padding: '5px',
    borderRadius: '10px',
    border: '1px solid #e0e0e0'
  };

  const userInfoStyle = {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    padding: '10px',
    borderRadius: '8px',
    transition: 'background-color 0.2s'
  };

  const actionsStyle = {
    display: 'flex',
    gap: '8px'
  };

  useEffect(() => {
    // Lấy thông tin người dùng hiện tại từ localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        console.log("Thông tin người dùng hiện tại từ localStorage:", parsedUser);
        setCurrentUser(parsedUser);
      } catch (error) {
        console.error('Lỗi khi parse thông tin người dùng:', error);
      }
    } else {
      console.log("Không tìm thấy thông tin người dùng trong localStorage");
    }
  }, []);

  // Lấy danh sách bạn bè và lời mời kết bạn khi tab thay đổi hoặc người dùng hiện tại thay đổi
  useEffect(() => {
    if (!currentUser) return;

    const fetchFriendsData = async () => {
      if (activeTab === 'friends') {
        try {
          let friends;
          
          // Trước tiên kiểm tra cache trong localStorage
          const cachedFriends = localStorage.getItem('cachedFriends');
          if (cachedFriends) {
            // Sử dụng cache nếu có
            friends = JSON.parse(cachedFriends);
            console.log('Sử dụng danh sách bạn bè từ cache:', friends);
            setFriendsList(friends);
            
            // Đồng thời gọi API để cập nhật dữ liệu mới nhất
            const freshFriends = await api.refreshFriendStatus(currentUser.user_id!);
            if (freshFriends && freshFriends.length > 0) {
              console.log('Cập nhật danh sách bạn bè từ server:', freshFriends);
              setFriendsList(freshFriends);
              
              // Kiểm tra trạng thái khóa của từng người dùng trong danh sách bạn bè
              const lockedStatusMap: { [key: number]: boolean } = {};
              for (const friend of freshFriends) {
                if (friend.user_id) {
                  try {
                    const lockStatus = await api.checkAccountLockStatus(friend.user_id);
                    console.log(`Thông tin khóa của ${friend.username}:`, {
                      userId: friend.user_id,
                      isLocked: lockStatus.isLocked,
                      lock_status: friend.lock_status
                    });
                    lockedStatusMap[friend.user_id] = friend.lock_status === 'locked';
                  } catch (err) {
                    console.error(`Lỗi khi kiểm tra trạng thái khóa của người dùng ${friend.username}:`, err);
                  }
                }
              }
              setLockedUsers(lockedStatusMap);
            }
          } else {
            // Không có cache, gọi API trực tiếp
            friends = await api.getFriends(currentUser.user_id!);
            console.log('Lấy danh sách bạn bè trực tiếp từ API:', friends);
            setFriendsList(friends);
            
            // Kiểm tra trạng thái khóa của từng người dùng trong danh sách bạn bè
            const lockedStatusMap: { [key: number]: boolean } = {};
            for (const friend of friends) {
              if (friend.user_id) {
                try {
                  const lockStatus = await api.checkAccountLockStatus(friend.user_id);
                  console.log(`Thông tin khóa của ${friend.username}:`, {
                    userId: friend.user_id,
                    isLocked: lockStatus.isLocked,
                    lock_status: friend.lock_status
                  });
                  lockedStatusMap[friend.user_id] = friend.lock_status === 'locked';
                } catch (err) {
                  console.error(`Lỗi khi kiểm tra trạng thái khóa của người dùng ${friend.username}:`, err);
                }
              }
            }
            setLockedUsers(lockedStatusMap);
          }
        } catch (error) {
          console.error('Lỗi khi lấy danh sách bạn bè:', error);
        }
      } else if (activeTab === 'requests') {
        try {
          const requests = await api.getReceivedFriendRequests(currentUser.user_id!);
          console.log('Danh sách lời mời kết bạn:', requests);
          setFriendRequests(requests);
          
          // Kiểm tra trạng thái khóa của người gửi lời mời kết bạn
          const lockedStatusMap: { [key: number]: boolean } = {};
          for (const request of requests) {
            if (request.user.user_id) {
              try {
                const lockStatus = await api.checkAccountLockStatus(request.user.user_id);
                console.log(`Thông tin khóa của ${request.user.username}:`, {
                  userId: request.user.user_id,
                  isLocked: lockStatus.isLocked,
                  lock_status: request.user.lock_status
                });
                lockedStatusMap[request.user.user_id] = request.user.lock_status === 'locked';
              } catch (err) {
                console.error(`Lỗi khi kiểm tra trạng thái khóa của người dùng ${request.user.username}:`, err);
              }
            }
          }
          setLockedUsers(prevState => ({...prevState, ...lockedStatusMap}));
        } catch (error) {
          console.error('Lỗi khi lấy danh sách lời mời kết bạn:', error);
        }
      } else if (activeTab === 'blocked') {
        // Lấy danh sách người dùng đã chặn
        fetchBlockedUsers();
      }
    };

    fetchFriendsData();
  }, [activeTab, currentUser, onFriendRequestUpdate]);

  // Lắng nghe sự kiện lời mời kết bạn mới và cập nhật theo thời gian thực
  useEffect(() => {
    // Hàm xử lý khi nhận được lời mời kết bạn mới
    const handleNewFriendRequest = (data: any) => {
      console.log('Nhận lời mời kết bạn mới trong ContactsContent:', data);
      if (data && data.sender) {
        // Kiểm tra xem lời mời này đã tồn tại trong danh sách chưa
        const existingRequest = friendRequests.find(
          req => req.friendship_id === data.friendship_id
        );
        
        if (!existingRequest) {
          // Thêm lời mời mới vào đầu danh sách hiện tại
          setFriendRequests(prevRequests => [{
            friendship_id: data.friendship_id,
            user: data.sender,
            status: 'pending',
            created_at: new Date().toISOString()
          }, ...prevRequests]);
          
          // Gọi callback cập nhật nếu có
          if (onFriendRequestUpdate) {
            onFriendRequestUpdate();
          }
        }
      }
    };

    // Hàm xử lý khi số lượng lời mời kết bạn được cập nhật
    const handleFriendRequestCountUpdate = (data: any) => {
      console.log('Cập nhật số lượng lời mời kết bạn trong ContactsContent:', data);
      // Nếu số lượng lời mời khác với số lượng hiện tại, cập nhật lại danh sách
      if (typeof data.count === 'number' && data.count !== friendRequests.length) {
        fetchFriendRequests();
      }
    };

    // Đăng ký các sự kiện socket
    socketService.on('friend_request', handleNewFriendRequest);
    socketService.on('friend_request_count_update', handleFriendRequestCountUpdate);

    // Cập nhật trạng thái hoạt động người dùng theo thời gian thực
    const handleUserStatusUpdate = (data: any) => {
      const { user_id, status, last_activity } = data;
      // Cập nhật trạng thái trong danh sách bạn bè
      setFriendsList(prev => prev.map(u => u.user_id === user_id ? { ...u, status, last_activity } : u));
      // Cập nhật trạng thái trong kết quả tìm kiếm nếu có
      setSearchResults(prev => prev.map(u => u.user_id === user_id ? { ...u, status, last_activity } : u));
    };
    socketService.on('user_status_update', handleUserStatusUpdate);

    // Hủy đăng ký khi component unmount
    return () => {
      socketService.off('friend_request', handleNewFriendRequest);
      socketService.off('friend_request_count_update', handleFriendRequestCountUpdate);
      socketService.off('user_status_update', handleUserStatusUpdate);
    };
  }, [userId, friendRequests, onFriendRequestUpdate]);

  // Xử lý tìm kiếm khi người dùng nhập
  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    
    if (term.length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    
    console.log("Đang tìm kiếm với từ khóa:", term);
    
    setLoading(true);
    try {
      const results = await api.searchUsers(term);
      console.log("Kết quả tìm kiếm:", results);
      setSearchResults(results);
      setHasSearched(true);
      
      // Kiểm tra trạng thái kết bạn và khóa của mỗi người dùng trong kết quả tìm kiếm
      if (currentUser && currentUser.user_id) {
        const statuses: { [key: number]: string } = {};
        const lockedStatusMap: { [key: number]: boolean } = {};
        
        for (const user of results) {
          if (user.user_id && user.user_id !== currentUser.user_id) {
            try {
              // Kiểm tra trạng thái kết bạn
              const status = await api.checkFriendshipStatus(currentUser.user_id, user.user_id);
              console.log(`Trạng thái kết bạn với ${user.username}:`, status);
              if (status && status.status) {
                statuses[user.user_id] = status.status;
              }
              
              // Kiểm tra trạng thái khóa tài khoản
              const lockStatus = await api.checkAccountLockStatus(user.user_id);
              console.log(`Thông tin khóa của ${user.username}:`, {
                userId: user.user_id,
                isLocked: lockStatus.isLocked,
                lock_status: user.lock_status
              });
              lockedStatusMap[user.user_id] = user.lock_status === 'locked';
              console.log(`Trạng thái khóa của ${user.username}:`, user.lock_status === 'locked');
            } catch (err) {
              console.error(`Lỗi khi kiểm tra trạng thái người dùng ${user.username}:`, err);
            }
          }
        }
        
        setFriendshipStatuses(statuses);
        setLockedUsers(prevState => ({...prevState, ...lockedStatusMap}));
      }
    } catch (error) {
      console.error('Lỗi khi tìm kiếm người dùng:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Thêm chức năng tìm kiếm tự động khi người dùng ngừng gõ
  useEffect(() => {
    if (activeTab === 'explore' && searchTerm.length >= 2) {
      const delaySearch = setTimeout(() => {
        handleSearch(searchTerm);
      }, 500); // Đợi 500ms sau khi người dùng ngừng gõ
      
      return () => clearTimeout(delaySearch);
    }
  }, [searchTerm, activeTab]);

  // Xử lý khi thay đổi tùy chọn sắp xếp
  const handleSortChange = (option: SortOption) => {
    setSelectedSortOption(option);
    // Sắp xếp danh sách bạn bè theo tùy chọn đã chọn
    const sortedFriends = [...friendsList].sort((a, b) => {
      switch (option.id) {
        case 'name-asc':
          return a.username.localeCompare(b.username);
        case 'name-desc':
          return b.username.localeCompare(a.username);
        case 'newest':
          return new Date(b.join_date || 0).getTime() - new Date(a.join_date || 0).getTime();
        case 'oldest':
          return new Date(a.join_date || 0).getTime() - new Date(b.join_date || 0).getTime();
        default:
          return 0;
      }
    });
    setFriendsList(sortedFriends);
  };

  // Xử lý khi người dùng nhấn phím Enter
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(searchTerm);
    }
  };

  // Kiểm tra xem user có phải là người dùng hiện tại không
  const isCurrentUser = (user: User) => {
    if (!currentUser || !user) return false;
    
    // Kiểm tra xác thực bằng email (cách chính xác nhất)
    if (user.email && currentUser.email && user.email === currentUser.email) {
      console.log("Trùng khớp theo email!");
      return true;
    }
    
    // Kiểm tra bằng username nếu email không có hoặc không khớp
    if (user.username && currentUser.username && user.username === currentUser.username) {
      console.log("Trùng khớp theo username!");
      return true;
    }
    
    // Kiểm tra bằng ID nếu có
    if (user.user_id && currentUser.user_id && user.user_id === currentUser.user_id) {
      console.log("Trùng khớp theo user_id!");
      return true;
    }
    
    console.log("Không trùng khớp!");
    // Nếu tất cả đều không khớp
    return false;
  };

  // Xử lý khi click vào user để mở modal
  const handleUserClick = (user: User, friendshipId?: number, fromFriendRequest = false) => {
    setSelectedUserId(user.user_id);
    // Thêm vào state thông tin về lời mời kết bạn nếu có
    if (fromFriendRequest && friendshipId) {
      // Lưu lại thông tin về lời mời kết bạn vào localStorage để sử dụng trong UserProfileModal
      localStorage.setItem('currentFriendRequest', JSON.stringify({
        friendshipId,
        fromFriendRequest: true
      }));
    } else {
      // Nếu không phải mở từ lời mời kết bạn, xóa dữ liệu này nếu có
      localStorage.removeItem('currentFriendRequest');
    }
    setShowUserProfileModal(true);
  };

  // Đóng modal
  const handleCloseUserProfileModal = () => {
    setShowUserProfileModal(false);
    setSelectedUserId(undefined);
  };

  // Xử lý khi chấp nhận lời mời kết bạn
  const handleAcceptFriendRequest = async (friendshipId: number) => {
    if (!currentUser) return;
    
    setProcessingRequest({...processingRequest, [friendshipId]: true});
    try {
      const result = await api.acceptFriendRequest(friendshipId);
      
      if (result.success) {
        console.log('Đã chấp nhận lời mời kết bạn');
        
        // Cập nhật danh sách lời mời kết bạn
        setFriendRequests(requests => requests.filter(request => request.friendship_id !== friendshipId));
        
        // Gọi callback nếu có
        if (onFriendRequestUpdate) {
          onFriendRequestUpdate();
        }
      }
    } catch (error) {
      console.error('Lỗi khi chấp nhận lời mời kết bạn:', error);
    } finally {
      // Xóa trạng thái xử lý
      setProcessingRequest(prev => {
        const newState = {...prev};
        delete newState[friendshipId];
        return newState;
      });
    }
  };

  // Xử lý khi từ chối lời mời kết bạn
  const handleRejectFriendRequest = async (friendshipId: number) => {
    if (!currentUser) return;
    
    setProcessingRequest({...processingRequest, [friendshipId]: true});
    try {
      const result = await api.rejectFriendRequest(friendshipId);
      
      if (result.success) {
        console.log('Đã từ chối lời mời kết bạn');
        
        // Cập nhật danh sách lời mời kết bạn
        setFriendRequests(requests => requests.filter(request => request.friendship_id !== friendshipId));
        
        // Gọi callback nếu có
        if (onFriendRequestUpdate) {
          onFriendRequestUpdate();
        }
      }
    } catch (error) {
      console.error('Lỗi khi từ chối lời mời kết bạn:', error);
    } finally {
      // Xóa trạng thái xử lý
      setProcessingRequest(prev => {
        const newState = {...prev};
        delete newState[friendshipId];
        return newState;
      });
    }
  };

  // Xử lý sau khi cập nhật từ ProfileModal
  const handleProfileModalUpdate = () => {
    console.log('ProfileModal đã được cập nhật, làm mới dữ liệu...');
    // Gọi callback để cập nhật danh sách bạn bè và lời mời kết bạn
    if (onFriendRequestUpdate) {
      onFriendRequestUpdate();
    }
  };

  // Format thời gian lời mời kết bạn
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
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
    } catch (error) {
      console.error('Lỗi khi format thời gian:', error);
      return 'N/A';
    }
  };

  // Kiểm tra trạng thái online của người dùng
  const isOnline = (status?: string) => {
    if (!status) return false;
    return status.toLowerCase() === 'online';
  };

  // Kiểm tra quyền xem trạng thái online/offline
  const canViewStatus = (userId: number | undefined) => {
    // Nếu không có userId thì không thể xem
    if (!userId || !currentUser?.user_id) return false;
    
    // Luôn cho phép xem trạng thái của chính mình
    if (userId === currentUser.user_id) return true;
    
    // Kiểm tra xem người dùng có phải là bạn bè không
    const isFriend = friendsList.some(friend => friend.user_id === userId);
    return isFriend;
  };

  // Lấy lớp CSS cho chỉ báo trạng thái
  const getStatusIndicatorClass = (userId: number | undefined, status?: string) => {
    if (!userId || !canViewStatus(userId)) {
      return 'status-unknown';
    }
    return isOnline(status) ? 'status-online' : 'status-offline';
  };

  // Kiểm tra trạng thái kết bạn của một người dùng
  const checkFriendshipStatus = (userId?: number) => {
    if (!userId || !currentUser) return null;
    
    // Kiểm tra xem người dùng có trong danh sách bạn bè không
    const isFriend = friendsList.some(friend => friend.user_id === userId);
    if (isFriend) return 'accepted';
    
    // Kiểm tra từ state các trạng thái kết bạn đã lưu
    return friendshipStatuses[userId] || null;
  };
  
  // Kiểm tra xem người dùng có bị khóa không
  const isUserLocked = (userId?: number) => {
    if (!userId) return false;
    return !!lockedUsers[userId];
  };
  
  // Hiển thị avatar theo trạng thái khóa
  const renderAvatar = (user: User) => {
    if (isUserLocked(user.user_id)) {
      return (
        <div className="contact-avatar banned-avatar">
          BAN
          <div className={`status-indicator ${getStatusIndicatorClass(user.user_id, user.status)}`}></div>
        </div>
      );
    }
    
    return (
      <div className="contact-avatar" style={user.avatar ? {
        backgroundImage: `url(${user.avatar})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: 'transparent'
      } : {}}>
        {!user.avatar && (user.username ? user.username.charAt(0).toUpperCase() : 'U')}
        <div className={`status-indicator ${getStatusIndicatorClass(user.user_id, user.status)}`}></div>
      </div>
    );
  };

  // Thêm hàm lọc danh sách bạn bè
  const filterFriends = (term: string) => {
    if (!term.trim()) {
      setFilteredFriends(friendsList);
      return;
    }
    
    const filtered = friendsList.filter(friend => 
      friend.username.toLowerCase().includes(term.toLowerCase())
    );
    setFilteredFriends(filtered);
  };

  // Cập nhật useEffect để khởi tạo filteredFriends
  useEffect(() => {
    setFilteredFriends(friendsList);
  }, [friendsList]);

  // Xử lý tìm kiếm bạn bè
  const handleFriendSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setFriendSearchTerm(term);
    filterFriends(term);
  };

  // Render danh sách bạn bè
  const renderFriendsList = () => {
    const friendsToRender = filteredFriends;
    
    if (friendsList.length === 0) {
      return (
        <div className="contacts-empty">
          <div className="contacts-empty-icon"></div>
          <h3>Không có bạn bè nào</h3>
          <p>Danh sách bạn bè của bạn đang trống</p>
        </div>
      );
    }
    
    // Thêm header với thanh tìm kiếm và dropdown phân loại
    const renderFriendsHeader = () => (
      <div className="contacts-header">
        <div className="friends-count">
          <span style={{ color: '#000', fontWeight: 600 }}>{friendsToRender.length} bạn bè</span>
        </div>
        <div className="search-container" style={{ flex: 1, margin: '0 15px' }}>
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Tìm kiếm bạn bè..."
              value={friendSearchTerm}
              onChange={handleFriendSearch}
              className="search-input"
            />
            <button 
              className="search-button" 
              onClick={() => filterFriends(friendSearchTerm)}
              aria-label="Tìm kiếm"
            >
              <i className="fas fa-search"></i>
            </button>
          </div>
        </div>
        <div className="sort-dropdown-container">
          <SortDropdown 
            options={sortOptions}
            selectedOption={selectedSortOption}
            onSelect={handleSortChange}
          />
        </div>
      </div>
    );

    // Sắp xếp theo mới nhất/cũ nhất (không hiển thị nhóm A-Z)
    if (selectedSortOption.id === 'newest' || selectedSortOption.id === 'oldest') {
      return (
        <div className="friends-list-container">
          {renderFriendsHeader()}
          <div className="friends-container">
            {friendsToRender.map((friend) => (
              <div key={friend.user_id} className="contact-item" onClick={() => handleUserClick(friend)}>
                {renderAvatar(friend)}
                <div className="contact-info">
                  <div className="contact-name">{friend.username}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Sắp xếp theo tên A-Z hoặc Z-A (hiển thị nhóm A-Z)
    const groupedFriends: { [key: string]: User[] } = {};
    
    // Nhóm bạn bè theo chữ cái đầu tiên của tên
    friendsToRender.forEach((friend) => {
      if (!friend.username) return;
      
      const firstChar = friend.username.charAt(0).toUpperCase();
      if (!groupedFriends[firstChar]) {
        groupedFriends[firstChar] = [];
      }
      groupedFriends[firstChar].push(friend);
    });

    // Lấy danh sách chữ cái đã sắp xếp
    const sortedLetters = Object.keys(groupedFriends).sort();
    
    return (
      <div className="friends-list-container">
        {renderFriendsHeader()}
        <div className="friends-container-with-groups">
          {sortedLetters.map((letter) => (
            <div key={letter} className="friends-group">
              <div className="friends-group-header">
                <span className="friends-group-letter">{letter}</span>
              </div>
              {groupedFriends[letter].map((friend) => (
                <div key={friend.user_id} className="contact-item" onClick={() => handleUserClick(friend)}>
                  {renderAvatar(friend)}
                  <div className="contact-info">
                    <div className="contact-name">{friend.username}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render danh sách lời mời kết bạn
  const renderFriendRequests = () => {
    const receivedEmpty = friendRequests.length === 0;
    const sentEmpty = sentFriendRequests.length === 0;
    
    if (receivedEmpty && sentEmpty) {
      return (
        <div className="contacts-empty">
          <div className="contacts-empty-icon friend-request-icon"></div>
          <h3>Không có lời mời kết bạn</h3>
          <p>Bạn không có lời mời kết bạn nào</p>
        </div>
      );
    }

    const friendRequestItemStyle = {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '15px',
      padding: '5px',
      borderRadius: '10px',
      border: '1px solid #e0e0e0'
    };

    const userInfoStyle = {
      display: 'flex',
      alignItems: 'center',
      cursor: 'pointer',
      padding: '10px',
      borderRadius: '8px',
      transition: 'background-color 0.2s'
    };

    const sectionStyle = {
      marginBottom: '30px'
    };

    const sectionTitleStyle = {
      fontSize: '18px',
      fontWeight: 600,
      marginBottom: '15px',
      paddingBottom: '8px',
      borderBottom: '1px solid #e0e0e0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'pointer'
    };

    const dropdownIconStyle = {
      transition: 'transform 0.3s ease'
    };

    return (
      <div className="friend-requests-container">
        {/* Lời mời kết bạn nhận được */}
        <div style={sectionStyle}>
          <h3 
            style={sectionTitleStyle} 
            onClick={() => setReceivedDropdownOpen(!receivedDropdownOpen)}
          >
            <span>Lời mời kết bạn nhận được {!receivedEmpty && `(${friendRequests.length})`}</span>
            <i 
              className={`fas fa-chevron-${receivedDropdownOpen ? 'up' : 'down'}`} 
              style={{
                ...dropdownIconStyle,
                transform: receivedDropdownOpen ? 'rotate(0deg)' : 'rotate(-90deg)'
              }}
            ></i>
          </h3>
          
          {receivedDropdownOpen && (
            receivedEmpty ? (
              <div className="empty-section-message" style={{ padding: '15px 0', color: '#666' }}>
                Bạn không có lời mời kết bạn nào
              </div>
            ) : (
              <div className="friend-requests-list">
                {friendRequests.map((request) => (
                  <div key={request.friendship_id} className="friend-request-item" style={friendRequestItemStyle}>
                    <div 
                      className="user-info" 
                      style={userInfoStyle}
                      onClick={() => handleUserClick(request.user, request.friendship_id, true)}
                    >
                      <div 
                        className="user-avatar" 
                        style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '50%',
                          marginRight: '15px',
                          backgroundColor: '#e3f2fd',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                          color: '#0066ff',
                          fontWeight: 'bold',
                          ...(request.user.avatar ? {
                            backgroundImage: `url(${request.user.avatar})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            color: 'transparent'
                          } : {})
                        }}
                      >
                        {!request.user.avatar && request.user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{request.user.username}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {formatTime(request.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="friend-request-actions">
                      <button 
                        className="accept-request-btn"
                        onClick={() => handleAcceptFriendRequest(request.friendship_id)}
                        disabled={!!processingRequest[request.friendship_id] || isUserLocked(request.user.user_id)}
                      >
                        {processingRequest[request.friendship_id] ? 'Đang xử lý...' : 'Chấp nhận'}
                      </button>
                      <button 
                        className="reject-request-btn"
                        onClick={() => handleRejectFriendRequest(request.friendship_id)}
                        disabled={!!processingRequest[request.friendship_id]}
                      >
                        {processingRequest[request.friendship_id] ? 'Đang xử lý...' : 'Từ chối'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Lời mời kết bạn đã gửi */}
        <div style={sectionStyle}>
          <h3 
            style={sectionTitleStyle} 
            onClick={() => setSentDropdownOpen(!sentDropdownOpen)}
          >
            <span>Lời mời kết bạn đã gửi {!sentEmpty && `(${sentFriendRequests.length})`}</span>
            <i 
              className={`fas fa-chevron-${sentDropdownOpen ? 'up' : 'down'}`} 
              style={{
                ...dropdownIconStyle,
                transform: sentDropdownOpen ? 'rotate(0deg)' : 'rotate(-90deg)'
              }}
            ></i>
          </h3>
          
          {sentDropdownOpen && (
            sentEmpty ? (
              <div className="empty-section-message" style={{ padding: '15px 0', color: '#666' }}>
                Bạn chưa gửi lời mời kết bạn nào
              </div>
            ) : (
              <div className="friend-requests-list">
                {sentFriendRequests.map((request) => (
                  <div key={request.friendship_id} className="friend-request-item" style={friendRequestItemStyle}>
                    <div 
                      className="user-info" 
                      style={userInfoStyle}
                      onClick={() => handleUserClick(request.user, request.friendship_id, false)}
                    >
                      <div 
                        className="user-avatar" 
                        style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '50%',
                          marginRight: '15px',
                          backgroundColor: '#e3f2fd',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                          color: '#0066ff',
                          fontWeight: 'bold',
                          ...(request.user.avatar ? {
                            backgroundImage: `url(${request.user.avatar})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            color: 'transparent'
                          } : {})
                        }}
                      >
                        {!request.user.avatar && request.user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{request.user.username}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {formatTime(request.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="friend-request-actions">
                      <button 
                        className="cancel-request-btn"
                        onClick={() => handleRejectFriendRequest(request.friendship_id)}
                        disabled={!!processingRequest[request.friendship_id]}
                        style={{
                          backgroundColor: '#f0f0f0',
                          color: '#333',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 500,
                          transition: 'all 0.2s'
                        }}
                      >
                        {processingRequest[request.friendship_id] ? 'Đang xử lý...' : 'Hủy lời mời'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        <style>
          {`
            .friend-requests-container {
              padding: 10px;
            }
            
            .section-title {
              font-size: 18px;
              font-weight: 600;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: space-between;
              transition: all 0.3s ease;
            }
            
            .section-title:hover {
              color: #0066ff;
            }
            
            .dropdown-icon {
              transition: transform 0.3s ease;
            }
            
            .friend-requests-list {
              animation: fadeIn 0.3s ease;
              overflow: hidden;
            }
            
            @keyframes fadeIn {
              from {
                opacity: 0;
                transform: translateY(-10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}
        </style>
      </div>
    );
  };

  // Hàm lấy danh sách lời mời kết bạn
  const fetchFriendRequests = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const requests = await api.getReceivedFriendRequests(userId);
      setFriendRequests(requests || []);
      
      // Gọi callback nếu có
      if (onFriendRequestUpdate) {
        onFriendRequestUpdate();
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách lời mời kết bạn:', error);
    } finally {
      setLoading(false);
    }
  };

  // Hàm lấy danh sách lời mời kết bạn đã gửi
  const fetchSentFriendRequests = async () => {
    if (!userId) return;
    
    try {
      const sentRequests = await api.getSentFriendRequests(userId);
      setSentFriendRequests(sentRequests || []);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách lời mời kết bạn đã gửi:', error);
    }
  };
  
  useEffect(() => {
    if (activeTab === 'requests' && userId) {
      fetchFriendRequests();
      fetchSentFriendRequests();
    }
  }, [activeTab, userId]);

  // Hàm lấy danh sách người dùng đã chặn
  const fetchBlockedUsers = async () => {
    try {
      if (!currentUser?.user_id) return;
      
      setLoading(true);
      const blockedList = await api.getBlockedUsers(currentUser.user_id);
      console.log('Danh sách người dùng bị chặn:', blockedList);
      setBlockedUsers(blockedList);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách người bị chặn:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Xử lý khi nhấp vào nút bỏ chặn
  const handleUnblockClick = (blockInfo: BlockedUser) => {
    setSelectedBlockInfo(blockInfo);
    setShowUnblockModal(true);
  };
  
  // Xử lý bỏ chặn người dùng
  const handleUnblockUser = async () => {
    if (!currentUser?.user_id || !selectedBlockInfo) return;
    
    setUnblockingUser(true);
    
    try {
      const result = await api.unblockUser(selectedBlockInfo.blocker_id, selectedBlockInfo.blocked_id);
      if (result.success) {
        console.log('Đã bỏ chặn người dùng thành công');
        
        // Hiển thị thông báo thành công
        setSuccessMessage(`Đã bỏ chặn ${selectedBlockInfo.user.username} thành công`);
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
        
        // Đóng modal và cập nhật lại danh sách người bị chặn
        setShowUnblockModal(false);
        fetchBlockedUsers();
      } else {
        console.error('Lỗi khi bỏ chặn người dùng:', result.message);
      }
    } catch (error) {
      console.error('Lỗi khi bỏ chặn người dùng:', error);
    } finally {
      setUnblockingUser(false);
    }
  };
  
  // Xử lý hủy bỏ chặn
  const handleCancelUnblock = () => {
    setShowUnblockModal(false);
    setSelectedBlockInfo(null);
  };

  // Thêm hàm render danh sách người dùng đã chặn
  const renderBlockedUsers = () => {
    if (loading) {
      return (
        <div className="contacts-loading">
          <div className="spinner"></div>
          <p>Đang tải danh sách người dùng bị chặn...</p>
        </div>
      );
    }
    
    if (blockedUsers.length === 0) {
      return (
        <div className="contacts-empty">
          <div className="contacts-empty-icon blocked-icon"></div>
          <h3 style={{ color: '#e53935', fontSize: '20px', fontWeight: '600', marginTop: '20px' }}>Danh sách chặn trống</h3>
          <p style={{ color: '#757575', fontSize: '15px', maxWidth: '270px', lineHeight: '1.5' }}>Bạn chưa chặn người dùng nào.</p>
        </div>
      );
    }
    
    return (
      <div className="friend-requests-container blocked-users-container">
        <h3 className="section-header">Danh sách người dùng bị chặn ({blockedUsers.length})</h3>
        
        {blockedUsers.map((blockedItem) => {
          const user = blockedItem.user;
          return (
            <div key={blockedItem.block_id} className="friend-request-item" style={itemContainerStyle}>
              <div 
                className="user-info-container"
                style={userInfoStyle}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div className="friend-request-avatar blocked-avatar" style={user.avatar ? {
                  backgroundImage: `url(${user.avatar})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundColor: '#f44336',
                  color: 'transparent'
                } : { backgroundColor: '#f44336' }}>
                  {!user.avatar && user.username.charAt(0).toUpperCase()}
                </div>
                <div className="friend-request-info">
                  <div className="friend-request-name">{user.username}</div>
                  <div className="block-details">
                    <div className="block-reason">
                      <span className="label">Lý do:</span> <span style={{ color: '#000', fontWeight: 500 }}>{blockedItem.reason || 'Không có lý do'}</span>
                    </div>
                    <div className="block-time">
                      <span className="label">Chặn từ:</span> <span style={{ color: '#000', fontWeight: 500 }}>{formatTime(blockedItem.blocked_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="friend-request-actions" style={actionsStyle}>
                <button 
                  className="primary-action-btn unblock-btn"
                  onClick={() => handleUnblockClick(blockedItem)}
                  disabled={unblockingUser}
                >
                  <i className="fas fa-unlock"></i>
                  {blockedItem.block_id === selectedBlockInfo?.block_id && unblockingUser ? 'Đang xử lý...' : 'Bỏ chặn'}
                </button>
              </div>
            </div>
          );
        })}
        
        {/* Modal xác nhận bỏ chặn */}
        <div className="confirm-modal-overlay" style={{ display: showUnblockModal ? 'flex' : 'none' }}>
          <div className="confirm-modal">
            <div className="confirm-modal-header">
              <h3>Xác nhận bỏ chặn</h3>
            </div>
            <div className="confirm-modal-content">
              <p>
                Bạn có chắc chắn muốn bỏ chặn <strong>{selectedBlockInfo?.user.username}</strong>? 
                Người này sẽ có thể nhìn thấy thông tin của bạn và gửi tin nhắn cho bạn.
              </p>
              <div className="confirm-modal-buttons">
                <button 
                  className="confirm-button"
                  style={{ backgroundColor: '#2196F3' }}
                  onClick={handleUnblockUser}
                  disabled={unblockingUser}
                >
                  {unblockingUser ? 'Đang xử lý...' : 'Xác nhận bỏ chặn'}
                </button>
                <button 
                  className="cancel-button"
                  onClick={handleCancelUnblock}
                  disabled={unblockingUser}
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <style>
          {`
            .blocked-users-container {
              padding: 10px;
              position: relative;
            }
            
            .section-header {
              margin-bottom: 15px;
              color: #333;
              font-size: 16px;
              font-weight: 600;
            }
            
            .blocked-avatar {
              background-color: #f44336;
              color: white;
              width: 40px;
              height: 40px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 50%;
              margin-right: 12px;
              font-weight: bold;
            }
            
            .block-details {
              font-size: 12px;
              color: #666;
              margin-top: 4px;
            }
            
            .block-reason, .block-time {
              margin-bottom: 2px;
            }
            
            .label {
              font-weight: 500;
              margin-right: 5px;
              color: #555;
            }
            
            .unblock-btn {
              background-color: #2196F3;
              color: white;
              border: none;
              border-radius: 5px;
              padding: 8px 15px;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 14px;
              transition: background-color 0.2s;
            }
            
            .unblock-btn:hover {
              background-color: #0b7dda;
            }
            
            .unblock-btn:disabled {
              background-color: #90caf9;
              cursor: not-allowed;
            }
            
            .unblock-btn i {
              font-size: 12px;
            }
            
            .confirm-modal-overlay {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background-color: rgba(0, 0, 0, 0.5);
              display: flex;
              justify-content: center;
              align-items: center;
              z-index: 2000;
            }
            
            .confirm-modal {
              background-color: white;
              border-radius: 8px;
              width: 400px;
              max-width: 90%;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
              animation: modal-appear 0.3s ease-out;
            }
            
            .confirm-modal-header {
              padding: 15px 20px;
              border-bottom: 1px solid #eaeaea;
            }
            
            .confirm-modal-header h3 {
              margin: 0;
              font-size: 18px;
              color: #333;
            }
            
            .confirm-modal-content {
              padding: 20px;
            }
            
            .confirm-modal-content p {
              margin-top: 0;
              margin-bottom: 20px;
              font-size: 15px;
              color: #444;
              line-height: 1.5;
            }
            
            .confirm-modal-buttons {
              display: flex;
              justify-content: flex-end;
              gap: 10px;
            }
            
            .confirm-button {
              background-color: #2196F3;
              color: white;
              border: none;
              border-radius: 4px;
              padding: 8px 16px;
              font-size: 14px;
              cursor: pointer;
              transition: background-color 0.2s;
            }
            
            .confirm-button:hover {
              background-color: #0b7dda;
            }
            
            .confirm-button:disabled {
              background-color: #90caf9;
              cursor: not-allowed;
            }
            
            .cancel-button {
              background-color: #f0f0f0;
              color: #333;
              border: none;
              border-radius: 4px;
              padding: 8px 16px;
              font-size: 14px;
              cursor: pointer;
              transition: background-color 0.2s;
            }
            
            .cancel-button:hover {
              background-color: #e0e0e0;
            }
            
            .cancel-button:disabled {
              opacity: 0.7;
              cursor: not-allowed;
            }
            
            @keyframes modal-appear {
              from {
                opacity: 0;
                transform: translateY(-20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}
        </style>
      </div>
    );
  };

  // Cập nhật phần explore content để có giao diện giống lời mời kết bạn
  const renderExploreContent = () => {
    return (
      <div className="explore-content">
        <div className="search-container">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Tìm kiếm người dùng theo tên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="search-input"
            />
            <button 
              className="search-button" 
              onClick={() => handleSearch(searchTerm)}
              aria-label="Tìm kiếm"
            >
              <i className="fas fa-search"></i>
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="contacts-loading">
            <div className="spinner"></div>
            <p>Đang tìm kiếm...</p>
          </div>
        ) : (
          (() => {
            if (hasSearched && searchResults.length === 0) {
              return (
                <div className="contacts-empty">
                  <div className="contacts-empty-icon"></div>
                  <h3>Không tìm thấy người dùng</h3>
                  <p>Không có người dùng nào phù hợp với tìm kiếm của bạn</p>
                </div>
              );
            } else if (hasSearched) {
              return (
                <div className="search-results-container">
                  <h3 className="section-header">Kết quả tìm kiếm ({searchResults.length})</h3>
                  
                  {searchResults.map((user) => (
                    <div key={user.user_id} className="friend-request-item" style={itemContainerStyle}>
                      <div 
                        className="user-info-container"
                        onClick={() => handleUserClick(user)}
                        style={userInfoStyle}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {isUserLocked(user.user_id) ? (
                          <div className="friend-request-avatar banned-avatar">BAN</div>
                        ) : (
                          <div className="friend-request-avatar" style={user.avatar ? {
                            backgroundImage: `url(${user.avatar})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            color: 'transparent'
                          } : {}}>
                            {!user.avatar && (user.username ? user.username.charAt(0).toUpperCase() : 'U')}
                          </div>
                        )}
                        <div className="friend-request-info">
                          <div className="friend-request-name">{user.username}</div>
                        </div>
                      </div>
                      <div className="friend-request-actions" style={actionsStyle}>
                        {isCurrentUser(user) ? (
                          <div className="status-label current-user-label">
                            <i className="fas fa-user"></i>
                            Đây là bạn
                          </div>
                        ) : isUserLocked(user.user_id) ? (
                          <div className="status-label locked-user-label">
                            <i className="fas fa-ban"></i>
                            Tài khoản bị khóa
                          </div>
                        ) : checkFriendshipStatus(user.user_id) === 'accepted' ? (
                          <div className="status-label friend-status-label">
                            <i className="fas fa-user-check"></i>
                            Đã là bạn bè
                          </div>
                        ) : checkFriendshipStatus(user.user_id) === 'pending' ? (
                          <div className="status-label pending-request-label">
                            <i className="fas fa-clock"></i>
                            Đã gửi lời mời
                          </div>
                        ) : (
                          <button 
                            className="primary-action-btn add-friend-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUserClick(user);
                            }}
                          >
                            <i className="fas fa-user-plus"></i>
                            Kết bạn
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            } else {
              return (
                <div className="contacts-empty">
                  <div className="contacts-empty-icon explore-icon"></div>
                  <h3>Thêm bạn bè</h3>
                  <p>Nhập tên để tìm kiếm và kết bạn với người dùng mới</p>
                </div>
              );
            }
          })()
        )}
        
        <style>
          {`
            .search-container {
              margin-bottom: 20px;
              padding: 0 10px;
            }
            
            .search-input-wrapper {
              position: relative;
              display: flex;
              align-items: center;
              background-color: #f5f5f5;
              border-radius: 24px;
              overflow: hidden;
              box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
              transition: all 0.3s ease;
            }
            
            .search-input-wrapper:hover, 
            .search-input-wrapper:focus-within {
              box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
              background-color: #fff;
            }
            
            .search-input {
              flex: 1;
              padding: 12px 20px;
              border: none;
              font-size: 14px;
              background-color: transparent;
              outline: none;
              width: 100%;
              color: #000;
              font-weight: 500;
            }
            
            .search-input::placeholder {
              color: #999;
              font-weight: normal;
            }
            
            .search-button {
              background: none;
              border: none;
              width: 48px;
              height: 48px;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              color: #777;
              transition: color 0.2s;
            }
            
            .search-button:hover {
              color: #0084ff;
            }
            
            .search-results-container {
              padding: 10px;
            }
            
            .section-header {
              margin-bottom: 15px;
              color: #333;
              font-size: 16px;
              font-weight: 600;
              padding: 0 10px;
            }
            
            .status-label {
              display: flex;
              align-items: center;
              font-size: 13px;
              padding: 5px 10px;
              border-radius: 15px;
              gap: 5px;
            }
            
            .friend-status-label {
              background-color: #e8f5e9;
              color: #43a047;
            }
            
            .pending-request-label {
              background-color: #fff8e1;
              color: #ffa000;
            }
            
            .current-user-label {
              background-color: #f5f5f5;
              color: #607d8b;
            }
            
            .locked-user-label {
              background-color: #ffebee;
              color: #f44336;
            }
            
            .add-friend-btn {
              background-color: #4CAF50;
              color: white;
              border: none;
              border-radius: 5px;
              padding: 8px 15px;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 14px;
              transition: background-color 0.2s;
            }
            
            .add-friend-btn:hover {
              background-color: #388E3C;
            }
            
            .primary-action-btn {
              font-weight: 500;
            }
            
            .primary-action-btn i {
              font-size: 12px;
            }
            
            .friend-request-avatar {
              width: 42px;
              height: 42px;
              border-radius: 50%;
              background-color: #0084ff;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 16px;
              margin-right: 12px;
            }
            
            .banned-avatar {
              background-color: #f44336;
            }
            
            .friend-request-info {
              display: flex;
              flex-direction: column;
            }
            
            .friend-request-name {
              font-weight: 500;
              font-size: 15px;
              color: #333;
            }
            
            .explore-content {
              padding: 10px 0;
            }
            
            .spinner {
              width: 30px;
              height: 30px;
              border: 3px solid rgba(0, 132, 255, 0.2);
              border-top: 3px solid #0084ff;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 0 auto 15px auto;
            }
            
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            
            .contacts-loading {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 30px 0;
              color: #666;
            }
            
            .contacts-empty {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 40px 0;
              text-align: center;
            }
            
            .contacts-empty h3 {
              font-size: 18px;
              color: #333;
              margin: 15px 0 5px 0;
            }
            
            .contacts-empty p {
              color: #666;
              font-size: 14px;
            }
            
            .contacts-empty-icon {
              width: 80px;
              height: 80px;
              background-color: #f5f5f5;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 10px;
            }
            
            .explore-icon {
              position: relative;
            }
            
            .explore-icon:before {
              content: "\f234";
              font-family: "Font Awesome 5 Free";
              font-weight: 900;
              font-size: 24px;
              color: #aaa;
            }
            
            .blocked-icon {
              position: relative;
              background-color: #fff0f0;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
              box-shadow: 0 4px 15px rgba(244, 67, 54, 0.15);
              transition: all 0.3s ease;
              animation: pulse-blocked 2s infinite ease-in-out;
            }
            
            .blocked-icon:before {
              content: "\\f235";
              font-family: "Font Awesome 5 Free";
              font-weight: 900;
              font-size: 32px;
              color: #ff5252;
              filter: drop-shadow(0 2px 3px rgba(244, 67, 54, 0.3));
              transition: all 0.3s ease;
              animation: float-icon 3s infinite ease-in-out;
            }
            
            .blocked-icon:after {
              content: "";
              position: absolute;
              width: 100%;
              height: 100%;
              background: radial-gradient(circle, rgba(255,255,255,0) 60%, rgba(255,82,82,0.2) 100%);
              z-index: 1;
            }
            
            @keyframes pulse-blocked {
              0% { box-shadow: 0 4px 15px rgba(244, 67, 54, 0.15); }
              50% { box-shadow: 0 4px 25px rgba(244, 67, 54, 0.25); }
              100% { box-shadow: 0 4px 15px rgba(244, 67, 54, 0.15); }
            }
            
            @keyframes float-icon {
              0% { transform: translateY(0px); }
              50% { transform: translateY(-5px); }
              100% { transform: translateY(0px); }
            }
          `}
        </style>
      </div>
    );
  };

  // Thêm useEffect để tự động làm mới trạng thái hoạt động của bạn bè
  useEffect(() => {
    // Chỉ áp dụng cho tab bạn bè
    if (activeTab !== 'friends' || !userId) return;
    
    console.log('Thiết lập interval làm mới trạng thái bạn bè');
    
    // Hàm làm mới trạng thái bạn bè
    const refreshFriendsStatus = async () => {
      try {
        const friends = await api.getFriends(userId);
        
        // Cập nhật danh sách bạn bè với trạng thái mới
        setFriendsList(prevFriends => {
          // Tạo bản sao của danh sách bạn bè hiện tại
          const updatedFriends = [...prevFriends];
          let hasChanges = false;
          
          // Cập nhật thông tin cho mỗi người bạn
          for (const friend of friends) {
            const index = updatedFriends.findIndex(f => f.user_id === friend.user_id);
            if (index !== -1) {
              const oldStatus = updatedFriends[index].status;
              const oldActivity = updatedFriends[index].last_activity;
              
              if (oldStatus !== friend.status || oldActivity !== friend.last_activity) {
                updatedFriends[index] = {
                  ...updatedFriends[index],
                  status: friend.status,
                  last_activity: friend.last_activity
                };
                hasChanges = true;
              }
            }
          }
          
          // Chỉ trả về danh sách mới nếu có thay đổi
          return hasChanges ? updatedFriends : prevFriends;
        });
      } catch (error) {
        console.error('Lỗi khi làm mới trạng thái bạn bè:', error);
      }
    };
    
    // Gọi hàm làm mới ngay lập tức khi mount component
    refreshFriendsStatus();
    
    // Thiết lập interval làm mới mỗi 10 giây
    const intervalId = setInterval(refreshFriendsStatus, 10000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [activeTab, userId]);

  // Thêm useEffect để tự động mở dropdown khi số lượng lời mời kết bạn ít
  useEffect(() => {
    // Tự động mở dropdown khi số lượng lời mời kết bạn từ 1-4
    if (friendRequests.length > 0 && friendRequests.length <= 4) {
      setReceivedDropdownOpen(true);
    } else {
      setReceivedDropdownOpen(false);
    }
    
    if (sentFriendRequests.length > 0 && sentFriendRequests.length <= 4) {
      setSentDropdownOpen(true);
    } else {
      setSentDropdownOpen(false);
    }
  }, [friendRequests.length, sentFriendRequests.length]);

  // Render nội dung của tab hiện tại
  const renderTabContent = () => {
    if (!currentUser) {
      return (
        <div className="contacts-loading">
          <div className="spinner"></div>
          <p>Đang tải thông tin người dùng...</p>
        </div>
      );
    }

    let content;
    switch (activeTab) {
      case 'friends':
        content = renderFriendsList();
        break;
      case 'requests':
        content = renderFriendRequests();
        break;
      case 'blocked':
        content = renderBlockedUsers();
        break;
      case 'explore':
        content = renderExploreContent();
        break;
      default:
        content = renderFriendsList();
    }

    return (
      <div>
        {content}
        <style>
          {`
            .contacts-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 20px;
              padding: 0 10px;
            }
            
            .contacts-search-bar {
              position: relative;
              display: flex;
              align-items: center;
              background-color: #f5f5f5;
              border-radius: 24px;
              overflow: hidden;
              box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
              transition: all 0.3s ease;
              flex: 1;
              margin: 0 15px;
            }
            
            .contacts-search-bar:hover, 
            .contacts-search-bar:focus-within {
              box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
              background-color: #fff;
            }
            
            .contacts-search-input {
              flex: 1;
              padding: 10px 12px 10px 40px;
              border: none;
              font-size: 14px;
              background-color: transparent;
              outline: none;
              width: 100%;
              color: #000;
              font-weight: 500;
            }
            
            .contacts-search-input::placeholder {
              color: #999;
              font-weight: normal;
            }
            
            .search-icon {
              position: absolute;
              left: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              width: 28px;
              height: 28px;
              top: 50%;
              transform: translateY(-50%);
              z-index: 1;
              border-radius: 50%;
              transition: all 0.2s ease;
              background-color: rgba(0, 132, 255, 0.1);
            }
            
            .search-icon:hover {
              background-color: rgba(0, 132, 255, 0.2);
              transform: translateY(-50%) scale(1.05);
            }
            
            .friends-list-container {
              display: flex;
              flex-direction: column;
              height: 100%;
            }
            
            .friends-container, .friends-container-with-groups {
              flex: 1;
              overflow-y: auto;
            }
            
            .search-container {
              margin-bottom: 20px;
              padding: 0 10px;
            }
            
            .search-input-wrapper {
              position: relative;
              display: flex;
              align-items: center;
              background-color: #f5f5f5;
              border-radius: 24px;
              overflow: hidden;
              box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
              transition: all 0.3s ease;
            }
            
            .search-input-wrapper:hover, 
            .search-input-wrapper:focus-within {
              box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
              background-color: #fff;
            }
            
            .search-input {
              flex: 1;
              padding: 12px 20px;
              border: none;
              font-size: 14px;
              background-color: transparent;
              outline: none;
              width: 100%;
              color: #000;
              font-weight: 500;
            }
            
            .search-input::placeholder {
              color: #999;
              font-weight: normal;
            }
            
            .search-button {
              background: none;
              border: none;
              width: 48px;
              height: 48px;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              color: #777;
              transition: color 0.2s;
            }
            
            .search-button:hover {
              color: #0084ff;
            }
            
            .section-header {
              font-size: 16px;
              color: #333;
              margin-top: 5px;
              margin-bottom: 15px;
              padding: 0 10px;
            }
            
            .status-label {
              display: flex;
              align-items: center;
              font-size: 13px;
              padding: 5px 10px;
              border-radius: 15px;
              gap: 5px;
            }
            
            .friend-status-label {
              background-color: #e8f5e9;
              color: #43a047;
            }
            
            .pending-request-label {
              background-color: #fff8e1;
              color: #ffa000;
            }
            
            .current-user-label {
              background-color: #f5f5f5;
              color: #607d8b;
            }
            
            .locked-user-label {
              background-color: #ffebee;
              color: #f44336;
            }
            
            .add-friend-btn {
              background-color: #4CAF50;
              color: white;
              border: none;
              border-radius: 5px;
              padding: 8px 15px;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 14px;
              transition: background-color 0.2s;
            }
            
            .add-friend-btn:hover {
              background-color: #388E3C;
            }
            
            .primary-action-btn {
              font-weight: 500;
            }
            
            .primary-action-btn i {
              font-size: 12px;
            }
            
            .friend-request-avatar {
              width: 42px;
              height: 42px;
              border-radius: 50%;
              background-color: #0084ff;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 16px;
              margin-right: 12px;
            }
            
            .banned-avatar {
              background-color: #f44336;
            }
            
            .friend-request-info {
              display: flex;
              flex-direction: column;
            }
            
            .friend-request-name {
              font-weight: 500;
              font-size: 15px;
              color: #333;
            }
            
            .explore-content {
              padding: 10px 0;
            }
            
            .spinner {
              width: 30px;
              height: 30px;
              border: 3px solid rgba(0, 132, 255, 0.2);
              border-top: 3px solid #0084ff;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 0 auto 15px auto;
            }
            
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            
            .contacts-loading {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 30px 0;
              color: #666;
            }
            
            .contacts-empty {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 40px 0;
              text-align: center;
            }
            
            .contacts-empty h3 {
              font-size: 18px;
              color: #333;
              margin: 15px 0 5px 0;
            }
            
            .contacts-empty p {
              color: #666;
              font-size: 14px;
            }
            
            .contacts-empty-icon {
              width: 80px;
              height: 80px;
              background-color: #f5f5f5;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 10px;
            }
            
            .explore-icon {
              position: relative;
            }
            
            .explore-icon:before {
              content: "\f234";
              font-family: "Font Awesome 5 Free";
              font-weight: 900;
              font-size: 24px;
              color: #aaa;
            }
            
            .blocked-icon {
              position: relative;
              background-color: #fff0f0;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
              box-shadow: 0 4px 15px rgba(244, 67, 54, 0.15);
              transition: all 0.3s ease;
              animation: pulse-blocked 2s infinite ease-in-out;
            }
            
            .blocked-icon:before {
              content: "\\f235";
              font-family: "Font Awesome 5 Free";
              font-weight: 900;
              font-size: 32px;
              color: #ff5252;
              filter: drop-shadow(0 2px 3px rgba(244, 67, 54, 0.3));
              transition: all 0.3s ease;
              animation: float-icon 3s infinite ease-in-out;
            }
            
            .blocked-icon:after {
              content: "";
              position: absolute;
              width: 100%;
              height: 100%;
              background: radial-gradient(circle, rgba(255,255,255,0) 60%, rgba(255,82,82,0.2) 100%);
              z-index: 1;
            }
            
            @keyframes pulse-blocked {
              0% { box-shadow: 0 4px 15px rgba(244, 67, 54, 0.15); }
              50% { box-shadow: 0 4px 25px rgba(244, 67, 54, 0.25); }
              100% { box-shadow: 0 4px 15px rgba(244, 67, 54, 0.15); }
            }
            
            @keyframes float-icon {
              0% { transform: translateY(0px); }
              50% { transform: translateY(-5px); }
              100% { transform: translateY(0px); }
            }
          `}
        </style>
      </div>
    );
  };

  const handleStartConversation = async (userId: number) => {
    try {
      if (!currentUser?.user_id) return;
      
      const result = await api.getOrCreateOneToOneConversation(
        currentUser.user_id, 
        userId
      );
      
      if (result.success && result.data) {
        // Cập nhật cuộc trò chuyện hiện tại
        if (setCurrentConversation) {
          setCurrentConversation(result.data);
        }
        
        // Kích hoạt sự kiện chuyển tab
        window.dispatchEvent(new CustomEvent('switchToMessagesTab'));
        
        // Nếu có callback từ component cha, gọi nó
        if (onConversationStarted) {
          onConversationStarted(result.data);
        }
      }
    } catch (error) {
      console.error('Lỗi khi tạo cuộc trò chuyện:', error);
    }
  };

  return (
    <div className="contacts-content">
      {renderTabContent()}
      
      {/* Hiển thị modal thông tin người dùng khi click vào một người dùng */}
      {showUserProfileModal && selectedUserId && (
        <UserProfileModal
          isOpen={showUserProfileModal}
          onClose={handleCloseUserProfileModal}
          userId={selectedUserId}
          onFriendRequestSent={handleProfileModalUpdate}
          onStartConversation={handleStartConversation}
        />
      )}
      
      {/* Thêm toast thông báo thành công */}
      {successMessage && (
        <SuccessToast 
          message={successMessage} 
          duration={3000}
        />
      )}
    </div>
  );
};

export default ContactsContent; 