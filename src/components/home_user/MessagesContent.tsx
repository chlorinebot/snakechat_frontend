import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import api from '../../services/api';
import type { Conversation, Message } from '../../services/api';
import socketService from '../../services/socketService';
import EmojiPicker from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';
import throttle from 'lodash/throttle';
import { playMessageSound } from '../../utils/sound';

interface MessagesContentProps {
  userId: number;
  currentConversation: Conversation | null;
}

// Tối ưu hiệu suất bằng cách memo hóa các component con
const MessageDate = React.memo(({ date, styles }: { date: string; styles: any }) => {
  const formatMessageDate = useCallback((timeString: string) => {
    const date = new Date(timeString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Hôm nay';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hôm qua';
    } else {
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  }, []);

  return (
    <div className="message-date" style={styles.messageDate}>
      <span className="date-pill" style={styles.datePill}>
        {formatMessageDate(date)}
      </span>
    </div>
  );
});

const MessageAvatar = React.memo(({ sender_name, sender_avatar, isSystem, styles }: {
  sender_name: string;
  sender_avatar?: string;
  isSystem: boolean;
  styles: any;
}) => (
  <div style={{
    ...styles.messageAvatar,
    ...(sender_avatar ? {
      backgroundImage: `url(${sender_avatar})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      color: 'transparent'
    } : {})
  }}>
    {!sender_avatar && (
      isSystem ? (
        <i className="fas fa-wrench" style={{ fontSize: '16px', color: '#0066ff' }}></i>
      ) : (
        sender_name ? sender_name.charAt(0).toUpperCase() : '?'
      )
    )}
  </div>
));

// Tối ưu hiệu suất bằng cách memo hóa các component con
const MessageBubble = React.memo(({ message, isOwnMessage, isSystemMessage, hoveredMessageId, onHover, onReply, styles }: {
  message: Message;
  isOwnMessage: boolean;
  isSystemMessage: boolean;
  hoveredMessageId: number | null;
  onHover: (id: number | null) => void;
  onReply: (message: Message) => void;
  styles: any;
}) => {
  const formatMessageTime = useCallback((timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit', 
      minute: '2-digit'
    });
  }, []);

  const messageStyle = useMemo(() => ({
    ...(isOwnMessage ? styles.messageBubbleOwn : isSystemMessage ? {
      ...styles.messageBubbleOther,
      backgroundColor: '#e9f5ff',
      color: '#333',
      border: '1px solid #d0e8ff'
    } : styles.messageBubbleOther),
    marginTop: '0',
    marginBottom: '0',
  }), [isOwnMessage, isSystemMessage, styles]);

  const timeStyle = useMemo(() => ({
    ...styles.messageTime,
    textAlign: isOwnMessage ? 'right' : 'left',
    ...(hoveredMessageId === message.message_id ? styles.messageTimeVisible : {}),
    margin: '0',
    padding: '0',
  }), [isOwnMessage, hoveredMessageId, message.message_id, styles]);

  return (
    <div 
      className="message-content" 
      style={{
        ...styles.messageContent,
        alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
        margin: '0',
      }}
      onMouseEnter={() => onHover(message.message_id as number)}
      onMouseLeave={() => onHover(null)}
    >
      {message.reply_to && (
        <div style={styles.replyIndicator}>
          <i className="fas fa-reply" style={{ fontSize: '12px' }}></i>
          <span>Trả lời {message.reply_to.sender_name}</span>
          <span style={styles.replyContent}>{message.reply_to.content}</span>
        </div>
      )}
      
      <div 
        className={isOwnMessage ? "message-bubble-own" : "message-bubble-other"}
        style={messageStyle}
      >
        {message.content}
      </div>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginTop: '2px'
      }}>
        <div 
          className="message-time" 
          style={timeStyle}
        >
          {formatMessageTime(message.created_at)}
        </div>
        
        {!isSystemMessage && hoveredMessageId === message.message_id && (
          <button
            onClick={() => onReply(message)}
            style={{
              ...styles.replyButton,
              opacity: 1
            }}
          >
            <i className="fas fa-reply"></i>
            <span>Trả lời</span>
          </button>
        )}
      </div>
    </div>
  );
});

const MessagesContent: React.FC<MessagesContentProps> = ({ userId, currentConversation }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [shouldAutoFocus, setShouldAutoFocus] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentConversationIdRef = useRef<number | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [_isSocketConnected, setIsSocketConnected] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isSystemAccount, setIsSystemAccount] = useState<boolean>(false);
  // Thêm state cho chức năng trả lời tin nhắn
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  // Ref lưu chiều cao trước khi load thêm tin nhắn cũ
  const prevScrollHeightRef = useRef<number>(0);
  // Lazy loading: chỉ hiển thị 20 tin nhắn mỗi trang
  const pageSize = 20;
  const [page, setPage] = useState(0);
  const displayedMessages = useMemo(() => {
    const start = Math.max(messages.length - (page + 1) * pageSize, 0);
    return messages.slice(start);
  }, [messages, page]);

  // Kiểm tra xem có cần hiển thị ngày cho tin nhắn trong lazy load
  const shouldShowDateDisplayed = (index: number) => {
    if (index === 0) return true;
    const curr = new Date(displayedMessages[index].created_at).toDateString();
    const prev = new Date(displayedMessages[index - 1].created_at).toDateString();
    return curr !== prev;
  };

  // Hàm tiện ích để cuộn xuống dưới cùng
  const scrollToBottom = useCallback((smooth = false) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      });
    }
  }, []);

  // Giữ focus vào input khi component mount và sau mỗi lần gửi tin nhắn
  useEffect(() => {
    if (!isBlocked && shouldAutoFocus) {
      // Chỉ focus khi không có element nào khác đang được focus
      if (!document.activeElement || document.activeElement === document.body) {
        inputRef.current?.focus();
      }
    }
  }, [currentConversation, isBlocked, shouldAutoFocus]);

  // Thêm useEffect để duy trì focus sau khi cuộn hoặc các thao tác khác
  useEffect(() => {
    const focusInterval = setInterval(() => {
      // Chỉ focus khi không có element nào khác đang được focus hoặc đang focus vào chính input này
      if (document.activeElement === document.body && !isBlocked && shouldAutoFocus) {
        inputRef.current?.focus();
      }
    }, 300);

    return () => clearInterval(focusInterval);
  }, [isBlocked, shouldAutoFocus]);

  // Thêm xử lý click vào khung chat để giữ focus
  const handleChatAreaClick = () => {
    if (!isBlocked) {
      inputRef.current?.focus();
    }
  };

  // Tải tin nhắn khi chọn cuộc trò chuyện
  useEffect(() => {
    if (currentConversation?.conversation_id) {
      setLoading(true);
      currentConversationIdRef.current = currentConversation.conversation_id;
      
      const loadMessages = async () => {
        try {
          const msgs = await api.getConversationMessages(currentConversation.conversation_id);
          // Chỉ cập nhật tin nhắn nếu vẫn đang ở cùng một cuộc trò chuyện
          if (currentConversationIdRef.current === currentConversation.conversation_id) {
            setMessages(msgs);
            setLoading(false);
            
            // Kiểm tra xem đây có phải là lần đầu tải tin nhắn không
            if (messages.length === 0) {
              // Luôn cuộn xuống dưới cùng khi tải tin nhắn lần đầu
              setTimeout(() => scrollToBottom(false), 100);
            }
            
            // Đảm bảo socket đã kết nối
            if (userId && !socketService.isConnected()) {
              socketService.connect(userId);
            }
          }
        } catch (error) {
          setLoading(false);
        }
      };
      
      loadMessages();
    }
  }, [currentConversation, userId, scrollToBottom]);

  // Lắng nghe sự kiện socket connect và disconnect
  useEffect(() => {
    const handleConnect = () => {
      setIsSocketConnected(true);
      
      // Khi kết nối lại, tải lại tin nhắn của cuộc trò chuyện hiện tại
      if (currentConversationIdRef.current) {
        api.getConversationMessages(currentConversationIdRef.current).then(msgs => {
          // Lưu vị trí cuộn hiện tại
          const scrollPosition = messagesContainerRef.current?.scrollTop || 0;
          const scrollHeight = messagesContainerRef.current?.scrollHeight || 0;
          const clientHeight = messagesContainerRef.current?.clientHeight || 0;
          const wasAtBottom = scrollHeight - scrollPosition - clientHeight < 50;
          
          setMessages(msgs);
          
          // Chỉ cuộn xuống nếu đang ở dưới cùng
          if (wasAtBottom) {
            setTimeout(() => scrollToBottom(false), 100);
          } else if (messagesContainerRef.current) {
            // Nếu không ở dưới cùng, giữ nguyên vị trí cuộn tương đối
            setTimeout(() => {
              if (messagesContainerRef.current) {
                const newScrollHeight = messagesContainerRef.current.scrollHeight;
                const heightDiff = newScrollHeight - scrollHeight;
                messagesContainerRef.current.scrollTop = scrollPosition + heightDiff;
              }
            }, 100);
          }
        }).catch(error => {
          console.error('[ERROR] Lỗi khi tải lại tin nhắn:', error);
        });
      }
    };
    
    const handleDisconnect = () => {
      setIsSocketConnected(false);
    };
    
    // Đăng ký lắng nghe sự kiện kết nối
    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);
    
    // Kiểm tra trạng thái kết nối hiện tại
    setIsSocketConnected(socketService.isConnected());
    
    return () => {
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
    };
  }, [scrollToBottom]);

  // Lắng nghe sự kiện tin nhắn mới với xử lý cải tiến
  useEffect(() => {
    if (!userId) {
      return;
    }
    
    // Đảm bảo socket đã kết nối
    if (!socketService.isConnected()) {
      socketService.connect(userId);
    }

    // Định nghĩa hàm xử lý tin nhắn mới
    const handleNewMessage = (data: any) => {
      // Lấy ID cuộc trò chuyện hiện tại từ ref
      const currentConvId = currentConversationIdRef.current;

      // Chỉ xử lý tin nhắn cho cuộc trò chuyện hiện tại
      if (data.conversation_id === currentConvId) {
        // Tạo đối tượng tin nhắn mới
        const newMessage: Message = {
          ...data,
          is_read: data.sender_id === userId ? false : true
        };
        
        // Kiểm tra xem tin nhắn này có phải do người dùng hiện tại gửi không
        const isSentByCurrentUser = data.sender_id === userId;
        
        // Lưu vị trí cuộn hiện tại
        const el = messagesContainerRef.current;
        const isNearBottom = el && el.scrollHeight - el.scrollTop - el.clientHeight < 50;
        
        // Cập nhật danh sách tin nhắn
        setMessages(prevMessages => {
          // Kiểm tra xem tin nhắn đã tồn tại chưa
          const messageId = typeof newMessage.message_id === 'string' 
            ? newMessage.message_id 
            : newMessage.message_id.toString();
            
          const exists = prevMessages.some(msg => {
            const msgId = typeof msg.message_id === 'string' 
              ? msg.message_id 
              : msg.message_id.toString();
            return msgId === messageId;
          });
          
          if (exists) {
            return prevMessages;
          } else {
            // Loại bỏ tin nhắn tạm thời nếu có (trong trường hợp người gửi là người dùng hiện tại)
            if (isSentByCurrentUser) {
              return prevMessages
                .filter(msg => {
                  const msgId = msg.message_id.toString();
                  return !(msgId.startsWith('temp_') && msg.content === newMessage.content);
                })
                .concat(newMessage);
            }
            return [...prevMessages, newMessage];
          }
        });
        
        // Chỉ cuộn xuống dưới trong 2 trường hợp:
        // 1. Người dùng đang ở gần dưới cùng (isNearBottom)
        // 2. Tin nhắn do chính người dùng hiện tại gửi (isSentByCurrentUser)
        setTimeout(() => {
          if (isNearBottom || isSentByCurrentUser) {
            scrollToBottom(true);
          }
        }, 100);
        
        // Đánh dấu đã đọc nếu là tin nhắn từ người khác
        if (!isSentByCurrentUser && document.visibilityState === 'visible') {
          api.markMessageAsRead(data.message_id)
            .then(() => {
              socketService.emit('message_read', {
                conversation_id: data.conversation_id,
                reader_id: userId,
                message_ids: [data.message_id]
              });
            })
            .catch(err => console.error('[ERROR] Lỗi khi đánh dấu tin nhắn đã đọc:', err));
        }
      }
    };

    // Định nghĩa hàm xử lý sự kiện kết nối thành công
    const handleConnectionSuccess = (_: any) => {
      setIsSocketConnected(true);
      
      // Nếu đã có cuộc trò chuyện hiện tại, đăng ký lắng nghe sự kiện
      if (currentConversationIdRef.current) {
        api.getConversationMessages(currentConversationIdRef.current)
          .then(msgs => {
            if (currentConversationIdRef.current) {
              // Lưu vị trí cuộn hiện tại
              const scrollPosition = messagesContainerRef.current?.scrollTop || 0;
              const scrollHeight = messagesContainerRef.current?.scrollHeight || 0;
              const clientHeight = messagesContainerRef.current?.clientHeight || 0;
              const wasAtBottom = scrollHeight - scrollPosition - clientHeight < 50;
              
              setMessages(msgs);
              
              // Chỉ cuộn xuống nếu đang ở dưới cùng
              if (wasAtBottom) {
                setTimeout(() => scrollToBottom(false), 100);
              } else if (messagesContainerRef.current) {
                // Nếu không ở dưới cùng, giữ nguyên vị trí cuộn tương đối
                setTimeout(() => {
                  if (messagesContainerRef.current) {
                    const newScrollHeight = messagesContainerRef.current.scrollHeight;
                    const heightDiff = newScrollHeight - scrollHeight;
                    messagesContainerRef.current.scrollTop = scrollPosition + heightDiff;
                  }
                }, 100);
              }
            }
          })
          .catch(error => {
            console.error('[ERROR] Lỗi khi tải lại tin nhắn:', error);
          });
      }
      
      // Bắt đầu ping định kỳ
      startPinging();
    };
    
    // Ping định kỳ để giữ kết nối socket
    const pingInterval = setInterval(() => {
      if (socketService.isConnected()) {
        socketService.emit('ping', { timestamp: new Date().toISOString() });
      }
    }, 30000); // Ping mỗi 30 giây
    
    const startPinging = () => {
      socketService.emit('ping', { timestamp: new Date().toISOString() });
    };
    
    // Lắng nghe phản hồi ping
    const handlePong = (_: any) => {
    };

    // Đăng ký lắng nghe các sự kiện
    socketService.on('new_message', handleNewMessage);
    socketService.on('connection_success', handleConnectionSuccess);
    socketService.on('pong', handlePong);
    
    // Cleanup khi component unmount
    return () => {
      socketService.off('new_message', handleNewMessage);
      socketService.off('connection_success', handleConnectionSuccess);
      socketService.off('pong', handlePong);
      clearInterval(pingInterval);
    };
  }, [userId, scrollToBottom]);

  // Lắng nghe sự kiện tin nhắn đã đọc
  useEffect(() => {
    const handleMessageReadReceipt = (data: any) => {
      if (data.conversation_id === currentConversationIdRef.current) {
        if (data.message_ids && Array.isArray(data.message_ids)) {
          // Trường hợp nhận danh sách tin nhắn cụ thể đã đọc
          setMessages(prevMessages => 
            prevMessages.map(msg => {
              // Nếu tin nhắn nằm trong danh sách message_ids và từ người dùng hiện tại
              if (data.message_ids.includes(msg.message_id) && msg.sender_id === userId) {
                return { ...msg, is_read: true };
              }
              return msg;
            })
          );
        } else {
          // Trường hợp nhận thông báo đã đọc tất cả tin nhắn đến thời điểm cụ thể (read_at)
          const readTime = data.read_at ? new Date(data.read_at) : new Date();
          
          setMessages(prevMessages => 
            prevMessages.map(msg => {
              // Đánh dấu đã đọc cho tất cả tin nhắn từ người dùng hiện tại và gửi trước thời điểm đọc
              if (msg.sender_id === userId && new Date(msg.created_at) <= readTime) {
                return { ...msg, is_read: true };
              }
              return msg;
            })
          );
        }
        
        // Thêm hiệu ứng chuyển động mềm mại khi có tin nhắn được đánh dấu đã đọc
        setTimeout(() => {
          const messageElements = document.querySelectorAll('.message-status-container');
          messageElements.forEach(el => {
            el.classList.add('status-updated');
            setTimeout(() => el.classList.remove('status-updated'), 1000);
          });
        }, 100);
      }
    };

    socketService.on('message_read_receipt', handleMessageReadReceipt);

    return () => {
      socketService.off('message_read_receipt', handleMessageReadReceipt);
    };
  }, [userId, currentConversation?.conversation_id]);

  // Khi mở cuộc trò chuyện, đánh dấu tất cả tin nhắn chưa đọc là đã đọc
  useEffect(() => {
    // Chỉ xử lý khi có cuộc trò chuyện và có tin nhắn
    if (currentConversation?.conversation_id && messages.length > 0 && userId) {
      const unreadMessages = messages.filter(msg => 
        msg.sender_id !== userId && // Tin nhắn từ người khác
        !msg.is_read // Chưa được đọc
      );

      if (unreadMessages.length > 0) {
        try {
          // Sử dụng API để đánh dấu tất cả tin nhắn là đã đọc
          api.markAllMessagesAsRead(
            currentConversation.conversation_id, 
            userId
          ).then(() => {
            // Cập nhật trạng thái tin nhắn hiện tại
            setMessages(prevMessages => prevMessages.map(msg => {
              if (msg.sender_id !== userId) {
                return { ...msg, is_read: true };
              }
              return msg;
            }));

            // Thông báo cho người gửi biết tin nhắn đã được đọc
            socketService.emit('message_read', {
              conversation_id: currentConversation.conversation_id,
              reader_id: userId,
              message_ids: unreadMessages.map(msg => msg.message_id)
            });
          }).catch(error => {
            console.error('Lỗi khi đánh dấu tin nhắn là đã đọc:', error);
          });
        } catch (error) {
          console.error('Lỗi khi đánh dấu tin nhắn là đã đọc:', error);
        }
      }
    }
  }, [currentConversation?.conversation_id, messages, userId]);

  // Load tin nhắn khi mở cuộc trò chuyện
  useEffect(() => {
    if (currentConversation) {
      setLoading(true);
      currentConversationIdRef.current = currentConversation.conversation_id;

      const loadMessages = async () => {
        try {
          const messages = await api.getConversationMessages(currentConversation.conversation_id);
          setMessages(messages);
          
          // Lấy thông tin trạng thái đã đọc của các tin nhắn
          if (userId) {
            loadReadStatus();
          }
        } catch (error) {
          console.error('Lỗi khi tải tin nhắn từ cuộc trò chuyện:', error);
        } finally {
          setLoading(false);
        }
      };
      
      loadMessages();
    }
  }, [currentConversation, userId]);
  
  // Hàm để tải trạng thái đã đọc của tin nhắn
  const loadReadStatus = async () => {
    if (!currentConversation || !userId) return;
    
    try {
      const response = await api.getMessageReadStatus(currentConversation.conversation_id, userId);
      
      if (response.success && response.read_statuses) {
        // Cập nhật trạng thái đã đọc cho các tin nhắn
        setMessages(prevMessages => 
          prevMessages.map(msg => {
            // Tìm trạng thái đã đọc cho tin nhắn hiện tại
            const readStatus = response.read_statuses.find(
              (status: { message_id: number; is_read: number }) => status.message_id === msg.message_id
            );
            
            if (readStatus && msg.sender_id === userId) {
              return { ...msg, is_read: readStatus.is_read === 1 };
            }
            return msg;
          })
        );
      }
    } catch (error) {
      console.error('Lỗi khi tải trạng thái đã đọc:', error);
    }
  };
  
  // Giữ cập nhật conversation_id trong ref khi có thay đổi
  useEffect(() => {
    if (currentConversation?.conversation_id) {
      currentConversationIdRef.current = currentConversation.conversation_id;
    }
  }, [currentConversation?.conversation_id]);

  // Debug theo dõi socket connection
  useEffect(() => {
    const intervalId = setInterval(() => {
    }, 10000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Force connect socket khi component được mount
  useEffect(() => {
    if (userId && !socketService.isConnected()) {
      socketService.connect(userId);
    }
  }, [userId]);

  // Kiểm tra trạng thái chặn khi chuyển cuộc trò chuyện
  useEffect(() => {
    if (currentConversation?.conversation_type === 'personal' && currentConversation.members) {
      const otherMember = currentConversation.members.find(member => member.user_id !== userId);
      const otherUserId = otherMember?.user_id;
      if (otherUserId) {
        Promise.all([
          api.checkBlockStatus(userId, otherUserId),
          api.checkBlockStatus(otherUserId, userId)
        ])
        .then(([res1, res2]) => {
          setIsBlocked(!!(res1.isBlocking || res2.isBlocking));
        })
        .catch(error => console.error('[BLOCK] Lỗi kiểm tra trạng thái chặn:', error));
      }
    } else {
      setIsBlocked(false);
    }
  }, [currentConversation, userId]);

  // Thêm useEffect để kiểm tra xem cuộc trò chuyện hiện tại có phải với tài khoản hệ thống không
  useEffect(() => {
    if (currentConversation?.conversation_type === 'personal' && currentConversation.members) {
      // Tìm thành viên khác không phải người dùng hiện tại
      const otherMember = currentConversation.members.find(member => member.user_id !== userId);
      
      // Kiểm tra xem người dùng kia có phải là tài khoản hệ thống (ID: 1) không
      if (otherMember && otherMember.user_id === 1) {
        setIsSystemAccount(true);
      } else {
        setIsSystemAccount(false);
      }
    } else {
      setIsSystemAccount(false);
    }
  }, [currentConversation, userId]);

  // Thêm hàm xử lý khi bấm nút trả lời
  const handleReply = (message: Message) => {
    setReplyingTo(message);
    inputRef.current?.focus();
  };

  // Thêm hàm hủy trả lời
  const cancelReply = () => {
    setReplyingTo(null);
  };

  // Cập nhật hàm gửi tin nhắn để hỗ trợ trả lời
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage || !currentConversation || !userId) return;
    
    try {
      setSending(true);
      const tempMessageId = `temp_${Date.now()}`;
      
      const tempMessage: Message = {
        message_id: tempMessageId as unknown as number,
        conversation_id: currentConversation.conversation_id,
        sender_id: userId,
        sender_name: 'Bạn',
        content: trimmedMessage,
        message_type: 'text',
        created_at: new Date().toISOString(),
        is_read: false,
        send_failed: false,
        reply_to: replyingTo ? {
          message_id: replyingTo.message_id,
          content: replyingTo.content,
          sender_name: replyingTo.sender_name
        } : undefined
      };

      setMessages(prevMessages => [...prevMessages, tempMessage]);
      setNewMessage('');
      setReplyingTo(null); // Reset trạng thái trả lời sau khi gửi

      setTimeout(() => {
        if (document.activeElement === document.body || document.activeElement === inputRef.current) {
          inputRef.current?.focus();
        }
      }, 0);

      setTimeout(() => scrollToBottom(true), 10);
      
      const response = await api.sendMessage({
        conversation_id: currentConversation.conversation_id,
        sender_id: userId,
        content: trimmedMessage,
        message_type: 'text',
        reply_to_message_id: replyingTo?.message_id // Thêm ID tin nhắn được trả lời
      }, 3);
      
      setSending(false);
      
      if (response.success && response.data) {
        setMessages(prevMessages => prevMessages.map(msg => {
          const msgId = msg.message_id.toString();
          if (msgId === tempMessageId) {
            return response.data;
          }
          return msg;
        }));
      } else {
        console.error('[SEND] Gửi tin nhắn không thành công:', response);
        setMessages(prevMessages => prevMessages.map(msg => {
          const msgId = msg.message_id.toString();
          if (msgId === tempMessageId) {
            return { ...msg, send_failed: true };
          }
          return msg;
        }));
      }
    } catch (error) {
      console.error('[SEND] Lỗi khi gửi tin nhắn:', error);
      setSending(false);
      
      setMessages(prevMessages => prevMessages.map(msg => {
        const msgId = msg.message_id.toString();
        if (typeof msgId === 'string' && msgId.startsWith('temp_')) {
          return { ...msg, send_failed: true };
        }
        return msg;
      }));
    }
  };

  // Xử lý phím Enter
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Ngăn không cho xuống dòng
      handleSendMessage(e);
    }
  };

  // Định dạng thời gian
  const formatMessageTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  // Kiểm tra xem tin nhắn có cần hiển thị ngày không
  const shouldShowDate = (message: Message, index: number) => {
    if (index === 0) return true;
    
    const currentDate = new Date(message.created_at).toDateString();
    const previousDate = new Date(messages[index - 1].created_at).toDateString();
    
    return currentDate !== previousDate;
  };

  // Kiểm tra xem tin nhắn có phải của mình không
  const isOwnMessage = (message: Message) => {
    return message.sender_id === userId;
  };

  // Kiểm tra xem tin nhắn có phải là tin nhắn cuối cùng của người dùng
  const isLastMessageFromUser = (message: Message) => {
    if (!isOwnMessage(message)) return false;
    
    // Tìm tin nhắn cuối cùng được gửi bởi người dùng hiện tại
    const lastMessageFromUser = [...messages]
      .reverse()
      .find(msg => msg.sender_id === userId);
      
    return lastMessageFromUser && lastMessageFromUser.message_id === message.message_id;
  };

  // Kiểm tra xem tin nhắn có phải là tin nhắn mới nhất đã được xem không
  const isLastReadMessage = (message: Message) => {
    if (!isOwnMessage(message) || !message.is_read) return false;
    
    // Tìm tin nhắn đã đọc cuối cùng từ người dùng hiện tại
    const userMessages = messages.filter(msg => 
      msg.sender_id === userId && 
      !msg.message_id.toString().includes('temp_') // Loại bỏ tin nhắn tạm
    );
    const readMessages = userMessages.filter(msg => msg.is_read);
    
    if (readMessages.length === 0) return false;
    
    // Sắp xếp theo thời gian gửi, lấy tin nhắn mới nhất
    const sortedReadMessages = [...readMessages].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    return sortedReadMessages[0].message_id === message.message_id;
  };

  // Styles cho khung chat
  const styles = {
    messagesContent: {
      display: 'flex',
      flexDirection: 'column' as const,
      height: '100%',
      position: 'relative' as const,
      overflowX: 'hidden' as const,
      overflowY: 'visible' as const,
    },
    emptyState: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      margin: 'auto',
      textAlign: 'center' as const,
      padding: '40px 20px',
      flex: 1,
      height: '100%',
      background: '#fbfbfb', // Thêm màu nền nhẹ
    },
    emptyIcon: {
      width: '100px',
      height: '100px',
      margin: '0 auto 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f0f0f0', // Thêm màu nền cho icon
      borderRadius: '50%',
      padding: '15px',
    },
    emptyText: {
      fontWeight: 500,
      fontSize: '18px',
      marginBottom: '10px',
      color: '#333', // Màu đậm hơn cho dễ đọc
    },
    emptyDescription: {
      fontSize: '15px',
      color: '#666', // Màu đậm hơn chút
      maxWidth: '300px',
      lineHeight: '1.5',
    },
    chatArea: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '20px 30px',
      scrollbarWidth: 'thin' as const,
      msOverflowStyle: 'none' as const,
    },
    messagesList: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '2px',
      width: '100%',
    },
    messageDate: {
      textAlign: 'center' as const,
      margin: '16px 0 8px 0',
      fontSize: '13px',
      color: '#000000',
      fontWeight: '600',
      position: 'relative' as const,
      '&::before': {
        content: '""',
        position: 'absolute',
        left: '0',
        right: '0',
        top: '50%',
        height: '1px',
        backgroundColor: '#e4e6eb',
        zIndex: 0,
      }
    },
    datePill: {
      backgroundColor: '#ffffff',
      padding: '6px 16px',
      borderRadius: '16px',
      display: 'inline-block',
      position: 'relative' as const,
      zIndex: 1,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      border: '1px solid #e4e6eb',
      fontWeight: '600',
      color: '#000000',
      fontSize: '13px',
      letterSpacing: '0.3px',
    },
    messageRow: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: '8px',
      marginBottom: '2px',
      width: '100%',
      padding: '4px 0',
      transition: 'all 0.2s ease',
    },
    messageAvatar: {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      backgroundColor: '#e3f2fd',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#0066ff',
      flexShrink: 0,
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      border: '2px solid #ffffff',
    },
    messageContent: {
      display: 'flex',
      flexDirection: 'column' as const,
      maxWidth: '65%',
      gap: '2px',
    },
    inputArea: {
      padding: '15px',
      borderTop: '1px solid #eaeaea', // Border mỏng hơn
      backgroundColor: 'white',
    },
    inputForm: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      maxHeight: '100px', // Giới hạn chiều cao
    },
    messageInput: {
      flex: 1,
      padding: '12px 15px',
      borderRadius: '24px',
      border: '1px solid #ddd',
      outline: 'none',
      fontSize: '14px',
      backgroundColor: '#f5f5f5',
      maxHeight: '80px', // Giới hạn chiều cao
      overflowY: 'auto' as const,
      color: '#000000', // Màu chữ đen
      caretColor: '#0066ff', // Màu con trỏ xanh nổi bật hơn
      transition: 'all 0.2s ease-in-out', // Thêm hiệu ứng mượt mà
      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)', // Thêm hiệu ứng shadow bên trong
      '&:focus': {
        border: '1px solid #b3d7ff',
        backgroundColor: '#ffffff',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05), 0 0 0 3px rgba(0,102,255,0.1)',
      },
    },
    sendButton: {
      backgroundColor: '#0066ff',
      color: 'white',
      border: 'none',
      borderRadius: '50%',
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 6px rgba(0,102,255,0.3)',
      transform: 'scale(1)',
      '&:hover': {
        backgroundColor: '#0055dd',
        transform: 'scale(1.05)',
        boxShadow: '0 4px 8px rgba(0,102,255,0.4)',
      },
      '&:active': {
        transform: 'scale(0.95)',
        boxShadow: '0 1px 3px rgba(0,102,255,0.3)',
      },
    },
    loadingMessages: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: '#888',
    },
    messageBubbleOwn: {
      backgroundColor: '#0066ff',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '18px 18px 4px 18px',
      maxWidth: '100%',
      alignSelf: 'flex-end' as const,
      wordBreak: 'break-word' as const,
      position: 'relative' as const,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      whiteSpace: 'pre-wrap' as const,
      overflowWrap: 'break-word' as const,
      display: 'inline-block' as const,
      width: 'fit-content' as const,
      margin: '1px 0',
      fontSize: '15px',
      lineHeight: '1.4',
      transition: 'all 0.2s ease',
    },
    messageBubbleOther: {
      backgroundColor: '#f0f2f5',
      color: '#000000',
      padding: '12px 16px',
      borderRadius: '18px 18px 18px 4px',
      maxWidth: '100%',
      alignSelf: 'flex-start' as const,
      wordBreak: 'break-word' as const,
      position: 'relative' as const,
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      whiteSpace: 'pre-wrap' as const,
      overflowWrap: 'break-word' as const,
      display: 'inline-block' as const,
      width: 'fit-content' as const,
      margin: '1px 0',
      fontSize: '15px',
      lineHeight: '1.4',
      transition: 'all 0.2s ease',
    },
    messageTime: {
      fontSize: '11px',
      color: '#8e8e8e',
      marginTop: '4px',
      opacity: 0,
      transition: 'opacity 0.2s ease',
      padding: '0 4px',
      fontWeight: '500',
    },
    messageTimeVisible: {
      opacity: 1,
    },
    messageStatus: {
      fontSize: '11px',
      color: '#8e8e8e',
      marginTop: '2px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: '4px',
      transition: 'all 0.3s ease',
      padding: '0 4px',
      fontWeight: '500',
    },
    statusActive: {
      color: '#0066ff',
    },
    emojiButton: {
      backgroundColor: 'transparent',
      border: 'none',
      borderRadius: '50%',
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      color: '#666',
      fontSize: '20px',
      padding: 0,
      '&:hover': {
        backgroundColor: '#f0f0f0',
        color: '#0066ff',
        transform: 'scale(1.05)',
      },
      '&:active': {
        transform: 'scale(0.95)',
        backgroundColor: '#e8e8e8',
      },
    },
    emojiPickerContainer: {
      position: 'absolute' as const,
      bottom: '80px',
      left: '15px',
      zIndex: 1000,
      transform: 'translateY(0)',
      opacity: 1,
      transition: 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out',
      animation: 'emojiPickerFadeIn 0.3s ease-in-out',
      boxShadow: '0 12px 28px rgba(0, 0, 0, 0.2), 0 8px 16px rgba(0, 0, 0, 0.1)',
      borderRadius: '16px',
    },
    messageContainer: {
      display: 'flex',
      flexDirection: 'column' as const,
      position: 'relative' as const,
      cursor: 'default',
    },
    statusIcon: {
      width: '16px',
      height: '16px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease',
    },
    statusText: {
      fontSize: '11px',
      color: '#8e8e8e',
      transition: 'color 0.3s ease',
      fontWeight: '500',
    },
    replyButton: {
      backgroundColor: 'transparent',
      border: 'none',
      padding: '4px 8px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      color: '#666',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      opacity: 0,
      transition: 'all 0.2s ease',
      '&:hover': {
        backgroundColor: 'rgba(0,0,0,0.05)',
        color: '#0066ff'
      }
    },
    replyPreview: {
      display: 'flex',
      alignItems: 'center',
      padding: '8px 12px',
      backgroundColor: '#f0f2f5',
      borderRadius: '8px',
      marginBottom: '8px',
      gap: '8px'
    },
    replyPreviewContent: {
      flex: 1,
      fontSize: '13px',
      color: '#666'
    },
    replyPreviewClose: {
      backgroundColor: 'transparent',
      border: 'none',
      padding: '4px',
      cursor: 'pointer',
      color: '#666',
      borderRadius: '50%',
      '&:hover': {
        backgroundColor: 'rgba(0,0,0,0.05)'
      }
    },
    replyIndicator: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '13px',
      color: '#666',
      marginBottom: '4px'
    },
    replyContent: {
      fontSize: '13px',
      color: '#666',
      textDecoration: 'none',
      cursor: 'pointer',
      '&:hover': {
        textDecoration: 'underline'
      }
    }
  };

  // Hàm render biểu tượng trạng thái
  const renderStatusIcon = (status: 'sending' | 'sent' | 'read' | 'failed') => {
    switch (status) {
      case 'sending':
        return (
          <svg style={styles.statusIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#888" strokeWidth="2" strokeDasharray="30" strokeDashoffset="0">
              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
            </circle>
          </svg>
        );
      case 'sent':
        return (
          <svg style={styles.statusIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12L10 17L19 8" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'read':
        return (
          <svg style={{...styles.statusIcon, color: '#0066ff'}} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 12L7 17L15 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 12L15 17L22 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'failed':
        return (
          <svg style={{...styles.statusIcon, color: '#e74c3c'}} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      default:
        return null;
    }
  };

  // Hàm hiển thị trạng thái tin nhắn
  const renderMessageStatus = (message: Message) => {
    // Tin nhắn người khác sẽ không hiển thị trạng thái
    if (!isOwnMessage(message)) return null;

    // Nếu là tin nhắn tạm thời (đang gửi)
    if (typeof message.message_id === 'string' || message.message_id.toString().includes('temp_')) {
      return (
        <div className="message-status-container" style={styles.messageStatus}>
          {renderStatusIcon('sending')}
          <span style={styles.statusText}>Đang gửi</span>
        </div>
      );
    }

    // Nếu tin nhắn có lỗi, hiển thị trạng thái lỗi cho tất cả tin nhắn
    if (message.send_failed) {
      return (
        <div className="message-status-container" style={styles.messageStatus}>
          {renderStatusIcon('failed')}
          <span style={{...styles.statusText, color: '#e74c3c'}}>Gửi không thành công</span>
        </div>
      );
    }

    // Tin nhắn đã được xem - chỉ hiển thị trạng thái tại tin nhắn mới nhất đã được xem
    if (isLastReadMessage(message)) {
      return (
        <div className="message-status-container" style={{...styles.messageStatus, opacity: 1}}>
          {renderStatusIcon('read')}
          <span style={{...styles.statusText, ...styles.statusActive}}>Đã xem</span>
        </div>
      );
    }

    // Chỉ hiển thị trạng thái "Đã gửi" cho tin nhắn cuối cùng chưa được xem
    if (isLastMessageFromUser(message) && !message.is_read) {
      return (
        <div className="message-status-container" style={{...styles.messageStatus, opacity: 1}}>
          {renderStatusIcon('sent')}
          <span style={styles.statusText}>Đã gửi</span>
        </div>
      );
    }

    // Các tin nhắn khác không hiển thị trạng thái
    return null;
  };

  useEffect(() => {
    const styleId = 'custom-emoji-picker-styles';
    document.getElementById(styleId)?.remove();

    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.innerHTML = `
      /* Tùy chỉnh toàn bộ emoji picker */
      .EmojiPickerReact {
        --epr-hover-bg-color: rgba(0, 0, 0, 0.05) !important;
        --epr-focus-bg-color: rgba(0, 0, 0, 0.05) !important;
        --epr-highlight-color: #007bff !important;
        --epr-search-border-color: #e0e4e8 !important;
        
        background-color: #ffffff !important;
        border: none !important;
        border-radius: 16px !important;
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.08) !important;
        transition: all 0.2s ease-in-out !important;
        overflow: hidden !important;
      }

      /* Tùy chỉnh thanh tìm kiếm */
      .EmojiPickerReact .epr-search {
        background: #f8f9fa !important;
        border: 1px solid #e0e4e8 !important;
        border-radius: 12px !important;
        margin: 12px !important;
        padding: 8px 12px !important;
        font-size: 14px !important;
        transition: all 0.2s ease !important;
      }

      .EmojiPickerReact .epr-search:focus {
        border-color: var(--epr-highlight-color) !important;
        box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1) !important;
      }

      /* Tùy chỉnh thanh danh mục */
      .EmojiPickerReact .epr-category-nav {
        padding: 8px !important;
        background: linear-gradient(to bottom, #ffffff, #f8f9fa) !important;
        border-bottom: 1px solid #e0e4e8 !important;
      }

      .EmojiPickerReact .epr-category-nav .epr-cat-btn {
        opacity: 0.5 !important;
        transition: all 0.2s ease !important;
        padding: 6px !important;
        border-radius: 8px !important;
      }

      .EmojiPickerReact .epr-category-nav .epr-cat-btn:hover {
        opacity: 0.8 !important;
        background-color: rgba(0, 0, 0, 0.05) !important;
      }

      .EmojiPickerReact .epr-category-nav .epr-cat-btn.active {
        opacity: 1 !important;
        background-color: rgba(0, 123, 255, 0.1) !important;
      }

      /* Tùy chỉnh khu vực emoji */
      .EmojiPickerReact .epr-body {
        padding: 8px !important;
      }

      .EmojiPickerReact .epr-emoji-category-label {
        background: transparent !important;
        font-weight: 600 !important;
        font-size: 13px !important;
        color: #495057 !important;
        padding: 8px 12px !important;
        position: sticky !important;
        top: 0 !important;
        backdrop-filter: blur(8px) !important;
      }

      /* Tùy chỉnh từng emoji */
      .EmojiPickerReact .epr-emoji {
        border-radius: 8px !important;
        transition: all 0.15s ease-in-out !important;
        cursor: pointer !important;
      }

      .EmojiPickerReact .epr-emoji:hover {
        background-color: rgba(0, 0, 0, 0.05) !important;
        transform: scale(1.2) !important;
        z-index: 1 !important;
      }

      /* Tùy chỉnh preview */
      .EmojiPickerReact .epr-preview {
        border-top: 1px solid #e0e4e8 !important;
        background: linear-gradient(to bottom, #f8f9fa, #ffffff) !important;
        padding: 12px !important;
      }

      .EmojiPickerReact .epr-preview-emoji {
        font-size: 32px !important;
      }

      .EmojiPickerReact .epr-preview-data {
        font-size: 13px !important;
        color: #495057 !important;
      }

      /* Tùy chỉnh thanh cuộn */
      .EmojiPickerReact .epr-body::-webkit-scrollbar {
        width: 8px !important;
      }

      .EmojiPickerReact .epr-body::-webkit-scrollbar-track {
        background: transparent !important;
      }

      .EmojiPickerReact .epr-body::-webkit-scrollbar-thumb {
        background-color: #d1d5db !important;
        border-radius: 20px !important;
        border: 2px solid transparent !important;
        background-clip: content-box !important;
      }

      .EmojiPickerReact .epr-body::-webkit-scrollbar-thumb:hover {
        background-color: #9ca3af !important;
      }

      /* Hiệu ứng hover cho toàn bộ picker */
      .emoji-picker-container {
        transition: transform 0.2s ease-in-out !important;
      }

      .emoji-picker-container:hover {
        transform: translateY(-2px) !important;
      }
    `;
    document.head.appendChild(styleElement);

    return () => {
      document.getElementById(styleId)?.remove();
    };
  }, []);

  // Thêm useEffect để tự động làm mới trạng thái đã xem tin nhắn
  useEffect(() => {
    if (!currentConversation?.conversation_id || !userId) return;

    // Hàm để làm mới trạng thái đã đọc tin nhắn
    const refreshReadStatus = async () => {
      try {
        const response = await api.getMessageReadStatus(currentConversation.conversation_id, userId);
        
        if (response.success && response.read_statuses) {
          // Cập nhật trạng thái đã đọc cho các tin nhắn
          setMessages(prevMessages => 
            prevMessages.map(msg => {
              // Tìm trạng thái đã đọc cho tin nhắn hiện tại
              const readStatus = response.read_statuses.find(
                (status: { message_id: number; is_read: number }) => status.message_id === msg.message_id
              );
              
              if (readStatus && msg.sender_id === userId) {
                return { ...msg, is_read: readStatus.is_read === 1 };
              }
              return msg;
            })
          );
        }
      } catch (error) {
        console.error('Lỗi khi làm mới trạng thái đã đọc:', error);
      }
    };

    // Thiết lập interval để làm mới trạng thái đọc định kỳ (mỗi 5 giây)
    const intervalId = setInterval(() => {
      refreshReadStatus();
    }, 500);

    // Làm mới trạng thái đọc ngay khi component mount
    refreshReadStatus();

    return () => {
      clearInterval(intervalId);
    };
  }, [currentConversation?.conversation_id, userId]);

  // Xử lý cập nhật trạng thái khi người dùng truy cập lại tab
  useEffect(() => {
    // Hàm cập nhật trạng thái khi tab được kích hoạt lại
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentConversation?.conversation_id) {
        // Cập nhật trạng thái đọc tin nhắn
        if (userId) {
          loadReadStatus();
        }
        
        // Xử lý các tin nhắn chưa đọc
        const unreadMessages = messages.filter(msg => 
          msg.sender_id !== userId && // Tin nhắn từ người khác
          !msg.is_read // Chưa được đọc
        );

        if (unreadMessages.length > 0) {
          try {
            // Sử dụng API để đánh dấu tất cả tin nhắn là đã đọc
            api.markAllMessagesAsRead(currentConversation.conversation_id, userId)
              .then(() => {
                // Cập nhật trạng thái tin nhắn hiện tại
                setMessages(prevMessages => prevMessages.map(msg => {
                  if (msg.sender_id !== userId) {
                    return { ...msg, is_read: true };
                  }
                  return msg;
                }));

                // Thông báo cho người gửi biết tin nhắn đã được đọc
                socketService.emit('message_read', {
                  conversation_id: currentConversation.conversation_id,
                  reader_id: userId,
                  message_ids: unreadMessages.map(msg => msg.message_id)
                });
              });
          } catch (error) {
            console.error('Lỗi khi đánh dấu tin nhắn là đã đọc:', error);
          }
        }
      }
    };

    // Thêm event listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentConversation?.conversation_id, messages, userId]);

  // Debug: Kiểm tra cập nhật tin nhắn
  useEffect(() => {
  }, [messages, userId]);

  // Tự động làm mới tin nhắn mới trong cuộc trò chuyện hiện tại
  useEffect(() => {
    if (!currentConversation?.conversation_id) return;
    const intervalId = setInterval(() => {
      api.getConversationMessages(currentConversation.conversation_id)
        .then(msgs => {
          // Kiểm tra xem có tin nhắn mới không
          if (msgs.length > messages.length) {
            // Lưu trạng thái cuộn hiện tại
            const scrollPosition = messagesContainerRef.current?.scrollTop || 0;
            const scrollHeight = messagesContainerRef.current?.scrollHeight || 0;
            const clientHeight = messagesContainerRef.current?.clientHeight || 0;
            const wasAtBottom = scrollHeight - scrollPosition - clientHeight < 50;
            
            // Cập nhật tin nhắn
            setMessages(msgs);
            
            // Nếu không ở đáy, giữ nguyên vị trí cuộn
            if (!wasAtBottom && messagesContainerRef.current) {
              // Dùng setTimeout để đảm bảo DOM đã được cập nhật
              setTimeout(() => {
                if (messagesContainerRef.current) {
                  const newScrollHeight = messagesContainerRef.current.scrollHeight;
                  const heightDiff = newScrollHeight - scrollHeight;
                  messagesContainerRef.current.scrollTop = scrollPosition + heightDiff;
                }
              }, 0);
            }
          } else {
            // Không có tin nhắn mới, cập nhật bình thường
            setMessages(msgs);
          }
        })
        .catch(() => {});
    }, 5000); // 5 giây

    return () => {
      clearInterval(intervalId);
    };
  }, [currentConversation?.conversation_id, messages.length]);

  // Tự động cuộn xuống khi có tin nhắn mới và đang ở đáy
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom(false);
    }
  }, [messages, scrollToBottom, isAtBottom]);

  // Thêm emoji vào tin nhắn
  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    // Đợi một chút trước khi bật lại auto focus và focus vào input
    setTimeout(() => {
      setShouldAutoFocus(true);
      inputRef.current?.focus();
    }, 100);
  };

  // Đóng emoji picker khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Kiểm tra xem người dùng có đang tương tác với emoji picker hay không
      const isEmojiPickerInteraction = target.closest('.emoji-picker-react') || 
                                      target.closest('.EmojiPickerReact') ||
                                      target.closest('.emoji-picker-container') ||
                                      target.closest('.emoji-button');
      
      // Nếu đang tương tác với emoji picker, tắt auto focus
      if (isEmojiPickerInteraction) {
        setShouldAutoFocus(false);
        return;
      }
      
      // Nếu click ra ngoài emoji picker, đóng picker và bật lại auto focus
      if (!isEmojiPickerInteraction && showEmojiPicker) {
        setShowEmojiPicker(false);
        // Đợi một chút trước khi bật lại auto focus
        setTimeout(() => {
          setShouldAutoFocus(true);
        }, 100);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  // Thêm hàm để xử lý khi mở emoji picker
  const handleEmojiButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Ngăn chặn sự kiện lan ra ngoài
    setShowEmojiPicker(!showEmojiPicker);
    setShouldAutoFocus(false); // Tắt auto focus khi mở emoji picker
  };

  // Thêm hàm xử lý khi tương tác với emoji picker
  const handleEmojiPickerInteraction = (e: React.MouseEvent) => {
    e.stopPropagation(); // Ngăn chặn sự kiện lan ra ngoài
    setShouldAutoFocus(false); // Đảm bảo auto focus vẫn bị tắt
  };

  // Kiểm tra xem tin nhắn có phải từ tài khoản hệ thống không
  const isSystemMessage = (message: Message) => {
    return message.sender_id === 1;
  };

  // Thêm CSS tùy chỉnh cho webkit scrollbar
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .chat-area::-webkit-scrollbar {
        width: 6px;
      }
      .chat-area::-webkit-scrollbar-track {
        background: transparent;
      }
      .chat-area::-webkit-scrollbar-thumb {
        background: #bcc0c4;
        border-radius: 10px;
      }
      .chat-area::-webkit-scrollbar-thumb:hover {
        background: #8e8e8e;
      }
      .message-bubble-own:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
      }
      .message-bubble-other:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      }
    `;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Thêm useEffect cho CSS của thanh soạn tin nhắn để làm mượt hơn
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.id = 'message-input-styles';
    styleElement.innerHTML = `
      @keyframes emojiPickerFadeIn {
        from {
          transform: translateY(10px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      .message-input-container {
        position: relative;
        flex: 1;
        transition: all 0.3s ease;
      }
      
      .message-input {
        width: 100%;
        transition: all 0.25s ease-in-out;
        backface-visibility: hidden;
        will-change: border, box-shadow, background-color;
      }
      
      .message-input:focus {
        border-color: #b3d7ff !important;
        background-color: #ffffff !important;
        box-shadow: inset 0 1px 3px rgba(0,0,0,0.05), 0 0 0 3px rgba(0,102,255,0.1) !important;
      }
      
      .emoji-button, .send-button {
        position: relative;
        overflow: hidden;
      }
      
      .emoji-button::after, .send-button::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 5px;
        height: 5px;
        background: rgba(255, 255, 255, 0.5);
        opacity: 0;
        border-radius: 100%;
        transform: scale(1, 1) translate(-50%, -50%);
        transform-origin: 50% 50%;
      }
      
      .emoji-button:active::after, .send-button:active::after {
        opacity: 0.2;
        transform: scale(50, 50) translate(-50%, -50%);
        transition: transform 0.5s, opacity 1s;
      }
      
      .input-area {
        transition: all 0.3s ease;
        transform: translateY(0);
        backface-visibility: hidden;
        will-change: transform;
      }
      
      .input-form {
        transition: all 0.3s ease;
        transform: translateY(0);
        opacity: 1;
        backface-visibility: hidden;
        will-change: transform, opacity;
      }
      
      .input-area:focus-within .input-form {
        transform: translateY(-2px);
      }
      
      /* Hiệu ứng placeholder */
      .message-input::placeholder {
        transition: all 0.2s ease;
        color: #aaa;
      }
      
      .message-input:focus::placeholder {
        opacity: 0.7;
        transform: translateX(3px);
      }
      
      /* Hiệu ứng gõ tin nhắn */
      .message-input:not(:placeholder-shown) {
        background-color: #ffffff !important;
      }
    `;
    document.head.appendChild(styleElement);
    
    return () => {
      document.getElementById('message-input-styles')?.remove();
    };
  }, []);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const scrollTop = messagesContainerRef.current.scrollTop;
    const scrollHeight = messagesContainerRef.current.scrollHeight;
    const clientHeight = messagesContainerRef.current.clientHeight;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAtBottom(atBottom);
    // cuộn lên trên cùng: load trang cũ hơn
    if (scrollTop === 0 && (page + 1) * pageSize < messages.length) {
      // Lưu chiều cao trước khi load thêm
      prevScrollHeightRef.current = scrollHeight;
      setPage(prev => prev + 1);
    }
    // cuộn xuống dưới cùng: reset về trang mới nhất
    if (atBottom && page > 0) {
      setPage(0);
    }
  };

  // Điều chỉnh scrollTop sau khi page thay đổi
  useEffect(() => {
    if (prevScrollHeightRef.current && messagesContainerRef.current) {
      const newScrollHeight = messagesContainerRef.current.scrollHeight;
      const diff = newScrollHeight - prevScrollHeightRef.current;
      messagesContainerRef.current.scrollTop = diff;
      prevScrollHeightRef.current = 0;
    }
  }, [page]);

  // Tối ưu việc tải tin nhắn với throttle
  const throttledLoadMessages = useCallback(
    throttle(async (conversationId: number) => {
      try {
        const msgs = await api.getConversationMessages(conversationId);
        if (currentConversationIdRef.current === conversationId) {
          setMessages(prevMessages => {
            // Chỉ cập nhật nếu có sự thay đổi
            if (JSON.stringify(prevMessages) !== JSON.stringify(msgs)) {
              return msgs;
            }
            return prevMessages;
          });
        }
      } catch (error) {
        console.error('Lỗi khi tải tin nhắn:', error);
      }
    }, 1000), // Throttle 1 giây
    []
  );

  // Tối ưu việc tải tin nhắn
  useEffect(() => {
    if (!currentConversation?.conversation_id) return;
    
    let isSubscribed = true;
    const conversationId = currentConversation.conversation_id;
    
    const loadMessages = async () => {
      try {
        const msgs = await api.getConversationMessages(conversationId);
        if (isSubscribed && currentConversationIdRef.current === conversationId) {
          setMessages(msgs);
          if (messages.length === 0) {
            requestAnimationFrame(() => scrollToBottom(false));
          }
        }
      } catch (error) {
        console.error('Lỗi khi tải tin nhắn:', error);
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    setLoading(true);
    currentConversationIdRef.current = conversationId;
    loadMessages();

    // Cleanup function
    return () => {
      isSubscribed = false;
      throttledLoadMessages.cancel();
    };
  }, [currentConversation?.conversation_id, throttledLoadMessages]);

  // Tối ưu việc tự động làm mới tin nhắn với throttle
  useEffect(() => {
    if (!currentConversation?.conversation_id) return;
    
    let isSubscribed = true;
    const conversationId = currentConversation.conversation_id;
    let lastMessageCount = messages.length;
    
    const refreshMessages = async () => {
      if (!isSubscribed) return;
      
      try {
        const msgs = await api.getConversationMessages(conversationId);
        if (!isSubscribed || currentConversationIdRef.current !== conversationId) return;

        if (msgs.length > lastMessageCount) {
          const scrollPosition = messagesContainerRef.current?.scrollTop || 0;
          const scrollHeight = messagesContainerRef.current?.scrollHeight || 0;
          const clientHeight = messagesContainerRef.current?.clientHeight || 0;
          const wasAtBottom = scrollHeight - scrollPosition - clientHeight < 50;
          
          setMessages(msgs);
          lastMessageCount = msgs.length;
          
          if (wasAtBottom) {
            requestAnimationFrame(() => scrollToBottom(true));
          }
        }
      } catch (error) {
        console.error('Lỗi khi làm mới tin nhắn:', error);
      }
    };

    const throttledRefresh = throttle(refreshMessages, 1000);
    const intervalId = setInterval(throttledRefresh, 2000);

    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
      throttledRefresh.cancel();
    };
  }, [currentConversation?.conversation_id]);

  // Tối ưu hiệu suất cuộn với throttle
  const throttledHandleScroll = useMemo(
    () => throttle(() => {
      if (!messagesContainerRef.current) return;
      const scrollTop = messagesContainerRef.current.scrollTop;
      const scrollHeight = messagesContainerRef.current.scrollHeight;
      const clientHeight = messagesContainerRef.current.clientHeight;
      const atBottom = scrollHeight - scrollTop - clientHeight < 50;
      
      setIsAtBottom(atBottom);
      
      if (scrollTop === 0 && (page + 1) * pageSize < messages.length) {
        prevScrollHeightRef.current = scrollHeight;
        setPage(prev => prev + 1);
      }
      if (atBottom && page > 0) {
        setPage(0);
      }
    }, 100),
    [page, messages.length, pageSize]
  );

  // Tối ưu việc render tin nhắn
  const memoizedMessages = useMemo(() => {
    const start = Math.max(messages.length - (page + 1) * pageSize, 0);
    return messages.slice(start);
  }, [messages, page, pageSize]);

  // Nếu không có cuộc trò chuyện nào được chọn
  if (!currentConversation) {
    return (
      <div className="messages-content" style={styles.messagesContent}>
        <div className="empty-state" style={{
          ...styles.emptyState,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '40px 20px',
          background: 'var(--welcome-bg-gradient)',
          textAlign: 'center',
        }}>
          <div className="empty-icon" style={{
            width: '120px',
            height: '120px',
            margin: '0 auto 30px',
            backgroundColor: 'var(--welcome-icon-bg)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--welcome-icon-shadow)',
          }}>
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16Z" fill="var(--welcome-icon-color)"/>
              <path d="M12 11H14V13H12V11ZM12 7H14V9H12V7Z" fill="var(--welcome-icon-color)"/>
            </svg>
          </div>
          
          <div style={{
            color: 'var(--welcome-text)',
            fontWeight: 900,
            fontSize: '28px',
            textAlign: 'center',
            padding: '10px 0',
            lineHeight: 1.4,
            fontFamily: 'Arial, sans-serif',
            textShadow: '0 2px 4px var(--welcome-text-shadow)',
            transition: 'all 0.3s ease',
            marginBottom: '20px'
          }}>
            Chào mừng đến với SnakeChat
          </div>

          <p style={{
            fontSize: '18px',
            color: 'var(--welcome-description-text)',
            maxWidth: '450px',
            lineHeight: '1.6',
            marginBottom: '30px',
            fontWeight: 500,
          }}>
            Hãy chọn một cuộc trò chuyện từ danh sách bên trái để bắt đầu trò chuyện hoặc tạo cuộc trò chuyện mới với bạn bè
          </p>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            marginTop: '10px',
            width: '100%',
            maxWidth: '350px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#e0e6ed',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '16px',
              color: '#000000',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              border: '1px solid #ccd4db',
              fontWeight: 500,
            }}>
              <span style={{ 
                marginRight: '12px', 
                color: '#ffffff',
                backgroundColor: '#0066ff',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
              }}>1</span>
              <span style={{ color: '#000000' }}>Chọn cuộc trò chuyện từ sidebar</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#e0e6ed',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '16px',
              color: '#000000',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              border: '1px solid #ccd4db',
              fontWeight: 500,
            }}>
              <span style={{ 
                marginRight: '12px', 
                color: '#ffffff',
                backgroundColor: '#0066ff',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
              }}>2</span>
              <span style={{ color: '#000000' }}>Bắt đầu nhắn tin</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-content" style={styles.messagesContent}>
      {loading ? (
        <div style={styles.loadingMessages}>Đang tải tin nhắn...</div>
      ) : (
        <>
          <div 
            className="chat-area" 
            style={{
              ...styles.chatArea,
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'scroll',
              height: isSystemAccount ? '100%' : 'calc(100% - 65px)',
              paddingTop: '60px',
            }} 
            ref={messagesContainerRef} 
            onScroll={throttledHandleScroll}
            onClick={handleChatAreaClick}
          >
            <div className="messages-list" style={{
              ...styles.messagesList,
              marginTop: 'auto',
              width: '100%',
            }}>
              {memoizedMessages.map((message, index) => (
                <React.Fragment key={message.message_id}>
                  {shouldShowDateDisplayed(index) && (
                    <MessageDate date={message.created_at} styles={styles} />
                  )}
                  
                  <div 
                    className={`message-row ${isOwnMessage(message) ? 'own-message' : ''}`}
                    style={{
                      ...styles.messageRow,
                      justifyContent: isOwnMessage(message) ? 'flex-end' : 'flex-start',
                      marginBottom: '0',
                      padding: '0',
                    }}
                  >
                    {!isOwnMessage(message) && (
                      <MessageAvatar
                        sender_name={message.sender_name}
                        sender_avatar={message.sender_avatar}
                        isSystem={isSystemMessage(message)}
                        styles={styles}
                      />
                    )}
                    <MessageBubble
                      message={message}
                      isOwnMessage={isOwnMessage(message)}
                      isSystemMessage={isSystemMessage(message)}
                      hoveredMessageId={hoveredMessageId}
                      onHover={setHoveredMessageId}
                      onReply={handleReply}
                      styles={styles}
                    />
                  </div>
                  {/* Hiển thị trạng thái Đã xem ngay dưới bubble đã xem gần nhất */}
                  {isLastReadMessage(message) && (
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', margin: '2px 0 8px 0' }}>
                      {renderMessageStatus(message)}
                    </div>
                  )}
                  {/* Hiển thị trạng thái Đã gửi ngay dưới bubble tin nhắn mới nhất của mình (nếu chưa được xem) */}
                  {isLastMessageFromUser(message) && !message.is_read && (
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', margin: '2px 0 8px 0' }}>
                      {renderMessageStatus(message)}
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
          
          {!isSystemAccount && (
            isBlocked ? (
              <div className="blocked-chat-message" style={{ ...styles.inputArea, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#e74c3c', backgroundColor: 'var(--blocked-message-bg)' }}>
                Không thể gửi tin nhắn. Bạn hoặc người dùng này đã chặn nhau.
              </div>
            ) : (
              <div className="input-area" onClick={() => inputRef.current?.focus()}>
                {/* Hiển thị preview tin nhắn đang trả lời */}
                {replyingTo && (
                  <div style={styles.replyPreview}>
                    <i className="fas fa-reply" style={{ color: '#666' }}></i>
                    <div style={styles.replyPreviewContent}>
                      <div style={{ fontWeight: 500 }}>Trả lời {replyingTo.sender_name}</div>
                      <div style={{ color: '#888', marginTop: '2px' }}>{replyingTo.content}</div>
                    </div>
                    <button 
                      onClick={cancelReply}
                      style={styles.replyPreviewClose}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                )}
                
                <form className="input-form" onSubmit={handleSendMessage}>
                  <button
                    type="button"
                    className="emoji-button"
                    style={styles.emojiButton}
                    onClick={handleEmojiButtonClick}
                  >
                    <i className="far fa-smile"></i>
                  </button>
                  {showEmojiPicker && (
                    <div 
                      className="emoji-picker-container" 
                      style={styles.emojiPickerContainer} 
                      onClick={handleEmojiPickerInteraction}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShouldAutoFocus(false);
                      }}
                    >
                      <EmojiPicker
                        onEmojiClick={onEmojiClick}
                        searchDisabled={false}
                        emojiStyle="native"
                        theme="light"
                        skinTonesDisabled={true}
                        width={320}
                        height={400}
                        previewConfig={{
                          defaultCaption: "Chọn Emoji...",
                          defaultEmoji: "1f60a"
                        }}
                      />
                    </div>
                  )}
                  <div className="message-input-container">
                    <input
                      ref={inputRef}
                      type="text"
                      className="message-input"
                      placeholder={replyingTo ? `Trả lời ${replyingTo.sender_name}...` : "Nhập tin nhắn..."}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={sending}
                      autoFocus={shouldAutoFocus}
                      onFocus={() => {
                        if (showEmojiPicker && !shouldAutoFocus) {
                          inputRef.current?.blur();
                        }
                      }}
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="send-button"
                    style={{
                      ...styles.sendButton,
                      opacity: !newMessage.trim() || sending ? 0.6 : 1,
                    }} 
                    disabled={!newMessage.trim() || sending}
                  >
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </form>
              </div>
            )
          )}
          {isSystemAccount && (
            <div className="system-account-message" style={{ 
              ...styles.inputArea, 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              color: 'var(--system-message-text)',
              backgroundColor: 'var(--system-message-bg)',
              fontStyle: 'italic',
              borderTop: '1px solid var(--system-message-border)'
            }}>
              Đây là tin nhắn hệ thống. Bạn không thể trả lời trực tiếp.
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default React.memo(MessagesContent); 