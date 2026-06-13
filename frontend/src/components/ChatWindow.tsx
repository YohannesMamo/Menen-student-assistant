import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { useChat } from '../contexts/ChatContext';

export default function ChatWindow({ conversationId, currentUserId  }: { 
  conversationId: string; 
  currentUserId: string;
  
}) {
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const { sendMessage, joinConversation } = useChat();
  
  const { messages,  setMessages, typingUsers } = useChatStore();
  const currentMessages = messages[conversationId] || [];
  const currentTypers = typingUsers[conversationId] || [];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Join room & load messages
  useEffect(() => {
    joinConversation(conversationId);
    loadMessages();
  }, [conversationId]);

  const loadMessages = async () => {
    const res = await fetch(`/api/conversations/${conversationId}/messages`);
    const data = await res.json();
    setMessages(conversationId, data);
  };

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  // Typing handlers
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isTyping) {
        sendTyping(false);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [isTyping]);

  const sendTyping = async (typing: boolean) => {
    setIsTyping(typing);
    // Call hub
    // connection.invoke("SendTyping", conversationId, typing);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim()) return;

    await sendMessage(conversationId, newMessage.trim());
    setNewMessage("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const { url, fileName } = await res.json();

    await sendMessage(conversationId, "", url, fileName);   // empty content, only file
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with Online Status */}
      <div className="p-4 border-b bg-white flex justify-between">
        <h2 className="font-semibold">Discussion</h2>
        <div className="text-sm text-green-600">● Online</div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
        {currentMessages.map((msg: any) => (
          <div key={msg.id} className={`flex ${msg.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] px-4 py-3 rounded-2xl ${
              msg.senderId === currentUserId ? 'bg-blue-600 text-white' : 'bg-white border'
            }`}>
              {msg.senderId !== currentUserId && <p className="text-xs text-gray-500">{msg.senderName}</p>}
              
              {msg.fileUrl ? (
                <a href={msg.fileUrl} target="_blank" className="underline">
                  📎 {msg.fileName}
                </a>
              ) : (
                <p>{msg.content}</p>
              )}

              <p className="text-[10px] mt-1 opacity-70">
                {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {currentTypers.length > 0 && (
          <p className="text-sm text-gray-500 italic">
            {currentTypers.join(", ")} typing...
          </p>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-4 bg-white border-t">
        <div className="flex gap-2">
          <button type="button" onClick={() => fileInputRef.current?.click()} className="text-gray-500 hover:text-gray-700">
            📎
          </button>
          
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              sendTyping(true);
            }}
            placeholder="Type a message..."
            className="flex-1 border rounded-full px-5 py-3 focus:outline-none"
          />

          <button type="submit" className="bg-blue-600 text-white px-6 rounded-full hover:bg-blue-700">
            Send
          </button>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
      </form>
    </div>
  );
}