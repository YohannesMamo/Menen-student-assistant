import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Users,
  Hash,
  User as UserIcon,
  Paperclip,
  File,
  Download,
  X,
  FileText,
  Image as ImageIcon,
  Video,
  Plus,
  Search,
  Check,
  Activity
} from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import axios from 'axios';

interface Student {
  StudentID: string;
  FirstName: string;
  LastName: string;
  DisplayName: string;
}

export const ChatHub = () => {
  const {
    conversations,
    selectedConversation,
    messages,
    loading,
    onlineUsers,
    selectConversation,
    sendMessage,
    uploadFile,
    fetchConversations
  } = useChat();

  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ name: string; type: string; size: number; data: string } | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<Student[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [newChatSearch, setNewChatSearch] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const studentData = localStorage.getItem('student');
  const studentId = localStorage.getItem('studentId');
  const currentUserId = studentId || (studentData ? JSON.parse(studentData).StudentID : null);
  const firstName = localStorage.getItem('userName');
  const currentUserDisplayName = firstName || (studentData ? `${JSON.parse(studentData).StuFirstName} ${JSON.parse(studentData).StuLastName}` : '');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadAvailableUsers = async () => {
    console.log('[ChatHub] loadAvailableUsers called, showNewChatModal:', showNewChatModal);
    if (!showNewChatModal) return;

    setIsLoadingUsers(true);
    try {
      const token = localStorage.getItem('token');
      console.log('[ChatHub] Fetching students from /api/chat/students...');
      console.log('[ChatHub] Token:', token ? 'present' : 'MISSING');
      const res = await axios.get('/api/chat/students', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('[ChatHub] API Response status:', res.status);
      console.log('[ChatHub] Students received:', res.data);
      console.log('[ChatHub] Students count:', res.data.length);
      const filtered = res.data.filter((user: Student) => user.StudentID !== currentUserId);
      console.log('[ChatHub] Filtered students (excluding self):', filtered);
      setAvailableUsers(filtered);
    } catch (error: any) {
      console.error('[ChatHub] Failed to load users. Error:', error.message);
      console.error('[ChatHub] Error response:', error.response?.data);
      console.error('[ChatHub] Error status:', error.response?.status);
    }
    setIsLoadingUsers(false);
  };

  useEffect(() => {
    console.log('[ChatHub] availableUsers updated:', availableUsers);
    console.log('[ChatHub] onlineUsers updated:', Array.from(onlineUsers));
    console.log('[ChatHub] conversations:', conversations);
  }, [availableUsers, onlineUsers, conversations]);

  useEffect(() => {
    if (showNewChatModal) {
      loadAvailableUsers();
    }
  }, [showNewChatModal]);

  const getConversationName = (conv: any) => {
    if (conv.Name) return conv.Name;
    const otherParticipants = conv.Participants.filter((p: string) => p !== currentUserId);
    const otherUser = availableUsers.find(u => u.StudentID === otherParticipants[0]);
    return otherUser?.DisplayName || otherParticipants.join(', ') || 'Unknown Chat';
  };

  const handleSelectRoom = async (conv: any) => {
    selectConversation(conv);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && !selectedFile || !selectedConversation) return;

    let fileUrl = undefined;

    if (selectedFile && fileInputRef.current?.files?.[0]) {
      setIsUploading(true);
      try {
        const result = await uploadFile(fileInputRef.current.files[0]);
        fileUrl = result.FileURL;
      } catch (error) {
        console.error('Failed to upload file:', error);
      }
      setIsUploading(false);
    }

    sendMessage(selectedConversation.ConversationID, newMessage.trim(), fileUrl);
    setNewMessage('');
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      setSelectedFile({
        name: file.name,
        type: file.type,
        size: file.size,
        data: base64Data
      });
    };
    reader.readAsDataURL(file);
  };

  const toggleUserSelection = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    } else {
      setSelectedUsers(prev => [...prev, userId]);
    }
  };

  const handleCreateConversation = async () => {
    if (selectedUsers.length === 0) return;

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/chat/conversations', {
        Name: isCreatingGroup ? groupName || null : null,
        IsGroup: isCreatingGroup && selectedUsers.length > 1,
        ParticipantIDs: [currentUserId, ...selectedUsers]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowNewChatModal(false);
      setSelectedUsers([]);
      setIsCreatingGroup(false);
      setGroupName('');

      await fetchConversations();

      const newConversation = {
        ConversationID: res.data.ConversationID,
        Name: res.data.Name,
        IsGroup: res.data.IsGroup,
        Participants: res.data.ParticipantIDs,
        LastMessage: undefined
      };

      selectConversation(newConversation);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (type.startsWith('video/')) return <Video className="w-4 h-4" />;
    if (type === 'application/pdf') return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredConversations = conversations.filter(conv => {
    const name = getConversationName(conv);
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredUsers = availableUsers.filter(user =>
    user.DisplayName.toLowerCase().includes(newChatSearch.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-100 gap-6 p-6 overflow-hidden">
      {/* Sidebar - Conversations */}
      <div className="w-80 flex flex-col gap-6 h-full">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Study Channels</h3>
            </div>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="p-2 hover:bg-slate-50 rounded-lg text-indigo-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="mb-4 px-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="space-y-1 overflow-y-auto pr-2 flex-1 scrollbar-thin scrollbar-thumb-slate-200">
            {filteredConversations.length === 0 ? (
              <div className="px-2 py-8 text-center text-gray-500 text-sm">
                No conversations yet
              </div>
            ) : (
              <>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Groups</div>
                {filteredConversations.filter((conv) => conv.IsGroup).map((conv) => {
                  const isActive = selectedConversation?.ConversationID === conv.ConversationID;

                  return (
                    <button
                      key={conv.ConversationID}
                      onClick={() => handleSelectRoom(conv)}
                      className={`w-full text-left p-4 rounded-2xl transition-all flex items-center gap-3 ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                          : 'hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <Hash className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <div className="flex-1 min-w-0">
                        <span className="font-bold tracking-tight text-sm truncate block">
                          {getConversationName(conv)}
                        </span>
                        {conv.LastMessage?.Content && (
                          <p className="text-xs truncate mt-1 opacity-70">
                            {conv.LastMessage.SenderID === currentUserId ? 'You: ' : ''}
                            {conv.LastMessage.Content.startsWith('/files/') ? '📎 File' : conv.LastMessage.Content}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}

                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-8 mb-3 px-2">Recent Chats</div>
                {filteredConversations.filter((conv) => !conv.IsGroup).map((conv) => {
                  const otherParticipants = conv.Participants.filter(p => p !== currentUserId);
                  const isOnline = otherParticipants.length === 1 && onlineUsers.has(otherParticipants[0]);
                  const isActive = selectedConversation?.ConversationID === conv.ConversationID;

                  return (
                    <button
                      key={conv.ConversationID}
                      onClick={() => handleSelectRoom(conv)}
                      className={`w-full text-left p-4 rounded-2xl transition-all flex items-center gap-3 ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                          : 'hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                          isActive ? 'bg-white/20' : 'bg-indigo-600'
                        }`}>
                          {getConversationName(conv)[0]?.toUpperCase()}
                        </div>
                        {isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold tracking-tight text-sm truncate">
                            {getConversationName(conv)}
                          </span>
                          {isOnline && (
                            <Activity className="w-3 h-3 text-green-500" />
                          )}
                        </div>
                        {conv.LastMessage?.Content && (
                          <p className="text-xs truncate mt-1 opacity-70">
                            {conv.LastMessage.SenderID === currentUserId ? 'You: ' : ''}
                            {conv.LastMessage.Content.startsWith('/files/') ? '📎 File' : conv.LastMessage.Content}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Online Students */}
        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-2xl h-80 flex flex-col overflow-hidden relative">
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-10 pointer-events-none" />
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-indigo-400" />
              <h3 className="text-xs font-black uppercase tracking-widest opacity-60">Online Students</h3>
            </div>
            <div className="space-y-4 overflow-y-auto pr-2 flex-1 scrollbar-thin scrollbar-thumb-white/10">
              {Array.from(onlineUsers)
                .filter(userId => userId !== currentUserId)
                .map(userId => {
                  const user = availableUsers.find(u => u.StudentID === userId);
                  if (!user) return null;

                  return (
                    <button
                      key={userId}
                      onClick={() => {
                        const existingConv = conversations.find(conv =>
                          !conv.IsGroup && conv.Participants.includes(userId) && conv.Participants.includes(currentUserId)
                        );
                        if (existingConv) {
                          handleSelectRoom(existingConv);
                        } else {
                          setShowNewChatModal(true);
                          setSelectedUsers([userId]);
                        }
                      }}
                      className="w-full flex items-center gap-3 group transition-all hover:translate-x-1"
                    >
                      <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xs font-black group-hover:bg-indigo-600 transition-colors">
                          {user.DisplayName[0]?.toUpperCase()}
                        </div>
                        <div className="absolute -right-1 -bottom-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold tracking-tight group-hover:text-indigo-300 transition-colors">{user.DisplayName}</p>
                        <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Student</p>
                      </div>
                    </button>
                  );
                })}
              {Array.from(onlineUsers).filter(userId => userId !== currentUserId).length === 0 && (
                <div className="text-center text-white/50 text-sm">
                  No other students online
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-white rounded-4xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${selectedConversation.IsGroup ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 border border-indigo-100'} shadow-xl shadow-indigo-100/50`}>
                  {selectedConversation.IsGroup ? <Hash className="w-6 h-6" /> : <UserIcon className="w-6 h-6" />}
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tighter leading-none mb-1">
                    {getConversationName(selectedConversation)}
                  </h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {selectedConversation.IsGroup ? 'Group Chat' : 'Private Chat'} • {selectedConversation.Participants.length} participants
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin scrollbar-thumb-slate-100">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-4">
                  <div className="w-20 h-20 bg-slate-50 rounded-4xl flex items-center justify-center text-slate-200">
                    <MessageSquare className="w-10 h-10" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 tracking-tighter text-xl">Start the conversation</h4>
                    <p className="text-slate-400 text-sm font-medium tracking-tight">Send the first message</p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.SenderID === currentUserId;
                  const sender = availableUsers.find(u => u.StudentID === msg.SenderID);
                  const senderName = sender?.DisplayName || (isMine ? currentUserDisplayName : 'Unknown');
                  const isFileMessage = msg.FileURL || msg.Content.startsWith('/files/');

                  return (
                    <div key={msg.MessageID} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      {!isMine && (
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">
                          {senderName}
                        </span>
                      )}
                      <div className="max-w-[70%] space-y-2">
                        <div className={`p-5 rounded-3xl font-medium tracking-tight text-sm shadow-sm ${
                          isMine
                            ? 'bg-slate-900 text-white rounded-tr-none'
                            : 'bg-slate-50 text-slate-700 border border-slate-100 rounded-tl-none'
                        }`}>
                          {!isFileMessage && msg.Content && <p>{msg.Content}</p>}

                          {isFileMessage && (
                            <div className={`p-4 rounded-2xl flex items-center gap-4 ${isMine ? 'bg-white/10' : 'bg-white border border-slate-100'}`}>
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isMine ? 'bg-white/20' : 'bg-indigo-50'}`}>
                                <File className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-bold truncate ${isMine ? 'text-white' : 'text-slate-800'}`}>
                                  {msg.FileURL?.split('/').pop() || 'File'}
                                </p>
                              </div>
                              <a
                                href={msg.FileURL || msg.Content}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`p-2 rounded-lg transition-colors ${isMine ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-50 text-indigo-600'}`}
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          )}

                          {isFileMessage && msg.Content && !msg.Content.startsWith('/files/') && (
                            <p className="mt-3">{msg.Content}</p>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold text-slate-300 px-4 italic ${isMine ? 'text-right' : 'text-left'}`}>
                          {formatTime(msg.SentAt)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-6 bg-white border-t border-slate-100">
              {selectedFile && (
                <div className="mb-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-between animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                      {getFileIcon(selectedFile.type)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{selectedFile.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="relative flex items-center gap-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all ${selectedFile ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                >
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" />
                  ) : (
                    <Paperclip className="w-6 h-6" />
                  )}
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Type your message here..."
                  className="flex-1 p-6 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-bold tracking-tight focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-500 transition-all placeholder:text-slate-300 shadow-inner"
                />
                <button
                  type="submit"
                  disabled={(!newMessage.trim() && !selectedFile) || isUploading}
                  className="w-16 h-16 bg-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-200 hover:bg-slate-900 transition-all active:scale-95 group disabled:opacity-50 disabled:grayscale"
                >
                  <Send className="w-6 h-6 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-6">
            <div className="w-32 h-32 bg-indigo-50 rounded-[40px] flex items-center justify-center text-indigo-600 shadow-2xl shadow-indigo-100 animate-pulse">
              <MessageSquare className="w-16 h-16" />
            </div>
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Student Connectivity Hub</h2>
              <p className="text-slate-500 max-w-sm mt-4 font-medium text-lg tracking-tight leading-relaxed">
                Connect with peers, join study groups, and collaborate in real-time. Select a conversation or start a new one.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">New Chat</h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Group Toggle */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCreatingGroup}
                    onChange={(e) => setIsCreatingGroup(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Create Group Chat</span>
                </label>
              </div>

              {/* Group Name Input */}
              {isCreatingGroup && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Group Name</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Enter group name..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              )}

              {/* Search Users */}
              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={newChatSearch}
                    onChange={(e) => setNewChatSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Users List */}
              <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl">
                {isLoadingUsers ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-sm">No students found</div>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelected = selectedUsers.includes(user.StudentID);
                    const isOnline = onlineUsers.has(user.StudentID);

                    return (
                      <div
                        key={user.StudentID}
                        onClick={() => toggleUserSelection(user.StudentID)}
                        className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 ${
                          isSelected ? 'bg-indigo-50' : ''
                        }`}
                      >
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                            isSelected ? 'bg-indigo-600' : 'bg-slate-500'
                          }`}>
                            {isSelected ? (
                              <Check className="w-5 h-5" />
                            ) : (
                              user.DisplayName[0]?.toUpperCase()
                            )}
                          </div>
                          {isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-800">{user.DisplayName}</p>
                            {isOnline && (
                              <Activity className="w-3 h-3 text-green-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Selected Users and Create Button */}
            {selectedUsers.length > 0 && (
              <div className="p-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-slate-500">
                    Selected: {selectedUsers.length} student{selectedUsers.length > 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={handleCreateConversation}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-bold text-sm"
                >
                  Start Chat
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
