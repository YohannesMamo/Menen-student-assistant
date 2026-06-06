import  { useEffect, useState } from 'react';
//import axios from 'axios';
import { Plus } from 'lucide-react';
import api from '../api/client';

interface Conversation {
  id: string;
  name?: string;
  isGroup: boolean;
  lastMessageContent?: string;
  lastMessageAt?: string;
  unreadCount?: number;
}

interface ChatListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function ChatList({ selectedId, onSelect }: ChatListProps) {

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // const res = await axios.get('/api/conversations');
     const res = await api.get('/conversations')
      // Safety check
      if (Array.isArray(res.data)) {
        setConversations(res.data);
      } else {
        console.error("API did not return an array:", res.data);
        setConversations([]);
      }
    } catch (err: any) {
      console.error("Failed to fetch conversations", err);
      setError("Failed to load conversations");
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

 const createNewConversation = async () => {
    const participantId = prompt("Enter the User ID of the person you want to chat with:");

    if (!participantId?.trim()) return;

    try {
     const response = await api.post('/conversations',{
      // const response = await axios.post('/api/conversations', {
        isGroup: false,
        participantIds: [participantId.trim()]
      });
console.log("Success:", response.data);
      alert("Conversation created successfully!");
      
      // Refresh list
      await fetchConversations();

      // Auto-select the newly created conversation (if backend returns the id)
      if (response.data?.id) {
        onSelect(response.data.id);     // This will open the chat
      }
    } catch (error: any) {
     console.error("Full Error:", error.response?.data || error);
      alert(error.response?.data?.title || "Failed to create conversation");
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-white">
        <h2 className="font-semibold text-lg">Messages</h2>
        <button
          onClick={createNewConversation}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition"
        >
          <Plus size={20} />
          <span>New Chat</span>
        </button>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto bg-white">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading conversations...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No conversations yet.<br />
            Click "New Chat" to start messaging.
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`p-4 hover:bg-gray-100 cursor-pointer border-b transition ${
                selectedId === conv.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''
              }`}
            >
              <div className="font-medium">{conv.name || "Unnamed Chat"}</div>
              <div className="text-sm text-gray-500 truncate">
                {conv.lastMessageContent || "Start chatting..."}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}