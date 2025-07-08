import React, { useState } from 'react';

// Tạm thời định nghĩa types local thay vì import
interface Conversation {
  conversation_id: number;
  // other fields...
}

interface Message {
  message_id: number;
  content: string;
  sender_id: number;
  sender_name: string;
  created_at: string;
  is_read: boolean;
  // other fields...
}

interface MessagesContentProps {
  userId: number;
  currentConversation: Conversation | null;
}

function MessagesContent({ userId, currentConversation }: MessagesContentProps) {
  const [newMessage, setNewMessage] = useState('');

  return (
    <div style={{ padding: '20px' }}>
      <h3>Messages for conversation: {currentConversation?.conversation_id}</h3>
      <p>User ID: {userId}</p>
      <div style={{ marginTop: '20px' }}>
        <input 
          type="text" 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          style={{ 
            width: '300px', 
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
        <button 
          style={{ 
            marginLeft: '10px',
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default MessagesContent; 