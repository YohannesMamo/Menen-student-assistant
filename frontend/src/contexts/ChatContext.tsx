import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Conversation {
  ConversationID: string;
  Name: string | null;
  IsGroup: boolean;
  Participants: string[];
  LastMessage?: {
    Content: string | null;
    SentAt: string | null;
    SenderID: string | null;
  };
}

interface Message {
  MessageID: string;
  ConversationID: string;
  SenderID: string;
  Content: string;
  SentAt: string;
  IsRead: boolean;
  FileURL?: string;
  FileName?: string;
}

interface ChatContextType {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  socket: Socket | null;
  onlineUsers: Set<string>;
  selectConversation: (conv: Conversation) => void;
  joinConversation: (conversationId: string) => void;
  fetchConversations: () => Promise<void>;
  sendMessage: (conversationId: string, content: string, fileUrl?: string, fileName?: string) => void;
  markAsRead: (conversationId: string) => void;
  uploadFile: (file: File) => Promise<{ FileURL: string; FileName: string }>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const fetchConversations = async () => {
    if (!userId) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/chat/conversations/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(res.data);
    } catch (error) {
      console.error('Failed to fetch conversations', error);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/chat/messages/${conversationId}?user_id=${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data);
    } catch (error) {
      console.error('Failed to fetch messages', error);
    }
    setLoading(false);
  };

  const selectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv);
    await fetchMessages(conv.ConversationID);
    joinConversation(conv.ConversationID);
  };

  const joinConversation = (conversationId: string) => {
    if (socket && userId) {
      socket.emit('join_conversation', {
        conversation_id: conversationId,
        user_id: userId
      });
    }
  };

  const sendMessage = (conversationId: string, content: string, fileUrl?: string, fileName?: string) => {
    if (socket && userId) {
      socket.emit('send_message', {
        conversation_id: conversationId,
        sender_id: userId,
        content,
        file_url: fileUrl,
        file_name: fileName
      });
    }
  };

  const markAsRead = async (conversationId: string) => {
    if (!userId) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/chat/conversations/${conversationId}/read`, {}, {
        params: { user_id: userId },
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  const uploadFile = async (file: File): Promise<{ FileURL: string; FileName: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('token');
    const res = await axios.post('/api/chat/upload', formData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  };

  useEffect(() => {
    const checkUserId = () => {
      const studentData = localStorage.getItem('student');
      const studentId = localStorage.getItem('studentId');
      const userIdFromStorage = studentId || (studentData ? JSON.parse(studentData).StudentID : null);
      
     
      if (userIdFromStorage) {
        console.log('[ChatContext] Setting userId:', userIdFromStorage);
        setUserId(userIdFromStorage);
      } else {
        console.log('[ChatContext] No student data found in localStorage');
      }
    };

    // Check immediately on mount
    checkUserId();

    // Set up an interval to re-check localStorage every 2 seconds
    // This handles the case where user logs in after ChatContext mounts
    const interval = setInterval(checkUserId, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!userId) {
      console.log('[ChatContext] Socket.IO: userId is null, skipping connection');
      return;
    }

    console.log('[ChatContext] Socket.IO: Starting connection to:', SOCKET_URL);
    
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token: localStorage.getItem('token') }
    });

    newSocket.on('connect', () => {
      console.log('[ChatContext] Socket.IO connected:', newSocket.id);
      newSocket.emit('register_user', { user_id: userId });
    });

    newSocket.on('disconnect', () => {
      console.log('[ChatContext] Socket.IO disconnected');
    });

    newSocket.on('new_message', (data: Message) => {
      console.log('[ChatContext] New message received:', data);

      setSelectedConversation((currentConv) => {
        if (currentConv?.ConversationID === data.ConversationID) {
          setMessages((prev) => [...prev, data]);
          axios.post(`/api/chat/conversations/${data.ConversationID}/read`, {}, {
            params: { user_id: userId },
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }).catch(console.error);
        }
        return currentConv;
      });

      fetchConversations();
    });

    newSocket.on('message_notification', (data: any) => {
      console.log('[ChatContext] Message notification:', data);
      fetchConversations();
    });

    newSocket.on('user_typing', (data: any) => {
      console.log('[ChatContext] User typing:', data);
    });

    newSocket.on('online_users', (userIds: string[]) => {
      console.log('[ChatContext] Online users:', userIds);
      setOnlineUsers(new Set(userIds));
    });

    newSocket.on('user_online', (data: { user_id: string }) => {
      console.log('[ChatContext] User came online:', data.user_id);
      setOnlineUsers(prev => new Set(prev).add(data.user_id));
    });

    newSocket.on('user_offline', (data: { user_id: string }) => {
      console.log('[ChatContext] User went offline:', data.user_id);
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.user_id);
        return newSet;
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [userId]);

  // NEW: Re-register user when userId becomes available AFTER socket was already connected
  useEffect(() => {
    if (socket && userId) {
      console.log('[ChatContext] userId now available, emitting register_user for:', userId);
      socket.emit('register_user', { user_id: userId });
    }
  }, [socket, userId]);

  useEffect(() => {
    if (userId) {
      fetchConversations();
    }
  }, [userId]);

  return (
    <ChatContext.Provider value={{
      conversations,
      selectedConversation,
      messages,
      loading,
      socket,
      onlineUsers,
      selectConversation,
      joinConversation,
      fetchConversations,
      sendMessage,
      markAsRead,
      uploadFile
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
