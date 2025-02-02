import React, { useEffect, useState } from 'react';
import { Hash, Plus, Loader2, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { isAuthenticated, getToken } from '../../utils/auth';

const KeywordsPage = () => {
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newKeyword, setNewKeyword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchKeywords();
  }, []);

  const showSyncStatus = (type, message) => {
    setSyncStatus({ type, message });
    setTimeout(() => setSyncStatus({ type: '', message: '' }), 3000);
  };

  const fetchKeywords = async () => {
    const authenticated = await isAuthenticated();
    if (authenticated) {
      try {
        const token = await getToken();
        const response = await fetch("https://harassment-saver-extension.onrender.com/api/v1/user/blacklisted-keywords", {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        
        if (data.status === 'success') {
          setKeywords(data.data.keywords);
          chrome.storage.local.set({ blacklistedKeywords: data.data.keywords });
        } else {
          setError('Failed to fetch keywords');
        }
      } catch (error) {
        setError('An error occurred while fetching keywords');
      } finally {
        setLoading(false);
      }
    } else {
      setError('Please log in to manage keywords');
      setLoading(false);
    }
  };

  const handleAddKeyword = async () => {
    const trimmedKeyword = newKeyword.trim().toLowerCase();
    if (!trimmedKeyword) return;
    
    // Check for duplicates
    if (keywords.includes(trimmedKeyword)) {
      showSyncStatus('error', 'This keyword already exists');
      return;
    }
    
    setIsSubmitting(true);
    showSyncStatus('syncing', 'Saving keyword...');
    
    try {
      const token = await getToken();
      const updatedKeywords = [...keywords, trimmedKeyword];
      
      const response = await fetch("https://harassment-saver-extension.onrender.com/api/v1/user/blacklist-keywords", {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ keywords: updatedKeywords })
      });
      
      const data = await response.json();
      if (data.status === 'success') {
        setKeywords(updatedKeywords);
        setNewKeyword('');
        chrome.storage.local.set({ blacklistedKeywords: updatedKeywords });
        showSyncStatus('success', 'Keyword added successfully');
      } else {
        showSyncStatus('error', 'Failed to add keyword');
      }
    } catch (error) {
      showSyncStatus('error', 'Failed to add keyword');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveKeyword = async (keywordToRemove) => {
    showSyncStatus('syncing', 'Removing keyword...');
    try {
      const token = await getToken();
      const updatedKeywords = keywords.filter(k => k !== keywordToRemove);
      
      const response = await fetch("https://harassment-saver-extension.onrender.com/api/v1/user/blacklist-keywords", {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ keywords: updatedKeywords })
      });
      
      const data = await response.json();
      if (data.status === 'success') {
        setKeywords(updatedKeywords);
        chrome.storage.local.set({ blacklistedKeywords: updatedKeywords });
        showSyncStatus('success', 'Keyword removed successfully');
      } else {
        showSyncStatus('error', 'Failed to remove keyword');
      }
    } catch (error) {
      showSyncStatus('error', 'Failed to remove keyword');
    }
  };

  const renderSyncStatus = () => {
    if (!syncStatus.message) return null;

    const statusColors = {
      success: 'plasmo-text-green-400',
      error: 'plasmo-text-red-400',
      syncing: 'plasmo-text-blue-400'
    };

    const StatusIcon = {
      success: CheckCircle2,
      error: AlertCircle,
      syncing: Loader2
    }[syncStatus.type];

    return (
      <div className={`plasmo-flex plasmo-items-center plasmo-gap-2 plasmo-text-sm ${statusColors[syncStatus.type]}`}>
        <StatusIcon className={`plasmo-w-4 plasmo-h-4 ${syncStatus.type === 'syncing' ? 'plasmo-animate-spin' : ''}`} />
        <span>{syncStatus.message}</span>
      </div>
    );
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
        {error === 'Please log in to manage keywords' && (
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
    <div className="plasmo-p-4">
      <div className="plasmo-flex plasmo-justify-between plasmo-items-center plasmo-mb-6">
        <div className="plasmo-flex plasmo-items-center plasmo-gap-2">
          <Hash className="plasmo-w-5 plasmo-h-5 plasmo-text-blue-500" />
          <h2 className="plasmo-text-lg plasmo-font-medium">Blacklisted Keywords</h2>
        </div>
      </div>

      <div className="plasmo-space-y-4">
        <div className="plasmo-flex plasmo-gap-2">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
            placeholder="Add new keyword..."
            className="plasmo-flex-1 plasmo-bg-gray-800 plasmo-rounded-md plasmo-p-2 plasmo-text-sm plasmo-border plasmo-border-gray-700 focus:plasmo-outline-none focus:plasmo-border-blue-500"
          />
          <button
            onClick={handleAddKeyword}
            disabled={isSubmitting || !newKeyword.trim()}
            className="plasmo-bg-blue-600 plasmo-text-white plasmo-px-4 plasmo-py-2 plasmo-rounded-md plasmo-hover:bg-blue-700 plasmo-transition-colors plasmo-disabled:opacity-50 plasmo-disabled:cursor-not-allowed plasmo-flex plasmo-items-center plasmo-gap-2"
          >
            <Plus className="plasmo-w-4 plasmo-h-4" />
            Add
          </button>
        </div>

        {renderSyncStatus()}
      </div>

      {keywords.length === 0 ? (
        <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-h-32 plasmo-text-gray-400 plasmo-mt-8">
          <Hash className="plasmo-w-8 plasmo-h-8 plasmo-mb-2 plasmo-opacity-50" />
          <p>No blacklisted keywords</p>
        </div>
      ) : (
        <div className="plasmo-flex plasmo-flex-wrap plasmo-gap-2 plasmo-mt-6">
          {keywords.map((keyword) => (
            <div
              key={keyword}
              className="plasmo-bg-gray-800 plasmo-rounded-md plasmo-px-3 plasmo-py-1.5 plasmo-text-sm plasmo-flex plasmo-items-center plasmo-gap-2 plasmo-border plasmo-border-gray-700"
            >
              {keyword}
              <button
                onClick={() => handleRemoveKeyword(keyword)}
                className="plasmo-text-gray-400 plasmo-hover:text-red-400 plasmo-transition-colors"
              >
                <X className="plasmo-w-4 plasmo-h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default KeywordsPage;