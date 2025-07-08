import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import api from '../../services/api';
import type { Conversation, Message } from '../../services/api';
import EmojiPicker from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';
import socketService from '../../services/socketService';

// Tự viết hàm throttle để thay thế lodash/throttle
const throttle = <T extends (...args: any[]) => any>(func: T, delay: number): T => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastExecTime = 0;
  
  return ((...args: any[]) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  }) as T;
};

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
    <div style={styles.messageDate}>
      <div style={styles.datePill}>
        {formatMessageDate(date)}
      </div>
    </div>
  );
});

const MessageAvatar = React.memo(({ sender_name, sender_avatar, isSystem, styles }: { 
  sender_name: string; 
  sender_avatar?: string; 
  isSystem: boolean; 
  styles: any;
}) => {
  const avatarStyle = useMemo(() => ({
    ...styles.messageAvatar,
    ...(isSystem ? {
      backgroundColor: '#e3f2fd',
      border: '2px solid #2196f3'
    } : {})
  }), [isSystem, styles]);

  return (
    <div style={avatarStyle}>
      {sender_avatar ? (
        <img 
          src={sender_avatar} 
          alt={sender_name}
          style={{ width: '100%', height: '100%', borderRadius: '50%' }}
        />
      ) : (
        sender_name?.charAt(0)?.toUpperCase() || '?'
      )}
    </div>
  );
});

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
  const formatMessageTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <div 
      className="message-container"
      style={styles.messageContainer}
      onMouseEnter={() => onHover(message.message_id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Hiển thị thông tin tin nhắn được trả lời nếu có */}
      {message.reply_to && (
        <div style={styles.replyIndicator}>
          <i className="fas fa-reply" style={{ fontSize: '12px' }}></i>
          <span>Trả lời {message.reply_to?.sender_name}</span>
          <span style={styles.replyContent}>{message.reply_to?.content}</span>
        </div>
      )}
      
      <div 
        className={`message-bubble ${isOwnMessage ? 'own' : 'other'}`}
        style={{
          ...(isOwnMessage ? styles.messageBubbleOwn : styles.messageBubbleOther),
          ...(isSystemMessage ? { backgroundColor: '#e3f2fd', color: '#1565c0', fontStyle: 'italic' } : {}),
          ...(hoveredMessageId === message.message_id ? { transform: 'scale(1.02)' } : {})
        }}
      >
        {/* Nút trả lời - chỉ hiển thị khi hover và không phải tin nhắn của mình */}
        {!isOwnMessage && hoveredMessageId === message.message_id && (
          <button
            style={{
              ...styles.replyButton,
              opacity: 1,
              position: 'absolute',
              top: '-8px',
              right: '8px',
              zIndex: 10
            }}
            onClick={() => onReply(message)}
          >
            <i className="fas fa-reply"></i>
            Trả lời
          </button>
        )}
        
        <div>{message.content}</div>
        <div 
          className="message-time"
          style={{
            ...styles.messageTime,
            ...(hoveredMessageId === message.message_id ? styles.messageTimeVisible : {})
          }}
        >
          {formatMessageTime(message.created_at)}
        </div>
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
  const [_shouldAutoFocus, _setShouldAutoFocus] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentConversationIdRef = useRef<number | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [_isAtBottom, setIsAtBottom] = useState(true);
  const [_isSocketConnected, _setIsSocketConnected] = useState(false);
  const [isBlocked, _setIsBlocked] = useState(false);
  const [isSystemAccount, _setIsSystemAccount] = useState<boolean>(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const pageSize = 20;
  const [page, setPage] = useState(0);

  // Kiểm tra xem tin nhắn có cần hiển thị ngày không
  const shouldShowDate = (message: Message, index: number) => {
    if (index === 0) return true;
    
    const currentDate = new Date(message.created_at).toDateString();
    const previousDate = new Date(messages[index - 1].created_at).toDateString();
    
    return currentDate !== previousDate;
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

  // Xử lý trả lời tin nhắn
  const handleReply = (message: Message) => {
    setReplyingTo(message);
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  // Kiểm tra tin nhắn có phải của mình không
  const isOwnMessage = (message: Message) => {
    return message.sender_id === userId;
  };

  // Kiểm tra tin nhắn có phải từ hệ thống không
  const isSystemMessage = (message: Message) => {
    return message.sender_id === 1; // Giả sử ID hệ thống là 1
  };

  // Xử lý gửi tin nhắn
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !currentConversation) return;

    setSending(true);
    const tempId = Date.now();
    
    const tempMessage: Message = {
      message_id: tempId,
      conversation_id: currentConversation.conversation_id,
      content: newMessage.trim(),
      sender_id: userId,
      sender_name: 'Bạn',
      message_type: 'text',
      created_at: new Date().toISOString(),
      is_read: false,
      reply_to: replyingTo || undefined
    };

    setMessages(prev => [...prev, tempMessage]);
    const messageToSend = newMessage.trim();
    setNewMessage('');
    setReplyingTo(null);

    try {
      const response = await api.sendMessage({
        conversation_id: currentConversation.conversation_id,
        sender_id: userId,
        content: messageToSend,
        message_type: 'text',
        reply_to_message_id: replyingTo?.message_id
      });

      if (response.success) {
        setMessages(prev => prev.filter(msg => msg.message_id !== tempId));
        setTimeout(() => scrollToBottom(true), 100);
      } else {
        setMessages(prev => prev.map(msg => 
          msg.message_id === tempId 
            ? { ...msg, send_failed: true }
            : msg
        ));
      }
    } catch (error) {
      setMessages(prev => prev.map(msg => 
        msg.message_id === tempId 
          ? { ...msg, send_failed: true }
          : msg
      ));
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
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
      background: '#fbfbfb',
    },
    chatArea: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '20px 30px',
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
    },
    datePill: {
      backgroundColor: '#ffffff',
      padding: '6px 16px',
      borderRadius: '16px',
      display: 'inline-block',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      border: '1px solid #e4e6eb',
      fontWeight: '600',
      color: '#000000',
      fontSize: '13px',
    },
    messageRow: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: '8px',
      marginBottom: '2px',
      width: '100%',
      padding: '4px 0',
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
      border: '2px solid #ffffff',
    },
    inputArea: {
      padding: '15px',
      borderTop: '1px solid #eaeaea',
      backgroundColor: 'white',
    },
    messageInput: {
      flex: 1,
      padding: '12px 15px',
      borderRadius: '24px',
      border: '1px solid #ddd',
      outline: 'none',
      fontSize: '14px',
      backgroundColor: '#f5f5f5',
      color: '#000000',
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
      wordBreak: 'break-word' as const,
      position: 'relative' as const,
      whiteSpace: 'pre-wrap' as const,
      fontSize: '15px',
      lineHeight: '1.4',
    },
    messageBubbleOther: {
      backgroundColor: '#f0f2f5',
      color: '#000000',
      padding: '12px 16px',
      borderRadius: '18px 18px 18px 4px',
      maxWidth: '100%',
      wordBreak: 'break-word' as const,
      position: 'relative' as const,
      whiteSpace: 'pre-wrap' as const,
      fontSize: '15px',
      lineHeight: '1.4',
    },
    messageTime: {
      fontSize: '11px',
      color: '#8e8e8e',
      marginTop: '4px',
      opacity: 0,
      transition: 'opacity 0.2s ease',
    },
    messageTimeVisible: {
      opacity: 1,
    },
    messageContainer: {
      display: 'flex',
      flexDirection: 'column' as const,
      position: 'relative' as const,
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
      cursor: 'pointer',
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
      color: '#666',
      fontSize: '20px',
    },
    emojiPickerContainer: {
      position: 'absolute' as const,
      bottom: '80px',
      left: '15px',
      zIndex: 1000,
    }
  };

  // Tối ưu việc render tin nhắn
  const memoizedMessages = useMemo(() => {
    const start = Math.max(messages.length - (page + 1) * pageSize, 0);
    return messages.slice(start);
  }, [messages, page, pageSize]);

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

  // Thêm emoji vào tin nhắn
  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleEmojiButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowEmojiPicker(!showEmojiPicker);
  };

  // Load tin nhắn khi chọn cuộc trò chuyện
  useEffect(() => {
    if (!currentConversation?.conversation_id) return;
    
    setLoading(true);
    currentConversationIdRef.current = currentConversation.conversation_id;
    
    const loadMessages = async () => {
      try {
        const msgs = await api.getConversationMessages(currentConversation.conversation_id);
        if (currentConversationIdRef.current === currentConversation.conversation_id) {
          setMessages(msgs);
          setLoading(false);
          setTimeout(() => scrollToBottom(false), 100);
        }
      } catch (error) {
        setLoading(false);
      }
    };
    
    loadMessages();
  }, [currentConversation, scrollToBottom]);

  // Socket listener cho tin nhắn mới - REALTIME MESSAGING
  useEffect(() => {
    if (!currentConversation?.conversation_id || !userId) return;

    const handleNewMessage = (data: any) => {
      // Chỉ xử lý tin nhắn của cuộc trò chuyện hiện tại
      if (data.conversation_id === currentConversation.conversation_id) {
        // Kiểm tra xem tin nhắn đã tồn tại chưa để tránh duplicate
        setMessages(prevMessages => {
          const exists = prevMessages.some(msg => msg.message_id === data.message_id);
          if (exists) {
            return prevMessages;
          }
          
          // Thêm tin nhắn mới vào cuối danh sách
          const newMessages = [...prevMessages, data];
          
          // Auto scroll to bottom nếu người dùng đang ở cuối danh sách
          setTimeout(() => {
            if (messagesContainerRef.current) {
              const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
              const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
              
              if (isNearBottom || data.sender_id === userId) {
                scrollToBottom(true);
              }
            }
          }, 100);
          
          return newMessages;
        });
      }
    };

    const handleMessageReadReceipt = (data: any) => {
      // Xử lý thông báo tin nhắn đã đọc
      if (data.conversation_id === currentConversation.conversation_id) {
        setMessages(prevMessages => 
          prevMessages.map(msg => {
            // Nếu có danh sách message_ids cụ thể
            if (data.message_ids && Array.isArray(data.message_ids)) {
              if (data.message_ids.includes(msg.message_id)) {
                return { ...msg, is_read: 1 };
              }
            } else {
              // Đánh dấu đã đọc cho tất cả tin nhắn trước thời điểm read_at
              const messageTime = new Date(msg.created_at);
              const readTime = new Date(data.read_at);
              
              if (messageTime <= readTime && msg.sender_id === userId) {
                return { ...msg, is_read: 1 };
              }
            }
            return msg;
          })
        );
      }
    };

    // Đăng ký socket events
    socketService.on('new_message', handleNewMessage);
    socketService.on('message_read_receipt', handleMessageReadReceipt);

    // Cleanup function
    return () => {
      socketService.off('new_message', handleNewMessage);
      socketService.off('message_read_receipt', handleMessageReadReceipt);
    };
  }, [currentConversation?.conversation_id, userId, scrollToBottom]);

  // Gửi thông báo đã đọc tin nhắn khi vào cuộc trò chuyện
  useEffect(() => {
    if (!currentConversation?.conversation_id || !userId || messages.length === 0) return;

    // Đánh dấu đã đọc các tin nhắn chưa đọc của người khác
    const unreadMessages = messages.filter(msg => 
      msg.sender_id !== userId && msg.is_read === 0
    );

    if (unreadMessages.length > 0) {
      // Gửi thông báo đã đọc qua socket
      socketService.emit('message_read', {
        conversation_id: currentConversation.conversation_id,
        reader_id: userId,
        message_ids: unreadMessages.map(msg => msg.message_id)
      });

      // Cập nhật local state
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          unreadMessages.some(unread => unread.message_id === msg.message_id)
            ? { ...msg, is_read: 1 }
            : msg
        )
      );
    }
  }, [currentConversation?.conversation_id, userId, messages]);

  // Nếu không có cuộc trò chuyện nào được chọn
  if (!currentConversation) {
    return (
      <div className="messages-content" style={styles.messagesContent}>
        <div className="empty-state" style={styles.emptyState}>
          <div>Chọn một cuộc trò chuyện để bắt đầu nhắn tin</div>
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
          >
            <div className="messages-list" style={{
              ...styles.messagesList,
              marginTop: 'auto',
              width: '100%',
            }}>
              {memoizedMessages.map((message, index) => (
                <React.Fragment key={message.message_id}>
                  {shouldShowDate(message, index) && (
                    <MessageDate date={message.created_at} styles={styles} />
                  )}
                  
                  <div 
                    className={`message-row ${isOwnMessage(message) ? 'own-message' : ''}`}
                    style={{
                      ...styles.messageRow,
                      justifyContent: isOwnMessage(message) ? 'flex-end' : 'flex-start',
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
                </React.Fragment>
              ))}
            </div>
          </div>
          
          {!isSystemAccount && !isBlocked && (
            <div className="input-area">
              {replyingTo && (
                <div style={styles.replyPreview}>
                  <i className="fas fa-reply" style={{ color: '#666' }}></i>
                  <div style={styles.replyPreviewContent}>
                    <div style={{ fontWeight: 500 }}>Trả lời {replyingTo.sender_name}</div>
                    <div style={{ color: '#888', marginTop: '2px' }}>{replyingTo.content}</div>
                  </div>
                  <button onClick={cancelReply} style={styles.replyPreviewClose}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              )}
              
              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  type="button"
                  style={styles.emojiButton}
                  onClick={handleEmojiButtonClick}
                >
                  <i className="far fa-smile"></i>
                </button>
                
                {showEmojiPicker && (
                  <div style={styles.emojiPickerContainer}>
                    <EmojiPicker
                      onEmojiClick={onEmojiClick}
                      width={320}
                      height={400}
                    />
                  </div>
                )}
                
                <input
                  ref={inputRef}
                  type="text"
                  style={styles.messageInput}
                  placeholder={replyingTo ? `Trả lời ${replyingTo.sender_name}...` : "Nhập tin nhắn..."}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={sending}
                />
                
                <button 
                  type="submit" 
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
          )}
        </>
      )}
    </div>
  );
};

export default React.memo(MessagesContent);
