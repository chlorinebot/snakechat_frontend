import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../../config/api';
import axios from 'axios';

interface EndpointStatus {
  endpoint: string;
  status: 'loading' | 'success' | 'error';
  statusCode?: number;
  message?: string;
  responseTime?: number;
}

const DebugPanel: React.FC = () => {
  const [endpointStatuses, setEndpointStatuses] = useState<EndpointStatus[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  const testEndpoints = [
    { endpoint: '/health', description: 'Health Check' },
    { endpoint: '/api/user/data', description: 'Get Users' },
    { endpoint: '/api/auth/verify', description: 'Auth Verify' },
    { endpoint: '/api/friendship/friends/1', description: 'Get Friends' },
    { endpoint: '/api/conversations/user/1', description: 'Get Conversations' },
  ];

  const testEndpoint = async (endpoint: string): Promise<EndpointStatus> => {
    const startTime = Date.now();
    const fullUrl = `${API_CONFIG.BASE_URL}${endpoint}`;
    
    try {
      const response = await axios.get(fullUrl, {
        timeout: 10000,
        headers: {
          'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : undefined
        }
      });
      
      const responseTime = Date.now() - startTime;
      
      return {
        endpoint,
        status: 'success',
        statusCode: response.status,
        message: 'OK',
        responseTime
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        endpoint,
        status: 'error',
        statusCode: error.response?.status || 0,
        message: error.response?.data?.message || error.message || 'Network Error',
        responseTime
      };
    }
  };

  const runTests = async () => {
    console.log('🔍 Bắt đầu kiểm tra các endpoint...');
    
    // Reset trạng thái
    const initialStatuses = testEndpoints.map(({ endpoint }) => ({
      endpoint,
      status: 'loading' as const
    }));
    setEndpointStatuses(initialStatuses);

    // Test từng endpoint
    const results = await Promise.all(
      testEndpoints.map(({ endpoint }) => testEndpoint(endpoint))
    );

    setEndpointStatuses(results);
    
    // Log kết quả
    results.forEach(result => {
      const statusIcon = result.status === 'success' ? '✅' : '❌';
      console.log(`${statusIcon} ${result.endpoint}: ${result.statusCode} - ${result.message} (${result.responseTime}ms)`);
    });
  };

  useEffect(() => {
    runTests();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#4CAF50';
      case 'error': return '#f44336';
      case 'loading': return '#ff9800';
      default: return '#757575';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'loading': return '⏳';
      default: return '❓';
    }
  };

  if (!isVisible) {
    return (
      <div 
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          background: '#2196F3',
          color: 'white',
          padding: '10px 15px',
          borderRadius: '5px',
          cursor: 'pointer',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
        }}
        onClick={() => setIsVisible(true)}
      >
        🔍 Debug API
      </div>
    );
  }

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '400px',
        maxHeight: '500px',
        background: 'white',
        border: '1px solid #ddd',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        zIndex: 9999,
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div 
        style={{
          background: '#2196F3',
          color: 'white',
          padding: '15px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <h3 style={{ margin: 0, fontSize: '16px' }}>🔍 API Debug Panel</h3>
        <button 
          onClick={() => setIsVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '18px',
            cursor: 'pointer'
          }}
        >
          ×
        </button>
      </div>

      {/* Configuration Info */}
      <div style={{ padding: '15px', borderBottom: '1px solid #eee' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#333' }}>Cấu hình API:</h4>
        <div style={{ fontSize: '12px', color: '#666' }}>
          <div><strong>BASE_URL:</strong> {API_CONFIG.BASE_URL}</div>
          <div><strong>API_URL:</strong> {API_CONFIG.API_URL}</div>
          <div><strong>SOCKET_URL:</strong> {API_CONFIG.SOCKET_URL}</div>
        </div>
      </div>

      {/* Test Results */}
      <div style={{ padding: '15px', maxHeight: '300px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', color: '#333' }}>Trạng thái Endpoints:</h4>
          <button 
            onClick={runTests}
            style={{
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '3px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            🔄 Test lại
          </button>
        </div>

        {endpointStatuses.map((status, index) => {
          const testEndpoint = testEndpoints[index];
          return (
            <div 
              key={status.endpoint}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px',
                marginBottom: '5px',
                background: '#f5f5f5',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              <div>
                <div style={{ fontWeight: 'bold', color: '#333' }}>
                  {getStatusIcon(status.status)} {testEndpoint.description}
                </div>
                <div style={{ color: '#666', fontSize: '11px' }}>
                  {status.endpoint}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: getStatusColor(status.status), fontWeight: 'bold' }}>
                  {status.statusCode || 'N/A'}
                </div>
                {status.responseTime && (
                  <div style={{ color: '#666', fontSize: '11px' }}>
                    {status.responseTime}ms
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Error Summary */}
      {endpointStatuses.some(s => s.status === 'error') && (
        <div style={{ padding: '15px', background: '#ffebee', borderTop: '1px solid #eee' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#d32f2f' }}>⚠️ Phát hiện lỗi:</h4>
          <div style={{ fontSize: '12px', color: '#d32f2f' }}>
            {endpointStatuses
              .filter(s => s.status === 'error')
              .map(s => (
                <div key={s.endpoint}>• {s.endpoint}: {s.message}</div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugPanel; 