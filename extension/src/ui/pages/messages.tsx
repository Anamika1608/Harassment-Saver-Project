import React, { useEffect, useState } from 'react';
import { MessageSquare, ExternalLink, Loader2, Eye } from 'lucide-react';
import { isAuthenticated, getToken } from '../../utils/auth';

const MessagesPage = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revealedMessages, setRevealedMessages] = useState({});

  useEffect(() => {
    const fetchMessages = async () => {
      const authenticated = await isAuthenticated();
      if (authenticated) {
        try {
          const token = await getToken();
          const response = await fetch("https://harassment-saver-extension.onrender.com/api/v1/user/hidden-messages", {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const data = await response.json();
          
          if (data.status === 'success') {
            setMessages(data.data.messages.slice(0, 10));
          } else {
            setError('Failed to fetch hidden messages');
          }
        } catch (error) {
          setError('An error occurred while fetching messages');
        } finally {
          setLoading(false);
        }
      } else {
        setError('Please log in to view hidden messages');
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  const handleViewDashboard = () => {
    chrome.tabs.create({
      url: 'https://dashboard-azure-one.vercel.app/admin/profile'
    });
  };

  const toggleMessageReveal = (messageId) => {
    setRevealedMessages(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  if (loading) {
    return (
      <div className="plasmo-flex plasmo-items-center plasmo-justify-center plasmo-h-64">
        <Loader2 className="plasmo-w-6 plasmo-h-6 plasmo-animate-spin plasmo-text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="plasmo-p-4 plasmo-text-center">
        <div className="plasmo-text-red-400 plasmo-mb-4">{error}</div>
        {error === 'Please log in to view hidden messages' && (
          <button
            onClick={() => chrome.runtime.sendMessage({ action: "initiateLogin" })}
            className="plasmo-bg-blue-600 plasmo-text-white plasmo-px-4 plasmo-py-2 plasmo-rounded-md plasmo-hover:bg-blue-700 plasmo-transition-colors"
          >
            Login
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="plasmo-p-4 plasmo-bg-gray-900">
      <div className="plasmo-flex plasmo-justify-between plasmo-items-center plasmo-mb-6">
        <div className="plasmo-flex plasmo-items-center plasmo-gap-2">
          <MessageSquare className="plasmo-w-5 plasmo-h-5 plasmo-text-blue-500" />
          <h2 className="plasmo-text-lg plasmo-font-medium plasmo-text-white">Hidden Messages</h2>
        </div>
        <button
          onClick={handleViewDashboard}
          className="plasmo-flex plasmo-items-center plasmo-gap-1 plasmo-text-sm plasmo-text-blue-400 plasmo-hover:text-blue-300 plasmo-transition-colors"
        >
          <span>View All</span>
          <ExternalLink className="plasmo-w-4 plasmo-h-4" />
        </button>
      </div>

      {messages.length === 0 ? (
        <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-h-64 plasmo-text-gray-400">
          <MessageSquare className="plasmo-w-12 plasmo-h-12 plasmo-mb-4 plasmo-opacity-50" />
          <p>No hidden messages</p>
        </div>
      ) : (
        <div className="plasmo-space-y-3">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className="plasmo-bg-gray-800 plasmo-rounded-lg plasmo-p-4 plasmo-transition-colors"
            >
              <div className="plasmo-flex plasmo-justify-between plasmo-items-start plasmo-mb-3">
                <div className="plasmo-flex plasmo-flex-col plasmo-gap-1">
                  <div className="plasmo-font-medium plasmo-text-gray-200">{message.userName}</div>
                  <div className="plasmo-text-xs plasmo-text-gray-400">
                    {new Date(message.timeOfMessage).toLocaleString([], { hour: '2-digit', minute: '2-digit', year: 'numeric', month: 'numeric', day: 'numeric' })}
                  </div>
                </div>
                <span className="plasmo-text-xs plasmo-bg-red-500/10 plasmo-text-red-400 plasmo-px-2 plasmo-py-1 plasmo-rounded-full plasmo-font-medium">
                  Harmful Content
                </span>
              </div>
              
              <div 
                className={`plasmo-mt-3 plasmo-p-3 plasmo-bg-gray-900/50 plasmo-rounded-md plasmo-text-sm plasmo-text-gray-300 ${
                  !revealedMessages[message.id] ? 'plasmo-blur-sm' : ''
                }`}
              >
                {message.messageContent}
              </div>
              
              <button
                onClick={() => toggleMessageReveal(message.id)}
                className="plasmo-mt-2 plasmo-flex plasmo-items-center plasmo-gap-2 plasmo-text-xs plasmo-text-blue-400 plasmo-hover:text-blue-300 plasmo-transition-colors"
              >
                <Eye className="plasmo-w-3.5 plasmo-h-3.5" />
                <span>{revealedMessages[message.id] ? 'Hide Message' : 'Show Message'}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessagesPage;