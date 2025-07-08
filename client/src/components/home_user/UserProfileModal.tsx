import React, { useState, useEffect } from 'react';
import './ProfileModal.css'; // Sử dụng lại CSS của ProfileModal
import api from '../../services/api';
import type { User } from '../../services/api';
import ConfirmRemoveFriendModal from './ConfirmRemoveFriendModal';
import SuccessToast from '../common/SuccessToast';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: number;
  onFriendRequestSent?: () => void; // Callback khi gửi lời mời kết bạn thành công
  fromFriendRequest?: boolean; // Đánh dấu modal được mở từ lời mời kết bạn
  friendshipId?: number; // ID của lời mời kết bạn nếu có
  onStartConversation?: (userId: number) => void;  // Thêm prop mới
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ 
  isOpen, 
  onClose, 
  userId, 
  onFriendRequestSent, 
  fromFriendRequest = false,
  friendshipId: propFriendshipId,
  onStartConversation
}) => {
  const [userData, setUserData] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [addingFriend, setAddingFriend] = useState<boolean>(false);
  const [friendRequestSent, setFriendRequestSent] = useState<boolean>(false);
  const [friendshipStatus, setFriendshipStatus] = useState<string | null>(null);
  const [friendshipId, setFriendshipId] = useState<number | undefined>(propFriendshipId);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [removingFriend, setRemovingFriend] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [processingRequest, setProcessingRequest] = useState<boolean>(false);
  const [isUserLocked, setIsUserLocked] = useState<boolean>(false);
  const [lockInfo, setLockInfo] = useState<{reason: string, lock_time: string, unlock_time: string} | null>(null);
  const [isBlockedByMe, setIsBlockedByMe] = useState<boolean>(false);
  const [isBlockingMe, setIsBlockingMe] = useState<boolean>(false);
  const [blockReason, setBlockReason] = useState<string>('');
  const [showBlockModal, setShowBlockModal] = useState<boolean>(false);
  const [blockingUser, setBlockingUser] = useState<boolean>(false);
  const [showUnblockModal, setShowUnblockModal] = useState<boolean>(false);

  useEffect(() => {
    // Lấy thông tin người dùng hiện tại từ localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
    
    // Cập nhật friendshipId từ prop nếu có
    if (propFriendshipId) {
      setFriendshipId(propFriendshipId);
    }
    
    // Đặt friendshipStatus thành 'pending' nếu mở từ lời mời kết bạn
    if (fromFriendRequest) {
      setFriendshipStatus('pending');
    }

    const fetchUserData = async () => {
      if (!isOpen || !userId) return;
      
      setLoading(true);
      try {
        // Luôn tải dữ liệu mới nhất từ API để đảm bảo thông tin cập nhật
        const users = await api.getUsers();
        const userFromAPI = users.find(u => u.user_id === userId);
        
        if (!userFromAPI) {
          console.error("Không tìm thấy người dùng với ID:", userId);
          setError('Không tìm thấy thông tin người dùng');
          setLoading(false);
          return;
        }
        
        // Kiểm tra dữ liệu người dùng
        if (!userFromAPI.email) {
          console.warn("Không có thông tin email cho người dùng:", userFromAPI);
        }
        
        if (!userFromAPI.status) {
          // Mặc định trạng thái là offline nếu không có
          userFromAPI.status = 'offline';
        }
        
        setUserData(userFromAPI);

        try {
          // Lấy thông tin từ bảng lock_users
          const response = await api.getUsers();
          const userWithLockInfo = response.find(u => u.user_id === userId);
          
          // Kiểm tra trạng thái khóa từ trường lock_status trong bảng
          const isLocked = userWithLockInfo?.lock_status === 'locked';
          
          if (isLocked) {
            setIsUserLocked(true);
            
            // Lấy thông tin khóa từ dữ liệu người dùng
            setLockInfo({
              reason: userWithLockInfo?.reason || 'Không xác định',
              lock_time: userWithLockInfo?.lock_time || new Date().toISOString(),
              unlock_time: userWithLockInfo?.unlock_time || new Date().toISOString()
            });
          } else {
            // Đảm bảo trạng thái không bị khóa nếu status là 'unlocked' hoặc trạng thái khác
            setIsUserLocked(false);
            setLockInfo(null);
          }
        } catch (error) {
          console.error("Lỗi khi kiểm tra trạng thái khóa:", error);
          // Mặc định là không bị khóa nếu có lỗi
          setIsUserLocked(false);
          setLockInfo(null);
        }

        if (storedUser) {
          const currentUserData = JSON.parse(storedUser);
          
          // Kiểm tra trạng thái kết bạn
          const status = await api.checkFriendshipStatus(currentUserData.user_id, userId);
          setFriendshipStatus(status.status);
          setFriendshipId(status.friendship_id);
          
          if (status.status === 'pending') {
            // Nếu đã gửi lời mời kết bạn trước đó
            setFriendRequestSent(true);
          }

          // Kiểm tra trạng thái chặn
          try {
            // Kiểm tra xem người dùng hiện tại có đang chặn người dùng này không
            const blockStatus = await api.checkBlockStatus(currentUserData.user_id, userId);
            setIsBlockedByMe(blockStatus.isBlocking);

            // Kiểm tra xem người dùng này có đang chặn người dùng hiện tại không
            const reverseBlockStatus = await api.checkBlockStatus(userId, currentUserData.user_id);
            setIsBlockingMe(reverseBlockStatus.isBlocking);
          } catch (error) {
            console.error("Lỗi khi kiểm tra trạng thái chặn:", error);
          }
        }
      } catch (error) {
        console.error('Lỗi khi lấy thông tin người dùng:', error);
        setError('Không thể tải thông tin người dùng. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [isOpen, userId]);

  // Kiểm tra xem user có phải là người dùng hiện tại không
  const isCurrentUser = () => {
    if (!currentUser || !userData) return false;
    
    // Kiểm tra xác thực bằng email (cách chính xác nhất)
    if (userData.email && currentUser.email && userData.email === currentUser.email) {
      return true;
    }
    
    // Kiểm tra bằng username nếu email không có hoặc không khớp
    if (userData.username && currentUser.username && userData.username === currentUser.username) {
      return true;
    }
    
    // Kiểm tra bằng ID nếu có
    if (userData.user_id && currentUser.user_id && userData.user_id === currentUser.user_id) {
      return true;
    }
    
    // Nếu tất cả đều không khớp
    return false;
  };

  // Kiểm tra xem có quyền xem trạng thái online/offline hay không
  const canViewStatus = () => {
    return isCurrentUser() || // Là chính bản thân
      (friendshipStatus === 'accepted' && !isBlockedByMe && !isBlockingMe); // Đã là bạn bè và không chặn nhau
  };

  // Hiển thị trạng thái hoạt động phù hợp
  const getStatusDisplay = () => {
    if (isUserLocked) {
      return 'Tài khoản bị khóa';
    }
    
    if (isBlockedByMe) {
      return 'Đã chặn người dùng này';
    }
    
    if (isBlockingMe) {
      return 'Bạn đã bị người dùng này chặn';
    }
    
    if (!canViewStatus()) {
      return 'Không có quyền xem';
    }
    
    return isOnline(userData?.status) ? 'Đang hoạt động' : 'Không hoạt động';
  };

  // Lấy lớp CSS cho chỉ báo trạng thái
  const getStatusIndicatorClass = () => {
    if (isUserLocked) {
      return 'status-banned';
    }
    
    if (isBlockedByMe || isBlockingMe) {
      return 'status-blocked';
    }
    
    if (!canViewStatus()) {
      return 'status-unknown'; // CSS đặc biệt cho trường hợp không có quyền xem
    }
    
    return isOnline(userData?.status) ? 'status-online' : 'status-offline';
  };

  // Trả về lớp CSS cho avatar
  const getAvatarClass = () => {
    if (isUserLocked) return 'profile-avatar banned-avatar';
    if (isBlockedByMe || isBlockingMe) return 'profile-avatar blocked-avatar';
    return 'profile-avatar';
  };

  // Lấy style cho avatar (để hỗ trợ hiển thị hình ảnh)
  const getAvatarStyle = () => {
    if (userData?.avatar) {
      return {
        backgroundImage: `url(${userData.avatar})`,
        color: 'transparent'
      };
    }
    return {};
  };

  // Xử lý chặn người dùng
  const handleBlockUser = async () => {
    if (!userData || !currentUser || !userData.user_id || !currentUser.user_id) {
      setError('Không thể chặn người dùng: Thiếu thông tin người dùng');
      return;
    }
    
    setBlockingUser(true);
    
    try {
      const result = await api.blockUser({
        blocker_id: currentUser.user_id,
        blocked_id: userData.user_id,
        reason: blockReason || 'Không có lý do được cung cấp',
        block_type: 'permanent' // Mặc định là chặn vĩnh viễn
      });
      
      if (result.success) {
        setIsBlockedByMe(true);
        setSuccessMessage('Đã chặn người dùng thành công');
        setShowBlockModal(false);
        
        // Nếu đang là bạn bè, tự động hủy kết bạn
        if (friendshipStatus === 'accepted' && friendshipId) {
          try {
            await api.removeFriend(friendshipId);
            setFriendshipStatus(null);
            setFriendshipId(undefined);
          } catch (removeFriendError) {
            console.error('Lỗi khi hủy kết bạn sau khi chặn:', removeFriendError);
          }
        }
        
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } else {
        setError(result.message || 'Không thể chặn người dùng');
      }
    } catch (error) {
      console.error('Lỗi khi chặn người dùng:', error);
      setError('Không thể chặn người dùng. Vui lòng thử lại sau.');
    } finally {
      setBlockingUser(false);
    }
  };
  
  // Xử lý bỏ chặn người dùng
  const handleUnblockUser = async () => {
    if (!userData || !currentUser || !userData.user_id || !currentUser.user_id) {
      setError('Không thể bỏ chặn người dùng: Thiếu thông tin người dùng');
      return;
    }
    
    // Hiển thị modal xác nhận bỏ chặn
    setShowUnblockModal(true);
  };
  
  // Xử lý xác nhận bỏ chặn
  const handleConfirmUnblock = async () => {
    if (!userData || !currentUser || !userData.user_id || !currentUser.user_id) {
      setError('Không thể bỏ chặn người dùng: Thiếu thông tin người dùng');
      return;
    }
    
    setBlockingUser(true);
    
    try {
      const result = await api.unblockUser(currentUser.user_id, userData.user_id);
      
      if (result.success) {
        setIsBlockedByMe(false);
        setSuccessMessage('Đã bỏ chặn người dùng thành công');
        setShowUnblockModal(false);
        
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } else {
        setError(result.message || 'Không thể bỏ chặn người dùng');
      }
    } catch (error) {
      console.error('Lỗi khi bỏ chặn người dùng:', error);
      setError('Không thể bỏ chặn người dùng. Vui lòng thử lại sau.');
    } finally {
      setBlockingUser(false);
    }
  };
  
  // Xử lý hủy bỏ chặn
  const handleCancelUnblock = () => {
    setShowUnblockModal(false);
  };

  const handleAddFriend = async () => {
    if (!userData || !currentUser) return;
    
    // Đảm bảo cả hai user_id đều tồn tại
    if (!userData.user_id || !currentUser.user_id) {
      setError('Không thể gửi lời mời: Thiếu thông tin người dùng');
      return;
    }
    
    setAddingFriend(true);
    try {
      // Gửi lời mời kết bạn
      const result = await api.sendFriendRequest(currentUser.user_id, userData.user_id);
      
      if (result.success) {
        console.log(`Đã gửi lời mời kết bạn đến ${userData.username}`);
        setFriendRequestSent(true);
        setFriendshipStatus('pending');
        setFriendshipId(result.data?.friendship_id);
        
        // Gọi callback nếu có
        if (onFriendRequestSent) {
          onFriendRequestSent();
        }
        
        setTimeout(() => {
          // Đóng modal sau khi gửi lời mời kết bạn thành công
          onClose();
        }, 1500);
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('Lỗi khi gửi lời mời kết bạn:', error);
      setError('Không thể gửi lời mời kết bạn. Vui lòng thử lại sau.');
    } finally {
      setAddingFriend(false);
    }
  };

  const handleCancelFriendRequest = async () => {
    if (!friendshipId) {
      console.error('Không thể hủy lời mời kết bạn: friendshipId không tồn tại');
      return;
    }
    
    setAddingFriend(true);
    try {
      // Hủy lời mời kết bạn, sử dụng non-null assertion để khắc phục TypeScript error
      const result = await api.rejectFriendRequest(friendshipId as number);
      
      if (result.success) {
        console.log('Đã hủy lời mời kết bạn');
        setFriendRequestSent(false);
        setFriendshipStatus(null);
        setFriendshipId(undefined);
        
        setTimeout(() => {
          // Đóng modal sau khi hủy lời mời kết bạn thành công
          onClose();
        }, 1500);
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('Lỗi khi hủy lời mời kết bạn:', error);
      setError('Không thể hủy lời mời kết bạn. Vui lòng thử lại sau.');
    } finally {
      setAddingFriend(false);
    }
  };
  
  // Xử lý khi người dùng nhấn nút hủy kết bạn
  const handleRemoveFriendClick = () => {
    setShowConfirmModal(true); // Hiển thị modal xác nhận
  };
  
  // Xử lý khi người dùng xác nhận hủy kết bạn
  const handleRemoveFriend = async () => {
    if (!friendshipId) {
      console.error('Không thể hủy kết bạn: friendshipId không tồn tại');
      setShowConfirmModal(false);
      return;
    }
    
    setRemovingFriend(true);
    try {
      // Gọi API hủy kết bạn
      const result = await api.removeFriend(friendshipId);
      
      if (result.success) {
        console.log('Đã hủy kết bạn thành công');
        setSuccessMessage('Đã hủy kết bạn thành công!');
        setFriendshipStatus(null);
        setFriendshipId(undefined);
        
        // Gọi callback nếu có
        if (onFriendRequestSent) {
          onFriendRequestSent();
        }
        
        // Đóng modal xác nhận ngay lập tức nhưng giữ lại modal thông tin người dùng
        setShowConfirmModal(false);
        
        // Đóng modal thông tin người dùng sau khi hết thời gian hiển thị thông báo
        setTimeout(() => {
          // Xóa thông báo thành công và đóng modal
          setSuccessMessage('');
          onClose();
        }, 3000);
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('Lỗi khi hủy kết bạn:', error);
      setError('Không thể hủy kết bạn. Vui lòng thử lại sau.');
    } finally {
      setRemovingFriend(false);
      setShowConfirmModal(false); // Đóng modal xác nhận
    }
  };
  
  // Đóng modal xác nhận
  const handleCancelRemove = () => {
    setShowConfirmModal(false);
  };

  // Xử lý khi chấp nhận lời mời kết bạn
  const handleAcceptFriendRequest = async () => {
    if (!friendshipId) {
      console.error('Không thể chấp nhận lời mời kết bạn: friendshipId không tồn tại');
      return;
    }
    
    setProcessingRequest(true);
    try {
      const result = await api.acceptFriendRequest(friendshipId);
      
      if (result.success) {
        console.log('Đã chấp nhận lời mời kết bạn');
        setSuccessMessage('Đã chấp nhận lời mời kết bạn!');
        setFriendshipStatus('accepted');
        
        // Gọi callback nếu có
        if (onFriendRequestSent) {
          onFriendRequestSent();
        }
        
        setTimeout(() => {
          setSuccessMessage('');
          onClose();
        }, 2000);
      } else {
        setError(result.message);
      }
    } catch (error: any) {
      console.error('Lỗi khi chấp nhận lời mời kết bạn:', error);
      setError('Không thể chấp nhận lời mời. Vui lòng thử lại sau.');
    } finally {
      setProcessingRequest(false);
    }
  };
  
  // Xử lý khi từ chối lời mời kết bạn
  const handleRejectFriendRequest = async () => {
    if (!friendshipId) {
      console.error('Không thể từ chối lời mời kết bạn: friendshipId không tồn tại');
      return;
    }
    
    setProcessingRequest(true);
    try {
      const result = await api.rejectFriendRequest(friendshipId);
      
      if (result.success) {
        console.log('Đã từ chối lời mời kết bạn');
        setSuccessMessage('Đã từ chối lời mời kết bạn!');
        setFriendshipStatus(null);
        setFriendshipId(undefined);
        
        // Gọi callback nếu có
        if (onFriendRequestSent) {
          onFriendRequestSent();
        }
        
        setTimeout(() => {
          setSuccessMessage('');
          onClose();
        }, 2000);
      } else {
        setError(result.message);
      }
    } catch (error: any) {
      console.error('Lỗi khi từ chối lời mời kết bạn:', error);
      setError('Không thể từ chối lời mời. Vui lòng thử lại sau.');
    } finally {
      setProcessingRequest(false);
    }
  };

  // Thêm kiểm tra xem tài khoản có phải là tài khoản hệ thống hay không
  const isSystemAccount = () => {
    return userData?.user_id === 1 || userData?.username === 'Hệ thống';
  };

  if (!isOpen) return null;

  // Format ngày thành dd/mm/yyyy
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      // Kiểm tra xem ngày có hợp lệ không
      if (isNaN(date.getTime())) return 'N/A';
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    } catch (error) {
      console.error('Lỗi khi format date:', error);
      return 'N/A';
    }
  };

  // Kiểm tra trạng thái online
  const isOnline = (status?: string) => {
    if (status === undefined || status === null) {
      return false;
    }
    return status.toLowerCase() === 'online';
  };

  // Tính toán thời gian hoạt động cuối cùng
  const getLastActivityTime = (lastActivity?: string) => {
    if (!lastActivity) return 'N/A';
    try {
      const date = new Date(lastActivity);
      // Kiểm tra xem ngày có hợp lệ không
      if (isNaN(date.getTime())) return 'N/A';
      
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
      console.error('Lỗi khi tính thời gian hoạt động cuối cùng:', error);
      return 'N/A';
    }
  };

  // Render nút chặn/bỏ chặn người dùng
  const renderBlockButton = () => {
    // Không hiển thị nút chặn nếu là tài khoản hệ thống
    if (isCurrentUser() || isBlockingMe || isSystemAccount()) return null;
    
    if (isBlockedByMe) {
      return (
        <button 
          className="unblock-user-button" 
          onClick={handleUnblockUser}
          disabled={blockingUser}
        >
          <i className="fas fa-unlock"></i>
          {blockingUser ? 'Đang xử lý...' : 'Bỏ chặn'}
        </button>
      );
    } else {
      return (
        <button 
          className="block-user-button" 
          onClick={() => setShowBlockModal(true)}
          disabled={blockingUser}
        >
          <i className="fas fa-ban"></i>
          Chặn
        </button>
      );
    }
  };

  // Render nút hủy kết bạn cho người dùng bị khóa (nếu đã là bạn bè)
  const renderLockedUserActions = () => {
    if (!isUserLocked || isCurrentUser()) return null;
    
    if (friendshipStatus === 'accepted') {
      return (
        <div className="locked-user-action">
          <span className="friend-status locked-status">
            <i className="fas fa-user-lock"></i>
            Tài khoản bị khóa
          </span>
          <button 
            className="remove-friend-button" 
            onClick={handleRemoveFriendClick}
          >
            <i className="fas fa-user-minus"></i>
            Hủy kết bạn
          </button>
        </div>
      );
    }
    
    return null;
  };

  // Render nút kết bạn/hủy kết bạn
  const renderFriendshipButton = () => {
    // Không hiển thị nút kết bạn nếu là chính mình hoặc tài khoản hệ thống
    if (isCurrentUser() || isSystemAccount()) {
      return null;
    }

    // Không hiển thị nút kết bạn thông thường cho người dùng bị khóa hoặc đã chặn/bị chặn
    if (isUserLocked || isBlockedByMe || isBlockingMe) {
      return null; 
    }

    const handleStartChat = async () => {
      try {
        if (!userData?.user_id) {
          console.error("Không tìm thấy ID người dùng");
          return;
        }

        if (onStartConversation) {
          // Gọi callback nếu có
          onStartConversation(userData.user_id);
          onClose();
        } else {
          // Fallback cho trường hợp không có callback
          const result = await api.getOrCreateOneToOneConversation(
            currentUser?.user_id || 0, 
            userData.user_id
          );
          
          if (result.success && result.data) {
            window.location.href = '/?tab=messages';
          }
        }
      } catch (error) {
        console.error("Lỗi khi tạo cuộc trò chuyện:", error);
        setError("Đã xảy ra lỗi. Vui lòng thử lại sau.");
      }
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Nút nhắn tin luôn hiển thị đầu tiên */}
        <button 
          className="message-friend-button"
          onClick={handleStartChat}
          style={{
            backgroundColor: friendshipStatus === 'accepted' ? '#0066ff' : '#f0f2f5',
            color: friendshipStatus === 'accepted' ? '#ffffff' : '#000000',
            border: friendshipStatus === 'accepted' ? 'none' : '1px solid #ddd'
          }}
        >
          <i className="fas fa-comment"></i>
          Nhắn tin
        </button>

        {/* Các nút quản lý kết bạn */}
        {(() => {
          if (friendshipStatus === 'accepted') {
            return (
              <>
                <span className="friend-status">
                  <i className="fas fa-user-check"></i>
                  Đã là bạn bè
                </span>
                <button 
                  className="remove-friend-button" 
                  onClick={handleRemoveFriendClick}
                >
                  <i className="fas fa-user-minus"></i>
                  Hủy kết bạn
                </button>
              </>
            );
          } else if (friendshipStatus === 'pending' && friendRequestSent) {
            return (
              <button 
                className="cancel-friend-button" 
                onClick={handleCancelFriendRequest}
                disabled={addingFriend}
              >
                <i className="fas fa-user-times"></i>
                {addingFriend ? 'Đang hủy...' : 'Hủy lời mời kết bạn'}
              </button>
            );
          } else if (friendshipStatus === 'pending' && fromFriendRequest) {
            return (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className="accept-friend-button" 
                  onClick={handleAcceptFriendRequest}
                  disabled={processingRequest}
                >
                  <i className="fas fa-user-check"></i>
                  {processingRequest ? 'Đang xử lý...' : 'Chấp nhận'}
                </button>
                <button 
                  className="reject-friend-button" 
                  onClick={handleRejectFriendRequest}
                  disabled={processingRequest}
                >
                  <i className="fas fa-user-times"></i>
                  {processingRequest ? 'Đang xử lý...' : 'Từ chối'}
                </button>
              </div>
            );
          } else {
            return (
              <button 
                className="add-friend-button" 
                onClick={handleAddFriend}
                disabled={addingFriend || friendRequestSent}
              >
                <i className="fas fa-user-plus"></i>
                {addingFriend ? 'Đang gửi...' : friendRequestSent ? 'Đã gửi lời mời' : 'Kết bạn'}
              </button>
            );
          }
        })()}
      </div>
    );
  };

  return (
    <div className="profile-modal-overlay">
      <div className="profile-modal">
        <div className="profile-modal-header">
          <h2>Thông tin người dùng</h2>
          <button className="close-button" onClick={onClose}></button>
        </div>
        <div className="profile-modal-content">
          {loading ? (
            <div className="profile-loading">Đang tải thông tin...</div>
          ) : userData ? (
            (() => {
              return (
                <div className="profile-content">
                  <div className="profile-avatar-section">
                    <div className={getAvatarClass()} style={getAvatarStyle()}>
                      {!isUserLocked && !isBlockedByMe && !isBlockingMe && !userData.avatar && 
                        (userData.username ? userData.username.charAt(0).toUpperCase() : '?')}
                      <div className={`profile-status-indicator ${getStatusIndicatorClass()}`}></div>
                    </div>
                    <div className="profile-user-info">
                      <div className="profile-username">{userData.username}</div>
                    </div>
                  </div>
                  
                  <div className="profile-info">
                    {error && <div className="profile-error">{error}</div>}
                    {friendRequestSent && (
                      <div className="profile-success">Đã gửi lời mời kết bạn thành công!</div>
                    )}
                    
                    <div className="info-group">
                      <div className="info-label">Tên người dùng:</div>
                      <div className="info-value">{userData.username}</div>
                    </div>
                    
                    <div className="info-group">
                      <div className="info-label">Trạng thái:</div>
                      <div className="info-value">{getStatusDisplay()}</div>
                    </div>
                    
                    {isUserLocked && lockInfo && (
                      <div className="locked-account-info">
                        <div className="info-group">
                          <div className="info-label">Thời gian khóa:</div>
                          <div className="info-value">{formatDate(lockInfo.lock_time)}</div>
                        </div>
                      </div>
                    )}
                    
                    {isBlockedByMe && (
                      <div className="blocked-account-info">
                        <div className="info-group">
                          <div className="info-label">Trạng thái:</div>
                          <div className="info-value">Đã chặn người dùng này</div>
                        </div>
                      </div>
                    )}
                    
                    {isBlockingMe && (
                      <div className="blocked-account-info">
                        <div className="info-group">
                          <div className="info-label">Trạng thái:</div>
                          <div className="info-value">Bạn đã bị người dùng này chặn</div>
                        </div>
                      </div>
                    )}
                    
                    {canViewStatus() && !isOnline(userData.status) && userData.last_activity && !isUserLocked && !isBlockedByMe && !isBlockingMe && (
                      <div className="info-group">
                        <div className="info-label">Hoạt động cuối:</div>
                        <div className="info-value">{getLastActivityTime(userData.last_activity)}</div>
                      </div>
                    )}
                    
                    {/* Hiển thị ngày tham gia chỉ khi không phải tài khoản hệ thống */}
                    {!isSystemAccount() && (
                      <div className="info-group">
                        <div className="info-label">Ngày tham gia:</div>
                        <div className="info-value">{formatDate(userData.join_date)}</div>
                      </div>
                    )}

                    {/* Thêm khu vực chứa các nút hành động tập trung */}
                    <div className="user-profile-actions">
                      {renderFriendshipButton()}
                      {renderLockedUserActions()}
                      {renderBlockButton()}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="profile-error">Không thể tải thông tin người dùng.</div>
          )}
        </div>
        
        {/* Modal xác nhận chặn người dùng */}
        {showBlockModal && (
          <div className="block-modal">
            <div className="block-modal-content">
              <h3>Chặn người dùng</h3>
              <p style={{ color: '#000000' }}>Bạn sẽ không nhận được tin nhắn và thông báo từ người dùng này. Người dùng này cũng sẽ không thể nhìn thấy thông tin của bạn.</p>
              
              <div className="form-group">
                <label>Lý do chặn (không bắt buộc):</label>
                <textarea 
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Nhập lý do chặn người dùng này..."
                  maxLength={200}
                />
              </div>
              
              <div className="modal-actions">
                <button 
                  className="cancel-button" 
                  onClick={() => setShowBlockModal(false)}
                  disabled={blockingUser}
                >
                  Hủy
                </button>
                <button 
                  className="block-button"
                  onClick={handleBlockUser}
                  disabled={blockingUser}
                >
                  {blockingUser ? 'Đang xử lý...' : 'Chặn người dùng'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Modal xác nhận bỏ chặn người dùng */}
        <div className="confirm-modal-overlay" style={{ display: showUnblockModal ? 'flex' : 'none' }}>
          <div className="confirm-modal">
            <div className="confirm-modal-header">
              <h3>Xác nhận bỏ chặn</h3>
            </div>
            <div className="confirm-modal-content">
              <p>
                Bạn có chắc chắn muốn bỏ chặn <strong>{userData?.username}</strong>? 
                Người này sẽ có thể nhìn thấy thông tin của bạn và gửi tin nhắn cho bạn.
              </p>
              <div className="confirm-modal-buttons">
                <button 
                  className="confirm-button"
                  style={{ backgroundColor: '#2196F3' }}
                  onClick={handleConfirmUnblock}
                  disabled={blockingUser}
                >
                  {blockingUser ? 'Đang xử lý...' : 'Xác nhận bỏ chặn'}
                </button>
                <button 
                  className="cancel-button"
                  onClick={handleCancelUnblock}
                  disabled={blockingUser}
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Sử dụng component modal xác nhận hủy kết bạn */}
        <ConfirmRemoveFriendModal 
          isOpen={showConfirmModal}
          username={userData?.username}
          isProcessing={removingFriend}
          onConfirm={handleRemoveFriend}
          onCancel={handleCancelRemove}
        />
      </div>
      
      {/* Hiển thị thông báo toast thành công */}
      {successMessage && (
        <SuccessToast 
          message={successMessage} 
          duration={3000}
        />
      )}

      <style>
        {`
        .friendship-request-buttons {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }
        
        .accept-friend-button, .reject-friend-button {
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background-color 0.2s;
        }
        
        .accept-friend-button {
          background-color: #4CAF50;
          color: white;
        }
        
        .accept-friend-button:hover {
          background-color: #3e8e41;
        }
        
        .reject-friend-button {
          background-color: #f44336;
          color: white;
        }
        
        .reject-friend-button:hover {
          background-color: #d32f2f;
        }
        
        .locked-status {
          color: #f44336;
        }
        
        .status-blocked {
          background-color: #f44336;
        }
        
        .blocked-avatar {
          background-color: #f44336;
          color: white;
          position: relative;
        }
        
        .block-user-button, .unblock-user-button {
          width: 100%;
          padding: 10px;
          margin-top: 15px;
          border-radius: 6px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background-color 0.2s;
        }
        
        .block-user-button {
          background-color: #f44336;
          color: white;
        }
        
        .block-user-button:hover {
          background-color: #d32f2f;
        }
        
        .unblock-user-button {
          background-color: #2196F3;
          color: white;
        }
        
        .unblock-user-button:hover {
          background-color: #0b7dda;
        }
        
        .block-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .block-modal-content {
          background-color: white;
          border-radius: 8px;
          padding: 20px;
          width: 90%;
          max-width: 500px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .block-modal-content h3 {
          margin-top: 0;
          color: #f44336;
        }
        
        .form-group {
          margin-bottom: 15px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }
        
        .form-group textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          min-height: 80px;
          resize: vertical;
        }
        
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
        }
        
        .cancel-button, .block-button {
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .cancel-button {
          background-color: #e0e0e0;
          color: #333;
        }
        
        .cancel-button:hover {
          background-color: #d0d0d0;
        }
        
        .block-button {
          background-color: #f44336;
          color: white;
        }
        
        .block-button:hover {
          background-color: #d32f2f;
        }
        `}
      </style>
    </div>
  );
};

export default UserProfileModal; 