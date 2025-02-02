import React, { useEffect, useState } from 'react';
import { User, ExternalLink, Loader2, MessageSquare } from 'lucide-react';
import { isAuthenticated, getToken } from '../../utils/auth';
import { useNavigation } from '../popupui';

const BlockedPage = () => {
  const [hiddenUsers, setHiddenUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ totalHiddenUsers: 0, totalHiddenMessages: 0 });
  const { setCurrentPage } = useNavigation();

  useEffect(() => {
    const fetchHiddenUsers = async () => {
      const authenticated = await isAuthenticated();
      if (authenticated) {
        try {
          const token = await getToken();
          const response = await fetch("https://harassment-saver-extension.onrender.com/api/v1/user/hidden-users", {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const data = await response.json();
          
          if (data.status === 'success') {
            setHiddenUsers(data.data.hiddenUsers || []);
            setStats({
              totalHiddenUsers: data.data.hiddenUsers?.length || 0,
              totalHiddenMessages: data.data.totalHiddenMessages || 0
            });
          } else {
            setError('Failed to fetch hidden users');
          }
        } catch (error) {
          setError('An error occurred while fetching hidden users');
        } finally {
          setLoading(false);
        }
      } else {
        setError('Please log in to view hidden users');
        setLoading(false);
      }
    };

    fetchHiddenUsers();
  }, []);

  const handleViewDashboard = () => {
    chrome.tabs.create({
      url: 'https://dashboard-azure-one.vercel.app/admin/profile'
    });
  };

  const handleViewProfile = (profileUrl) => {
    if (profileUrl) {
      chrome.tabs.create({ url: profileUrl });
    }
  };

  const handleViewMessages = () => {
    setCurrentPage('messages');
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
      <div className="plasmo-p-4 plasmo-text-center" style={{ userSelect: 'none' }}>
        <div className="plasmo-text-red-400 plasmo-mb-4">{error}</div>
        {error === 'Please log in to view hidden users' && (
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
    <div className="plasmo-p-4" style={{ userSelect: 'none' }}>
      <div className="plasmo-flex plasmo-justify-between plasmo-items-center plasmo-mb-6">
        <h2 className="plasmo-text-xl plasmo-font-semibold">Hidden Users</h2>
        <button
          onClick={handleViewDashboard}
          className="plasmo-flex plasmo-items-center plasmo-gap-2 plasmo-text-sm plasmo-text-blue-500 plasmo-hover:text-blue-400"
        >
          <span>View All</span>
          <ExternalLink className="plasmo-w-4 plasmo-h-4" />
        </button>
      </div>

      <div className="plasmo-bg-gray-800/50 plasmo-rounded-lg plasmo-p-3 plasmo-mb-4 plasmo-flex plasmo-justify-between">
        <div>
          <div className="plasmo-text-sm plasmo-text-gray-400">Total Hidden</div>
          <div className="plasmo-text-lg plasmo-font-semibold">{stats.totalHiddenUsers || 0} users</div>
        </div>
        <div 
          className="plasmo-cursor-pointer hover:plasmo-opacity-80"
          onClick={handleViewMessages}
        >
          <div className="plasmo-text-sm plasmo-text-gray-400">Messages Hidden</div>
          <div className="plasmo-text-lg plasmo-font-semibold plasmo-flex plasmo-items-center plasmo-gap-2">
            {stats.totalHiddenMessages || 0}
            <MessageSquare className="plasmo-w-4 plasmo-h-4 plasmo-text-blue-500" />
          </div>
        </div>
      </div>

      {hiddenUsers.length === 0 ? (
        <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-h-64 plasmo-text-gray-400">
          <User className="plasmo-w-12 plasmo-h-12 plasmo-mb-4 plasmo-opacity-50" />
          <p>No hidden users yet</p>
        </div>
      ) : (
        <div className="plasmo-space-y-3">
          {hiddenUsers.map((user) => (
            <div 
              key={user.id} 
              className="plasmo-bg-gray-800 plasmo-rounded-lg plasmo-p-3 plasmo-border plasmo-border-gray-700"
            >
              <div className="plasmo-flex plasmo-items-center plasmo-gap-3">
                <div 
                  className="plasmo-w-10 plasmo-h-10 plasmo-rounded-full plasmo-overflow-hidden plasmo-bg-gray-700 plasmo-flex plasmo-items-center plasmo-justify-center"
                  onClick={() => handleViewProfile(user.profileUrl)}
                  style={{ cursor: user.profileUrl ? 'pointer' : 'default' }}
                >
                  {user.profilePicture ? (
                    <img 
                      src={user.profilePicture} 
                      alt={user.name} 
                      className="plasmo-w-full plasmo-h-full plasmo-object-cover"
                    />
                  ) : (
                    <User className="plasmo-w-5 plasmo-h-5 plasmo-text-gray-400" />
                  )}
                </div>
                
                <div className="plasmo-flex-1">
                  <a 
                    href={user.profileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="plasmo-font-medium plasmo-mb-1 plasmo-text-blue-500 plasmo-hover:underline"
                  >
                    {user.name}
                  </a>
                  <div className="plasmo-flex plasmo-items-center plasmo-gap-2 plasmo-text-sm plasmo-text-gray-400">
                    <MessageSquare className="plasmo-w-4 plasmo-h-4" />
                    <span>{user.totalMessagesHidden || 0} messages hidden</span>
                  </div>
                  <div className="plasmo-text-xs plasmo-text-gray-500">Platform: {user.platform}</div>
                </div>
              </div>

              {user.firstMessageHidden && (
                <div className="plasmo-mt-2 plasmo-pt-2 plasmo-border-t plasmo-border-gray-700">
                  <div className="plasmo-grid plasmo-grid-cols-2 plasmo-gap-2 plasmo-text-sm">
                    <div className="plasmo-text-gray-400">First Hidden:</div>
                    <div>{new Date(user.firstMessageHidden).toLocaleDateString()}</div>
                    
                    <div className="plasmo-text-gray-400">Last Hidden:</div>
                    <div>{new Date(user.lastMessageHidden).toLocaleDateString()}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlockedPage;