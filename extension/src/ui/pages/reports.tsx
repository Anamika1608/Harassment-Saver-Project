import React, { useEffect, useState } from 'react';
import { FileText, ExternalLink, Loader2 } from 'lucide-react';
import { isAuthenticated, getToken } from '../../utils/auth';

const ReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      const authenticated = await isAuthenticated();
      if (authenticated) {
        try {
          const token = await getToken();
          const response = await fetch("https://harassment-saver-extension.onrender.com/api/v1/user/saved-reports", {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const data = await response.json();
          
          if (data.status === 'success') {
            setReports(data.data.reports);
            setPagination(data.data.pagination);
          } else {
            setError('Failed to fetch reports');
          }
        } catch (error) {
          setError('An error occurred while fetching reports');
        } finally {
          setLoading(false);
        }
      } else {
        setError('Please log in to view reports');
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const handleViewDashboard = () => {
    chrome.tabs.create({
      url: 'https://dashboard-azure-one.vercel.app/admin/profile'
    });
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
        {error === 'Please log in to view reports' && (
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
        <h2 className="plasmo-text-xl plasmo-font-semibold">Reports</h2>
        {pagination?.total > 10 && (
          <button
            onClick={handleViewDashboard}
            className="plasmo-flex plasmo-items-center plasmo-gap-2 plasmo-text-sm plasmo-text-blue-500 plasmo-hover:text-blue-400"
          >
            <span>View All</span>
            <ExternalLink className="plasmo-w-4 plasmo-h-4" />
          </button>
        )}
      </div>

      {reports.length === 0 ? (
        <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-h-64 plasmo-text-gray-400">
          <FileText className="plasmo-w-12 plasmo-h-12 plasmo-mb-4 plasmo-opacity-50" />
          <p>No reports generated yet</p>
        </div>
      ) : (
        <div className="plasmo-space-y-4">
          {reports.map((report, index) => (
            <div 
              key={index} 
              className="plasmo-bg-gray-800 plasmo-rounded-lg plasmo-p-4 plasmo-border plasmo-border-gray-700"
            >
              <div className="plasmo-grid plasmo-grid-cols-2 plasmo-gap-2 plasmo-text-sm">
                <div className="plasmo-text-gray-400">User:</div>
                <div>{report.userName}</div>
                
                <div className="plasmo-text-gray-400">Platform:</div>
                <div>{report.platform}</div>
                
                <div className="plasmo-text-gray-400">Type:</div>
                <div>{report.reportType}</div>
                
                <div className="plasmo-text-gray-400">Status:</div>
                <div>
                  <span className={`plasmo-px-2 plasmo-py-1 plasmo-rounded-full plasmo-text-xs ${
                    report.reportStatus === 'Open' 
                      ? 'plasmo-bg-green-500/20 plasmo-text-green-400'
                      : 'plasmo-bg-gray-500/20 plasmo-text-gray-400'
                  }`}>
                    {report.reportStatus}
                  </span>
                </div>
                
                <div className="plasmo-text-gray-400">Generated:</div>
                <div>{new Date(report.metadata.generatedAt).toLocaleDateString()}</div>
                
                <div className="plasmo-text-gray-400">Evidence:</div>
                <div>{report.metadata.totalEvidence} items</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;