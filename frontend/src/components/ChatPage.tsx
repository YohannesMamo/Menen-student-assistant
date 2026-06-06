import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../contexts/ChatContext';
import { 
  Send, Paperclip, Search, X, Circle, MessageCircle, Users, Plus, Check, Activity
} from 'lucide-react';
import axios from 'axios';

interface User {
  StudentID: string;
  FirstName: string;
  LastName: string;
  DisplayName: string;
}

const ChatPage: React.FC = () => {
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

  const [inputMessage, setInputMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [newChatSearch, setNewChatSearch] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const studentData = localStorage.getItem('student');
  const currentUserId = studentData ? JSON.parse(studentData).StudentID : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadAvailableUsers = async () => {
    if (!showNewChatModal) return;
    
    setIsLoadingUsers(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/chat/students', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Filter out the current user from the list
      const filtered = res.data.filter((user: User) => user.StudentID !== currentUserId);
      setAvailableUsers(filtered);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
    setIsLoadingUsers(false);
  };

  useEffect(() => {
    if (showNewChatModal) {
      loadAvailableUsers();
    }
  }, [showNewChatModal]);

  const handleSendMessage = () => {
    if (!inputMessage.trim() && !selectedConversation) return;
    
    sendMessage(selectedConversation!.ConversationID, inputMessage.trim());
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;
    
    setIsUploading(true);
    try {
      const result = await uploadFile(file);
      sendMessage(selectedConversation.ConversationID, '', result.FileURL);
    } catch (error) {
      console.error('Failed to upload file:', error);
    }
    setIsUploading(false);
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
      
      // Fetch conversations and select the new one
      await fetchConversations();
      
      // Create the conversation object manually and select it immediately
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

  const filteredConversations = conversations.filter(conv => {
    const name = conv.Name || conv.Participants.join(', ');
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredUsers = availableUsers.filter(user => 
    user.DisplayName.toLowerCase().includes(newChatSearch.toLowerCase())
  );

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const getConversationName = (conv: any) => {
    if (conv.Name) return conv.Name;
    const otherParticipants = conv.Participants.filter((p: string) => p !== currentUserId);
    return otherParticipants.join(', ') || 'Unknown Chat';
  };

 //const getUserById = (userId: string) => {
 //   return availableUsers.find(u => u.StudentID === userId);
 // };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-100">
      {/* Conversations List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Messages</h2>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No conversations yet</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              // For 1:1 conversations, get the other user's ID
              const otherParticipants = conv.Participants.filter(p => p !== currentUserId);
              const isOnline = otherParticipants.length === 1 && onlineUsers.has(otherParticipants[0]);
              
              return (
                <div
                  key={conv.ConversationID}
                  onClick={() => selectConversation(conv)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedConversation?.ConversationID === conv.ConversationID ? 'bg-indigo-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold">
                        {getConversationName(conv)[0]?.toUpperCase()}
                      </div>
                      {isOnline && !conv.IsGroup && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold truncate flex items-center gap-2">
                          {getConversationName(conv)}
                          {isOnline && !conv.IsGroup && (
                            <Activity className="w-3 h-3 text-green-500" />
                          )}
                        </h3>
                        {conv.LastMessage?.SentAt && (
                          <span className="text-xs text-gray-500">
                            {formatTime(conv.LastMessage.SentAt)}
                          </span>
                        )}
                      </div>
                      {conv.IsGroup && (
                        <span className="text-xs text-indigo-600 flex items-center gap-1 mt-1">
                          <Users className="w-3 h-3" /> Group
                        </span>
                      )}
                      {conv.LastMessage?.Content && (
                        <p className="text-sm text-gray-500 truncate mt-1">
                          {conv.LastMessage.SenderID === currentUserId ? 'You: ' : ''}
                          {conv.LastMessage.Content}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold">
                  {getConversationName(selectedConversation)[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold">{getConversationName(selectedConversation)}</h3>
                  {selectedConversation.IsGroup && (
                    <p className="text-sm text-gray-500">
                      {selectedConversation.Participants.length} participants
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <MessageCircle className="w-16 h-16 mb-4 opacity-50" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.MessageID}
                    className={`flex ${msg.SenderID === currentUserId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.SenderID === currentUserId
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-gray-200'
                      }`}
                    >
                      {msg.FileURL ? (
                        <div>
                          {msg.FileURL.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                            <img 
                              src={msg.FileURL} 
                              alt="Shared image" 
                              className="rounded max-w-full"
                            />
                          ) : (
                            <a 
                              href={msg.FileURL} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-indigo-200 hover:text-white"
                            >
                              <Paperclip className="w-4 h-4" />
                              <span>View File</span>
                            </a>
                          )}
                          {msg.Content && (
                            <p className="mt-2">{msg.Content}</p>
                          )}
                        </div>
                      ) : (
                        <p>{msg.Content}</p>
                      )}
                      <div className={`text-xs mt-1 flex items-center gap-2 ${
                        msg.SenderID === currentUserId ? 'text-indigo-200' : 'text-gray-400'
                      }`}>
                        <span>{formatTime(msg.SentAt)}</span>
                        {msg.SenderID === currentUserId && (
                          <span>{msg.IsRead ? <Circle className="w-3 h-3 fill-current" /> : <Circle className="w-3 h-3" />}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-end gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="p-2 text-gray-500 hover:text-indigo-600 transition-colors"
                >
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                  ) : (
                    <Paperclip className="w-5 h-5" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
                <div className="flex-1">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    rows={1}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim()}
                  className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <MessageCircle className="w-24 h-24 mb-4 opacity-50" />
            <h2 className="text-2xl font-bold mb-2">Welcome to Messages</h2>
            <p>Select a conversation or start a new one</p>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-xl font-bold">New Chat</h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4">
              {/* Group Toggle */}
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCreatingGroup}
                    onChange={(e) => setIsCreatingGroup(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span>Create Group Chat</span>
                </label>
              </div>

              {/* Group Name Input (only if creating group) */}
              {isCreatingGroup && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Group Name</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Enter group name..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {/* Search Users */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={newChatSearch}
                    onChange={(e) => setNewChatSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Users List */}
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                {isLoadingUsers ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No users found</div>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user.StudentID}
                      onClick={() => toggleUserSelection(user.StudentID)}
                      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedUsers.includes(user.StudentID) ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                          selectedUsers.includes(user.StudentID) ? 'bg-indigo-600' : 'bg-gray-500'
                        }`}>
                          {selectedUsers.includes(user.StudentID) ? (
                            <Check className="w-5 h-5" />
                          ) : (
                            user.FirstName[0]?.toUpperCase()
                          )}
                        </div>
                        {onlineUsers.has(user.StudentID) && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{user.DisplayName}</p>
                          {onlineUsers.has(user.StudentID) && (
                            <Activity className="w-3 h-3 text-green-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Selected Users and Create Button */}
            {selectedUsers.length > 0 && (
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-500">
                    Selected: {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={handleCreateConversation}
                  className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
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

export default ChatPage;
