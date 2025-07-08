import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../../config/api';

interface BackendStatus {
  isOnline: boolean;
  baseUrl: string;
  apiUrl: string;
  rootEndpoint: {
    status: 'checking' | 'success' | 'error';
    message?: string;
    responseTime?: number;
  };
  apiEndpoints: {
    status: 'checking' | 'success' | 'error';
    endpoints: Array<{
      name: string;
      url: string;
      status: 'checking' | 'success' | 'error';
      message?: string;
      statusCode?: number;
    }>;
  };
}

const BackendStatus: React.FC = () => {
  const [status, setStatus] = useState<BackendStatus>({
    isOnline: false,
    baseUrl: API_CONFIG.BASE_URL,
    apiUrl: API_CONFIG.API_URL,
    rootEndpoint: { status: 'checking' },
    apiEndpoints: {
      status: 'checking',
      endpoints: []
    }
  });

  const checkBackendStatus = async () => {
    console.log('🔍 Checking backend status...');
    
    // Reset status
    setStatus(prev => ({
      ...prev,
      rootEndpoint: { status: 'checking' },
      apiEndpoints: { status: 'checking', endpoints: [] }
    }));

    try {
      // Test root endpoint
      const rootStartTime = Date.now();
      const rootResponse = await fetch(`${API_CONFIG.BASE_URL}/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const rootResponseTime = Date.now() - rootStartTime;

      if (rootResponse.ok) {
        const rootData = await rootResponse.text();
        setStatus(prev => ({
          ...prev,
          isOnline: true,
          rootEndpoint: {
            status: 'success',
            message: rootData,
            responseTime: rootResponseTime
          }
        }));

        // Test API endpoints
        const apiEndpoints = [
          { name: 'User Data', url: '/api/user/data' },
          { name: 'Auth Verify', url: '/api/auth/verify' },
          { name: 'Friendship Friends', url: '/api/friendship/friends/1' },
          { name: 'Conversations', url: '/api/conversations/user/1' }
        ];

        const endpointResults: Array<{
          name: string;
          url: string;
          status: 'success' | 'error';
          message?: string;
          statusCode?: number;
        }> = [];
        
        for (const endpoint of apiEndpoints) {
          try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint.url}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });

            const responseText = await response.text();
            
            endpointResults.push({
              name: endpoint.name,
              url: endpoint.url,
              status: response.ok ? 'success' : 'error',
              message: responseText.substring(0, 100),
              statusCode: response.status
            });
          } catch (error: any) {
            endpointResults.push({
              name: endpoint.name,
              url: endpoint.url,
              status: 'error',
              message: error.message,
              statusCode: 0
            });
          }
        }

        setStatus(prev => ({
          ...prev,
          apiEndpoints: {
            status: endpointResults.some(r => r.status === 'success') ? 'success' : 'error',
            endpoints: endpointResults
          }
        }));

      } else {
        throw new Error(`HTTP ${rootResponse.status}`);
      }

    } catch (error: any) {
      console.error('Backend check failed:', error);
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        rootEndpoint: {
          status: 'error',
          message: error.message
        }
      }));
    }
  };

  useEffect(() => {
    checkBackendStatus();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'checking': return '⏳';
      default: return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#10B981';
      case 'error': return '#EF4444';
      case 'checking': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-2">🔧 Backend Status Dashboard</h2>
        <p className="text-blue-100">Kiểm tra trạng thái và khắc phục lỗi backend Railway</p>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex space-x-4">
          <button
            onClick={checkBackendStatus}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            🔄 Kiểm tra lại
          </button>
          <button
            onClick={() => window.open('https://railway.app/project', '_blank')}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            🚂 Mở Railway Dashboard
          </button>
        </div>
      </div>

      {/* Backend URL Info */}
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="font-semibold text-gray-800 mb-3">🔗 Backend URLs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <strong>Base URL:</strong>
            <div className="bg-gray-100 p-2 rounded text-sm break-all">
              {status.baseUrl}
            </div>
          </div>
          <div>
            <strong>API URL:</strong>
            <div className="bg-gray-100 p-2 rounded text-sm break-all">
              {status.apiUrl}
            </div>
          </div>
        </div>
      </div>

      {/* Root Endpoint Status */}
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="font-semibold text-gray-800 mb-3">🏠 Root Endpoint Status</h3>
        <div className="flex items-center space-x-3 mb-2">
          <span className="text-xl">{getStatusIcon(status.rootEndpoint.status)}</span>
          <span style={{ color: getStatusColor(status.rootEndpoint.status), fontWeight: 'bold' }}>
            {status.rootEndpoint.status.toUpperCase()}
          </span>
          {status.rootEndpoint.responseTime && (
            <span className="text-sm text-gray-500">
              ({status.rootEndpoint.responseTime}ms)
            </span>
          )}
        </div>
        {status.rootEndpoint.message && (
          <div className="bg-gray-50 p-3 rounded text-sm">
            <strong>Response:</strong> {status.rootEndpoint.message}
          </div>
        )}
      </div>

      {/* API Endpoints Status */}
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="font-semibold text-gray-800 mb-3">🔌 API Endpoints Status</h3>
        {status.apiEndpoints.endpoints.length === 0 ? (
          <div className="text-gray-500 text-center py-4">
            {status.rootEndpoint.status === 'checking' ? 'Đang kiểm tra...' : 'Chưa có dữ liệu'}
          </div>
        ) : (
          <div className="space-y-3">
            {status.apiEndpoints.endpoints.map((endpoint, index) => (
              <div key={index} className="border rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getStatusIcon(endpoint.status)}</span>
                    <span className="font-medium">{endpoint.name}</span>
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                      {endpoint.url}
                    </span>
                  </div>
                  <div style={{ color: getStatusColor(endpoint.status), fontWeight: 'bold' }}>
                    {endpoint.statusCode || 'N/A'}
                  </div>
                </div>
                {endpoint.message && (
                  <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    {endpoint.message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Troubleshooting Guide */}
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-3">🚨 Hướng dẫn khắc phục lỗi</h3>
        
        {!status.isOnline ? (
          <div className="space-y-2 text-yellow-700">
            <h4 className="font-medium">❌ Backend không hoạt động:</h4>
            <ul className="ml-4 space-y-1 text-sm">
              <li>• Kiểm tra Railway dashboard xem service có đang chạy không</li>
              <li>• Xem logs trên Railway để tìm lỗi</li>
              <li>• Kiểm tra domain name có đúng không</li>
              <li>• Thử restart service trên Railway</li>
            </ul>
          </div>
        ) : status.apiEndpoints.status === 'error' ? (
          <div className="space-y-2 text-yellow-700">
            <h4 className="font-medium">⚠️ API endpoints có lỗi:</h4>
            <ul className="ml-4 space-y-1 text-sm">
              <li>• <strong>500 Internal Server Error:</strong> Lỗi code trong backend hoặc database</li>
              <li>• <strong>Database connection error:</strong> Kiểm tra MySQL database có hoạt động không</li>
              <li>• <strong>Environment variables:</strong> Kiểm tra các biến môi trường (DB_HOST, DB_PASSWORD...)</li>
              <li>• <strong>CORS issues:</strong> Kiểm tra cấu hình CORS trong backend</li>
            </ul>
          </div>
        ) : (
          <div className="text-green-700">
            <h4 className="font-medium">✅ Backend đang hoạt động tốt!</h4>
            <p className="text-sm">Tất cả endpoints đều phản hồi bình thường.</p>
          </div>
        )}

        <div className="mt-4 p-3 bg-white rounded border">
          <h4 className="font-medium text-gray-800 mb-2">🔍 Các bước debug chi tiết:</h4>
          <ol className="text-sm text-gray-700 space-y-1">
            <li>1. Mở Railway dashboard và kiểm tra logs của backend service</li>
            <li>2. Kiểm tra database MySQL có kết nối được không</li>
            <li>3. Xem biến môi trường DATABASE_URL có đúng không</li>
            <li>4. Test lại từng API endpoint riêng lẻ</li>
            <li>5. Kiểm tra CORS configuration cho frontend domain</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default BackendStatus; 