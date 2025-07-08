import React, { useState } from 'react';
import { API_CONFIG } from '../../config/api';
import axios from 'axios';

interface NetworkTestResult {
  endpoint: string;
  method: string;
  status: 'pending' | 'success' | 'error';
  statusCode?: number;
  message?: string;
  response?: any;
  headers?: any;
  time?: number;
  error?: string;
}

const NetworkTest: React.FC = () => {
  const [results, setResults] = useState<NetworkTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const testEndpoints = [
    {
      name: 'Backend Health Check',
      url: `${API_CONFIG.BASE_URL}/health`,
      method: 'GET'
    },
    {
      name: 'Backend Root',
      url: `${API_CONFIG.BASE_URL}/`,
      method: 'GET'
    },
    {
      name: 'API Base URL Check',
      url: `${API_CONFIG.API_URL}/health`,
      method: 'GET'
    },
    {
      name: 'User Data Endpoint',
      url: `${API_CONFIG.API_URL}/user/data`,
      method: 'GET'
    },
    {
      name: 'Auth Verify Endpoint',
      url: `${API_CONFIG.API_URL}/auth/verify`,
      method: 'GET'
    }
  ];

  const testSingleEndpoint = async (endpoint: { name: string; url: string; method: string }): Promise<NetworkTestResult> => {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Testing: ${endpoint.name} -> ${endpoint.url}`);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'SnakeChat-Frontend-Test/1.0'
      };

      // Thêm Authorization header nếu có token
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const config = {
        method: endpoint.method,
        url: endpoint.url,
        timeout: 10000,
        headers
      };

      const response = await axios(config);
      const responseTime = Date.now() - startTime;

      return {
        endpoint: endpoint.name,
        method: endpoint.method,
        status: 'success',
        statusCode: response.status,
        message: 'OK',
        response: response.data,
        headers: response.headers,
        time: responseTime
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ Error testing ${endpoint.name}:`, error);

      let errorMessage = 'Unknown error';
      let statusCode = 0;
      let responseData = null;

      if (error.response) {
        // Server responded with error status
        statusCode = error.response.status;
        errorMessage = error.response.data?.message || error.response.statusText || `HTTP ${statusCode}`;
        responseData = error.response.data;
      } else if (error.request) {
        // Network error
        errorMessage = 'Network Error - No response received';
      } else {
        errorMessage = error.message || 'Request setup error';
      }

      return {
        endpoint: endpoint.name,
        method: endpoint.method,
        status: 'error',
        statusCode,
        message: errorMessage,
        response: responseData,
        time: responseTime,
        error: error.message
      };
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    console.log('🚀 Bắt đầu test tất cả endpoints...');

    // Initialize results với trạng thái pending
    const initialResults = testEndpoints.map(endpoint => ({
      endpoint: endpoint.name,
      method: endpoint.method,
      status: 'pending' as const
    }));
    setResults(initialResults);

    // Test từng endpoint
    const testResults: NetworkTestResult[] = [];
    
    for (const endpoint of testEndpoints) {
      const result = await testSingleEndpoint(endpoint);
      testResults.push(result);
      
      // Update results incrementally
      setResults([...testResults]);
      
      // Log kết quả
      const statusIcon = result.status === 'success' ? '✅' : '❌';
      console.log(`${statusIcon} ${result.endpoint}: ${result.statusCode} - ${result.message} (${result.time}ms)`);
      
      // Pause giữa các request để tránh spam
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('✅ Hoàn thành test tất cả endpoints');
    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'pending': return '⏳';
      default: return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#4CAF50';
      case 'error': return '#f44336';
      case 'pending': return '#ff9800';
      default: return '#757575';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 rounded-t-lg">
          <h2 className="text-xl font-bold">🔍 Network & Backend Test</h2>
          <p className="text-blue-100">Kiểm tra kết nối đến Railway backend</p>
        </div>

        {/* Configuration Info */}
        <div className="p-4 bg-gray-50 border-b">
          <h3 className="font-semibold text-gray-800 mb-2">Cấu hình hiện tại:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>BASE_URL:</strong>
              <br />
              <code className="bg-gray-200 px-2 py-1 rounded text-xs break-all">
                {API_CONFIG.BASE_URL}
              </code>
            </div>
            <div>
              <strong>API_URL:</strong>
              <br />
              <code className="bg-gray-200 px-2 py-1 rounded text-xs break-all">
                {API_CONFIG.API_URL}
              </code>
            </div>
            <div>
              <strong>SOCKET_URL:</strong>
              <br />
              <code className="bg-gray-200 px-2 py-1 rounded text-xs break-all">
                {API_CONFIG.SOCKET_URL}
              </code>
            </div>
            <div>
              <strong>Token:</strong>
              <br />
              <code className="bg-gray-200 px-2 py-1 rounded text-xs">
                {localStorage.getItem('token') ? '✅ Có token' : '❌ Không có token'}
              </code>
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="p-4 border-b">
          <button
            onClick={runAllTests}
            disabled={isRunning}
            className={`px-6 py-2 rounded-lg font-medium ${
              isRunning
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isRunning ? '⏳ Đang test...' : '🚀 Chạy test tất cả'}
          </button>
        </div>

        {/* Results */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-800 mb-4">Kết quả test:</h3>
          
          {results.length === 0 ? (
            <p className="text-gray-500 italic">Chưa có kết quả test. Nhấn "Chạy test tất cả" để bắt đầu.</p>
          ) : (
            <div className="space-y-4">
              {results.map((result, index) => (
                <div 
                  key={index}
                  className="border rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getStatusIcon(result.status)}</span>
                      <span className="font-medium">{result.endpoint}</span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {result.method}
                      </span>
                    </div>
                    <div className="text-right">
                      <div style={{ color: getStatusColor(result.status), fontWeight: 'bold' }}>
                        {result.statusCode || 'N/A'}
                      </div>
                      {result.time && (
                        <div className="text-xs text-gray-500">
                          {result.time}ms
                        </div>
                      )}
                    </div>
                  </div>

                  {result.message && (
                    <div className="text-sm text-gray-600 mb-2">
                      <strong>Message:</strong> {result.message}
                    </div>
                  )}

                  {result.error && (
                    <div className="text-sm text-red-600 mb-2">
                      <strong>Error:</strong> {result.error}
                    </div>
                  )}

                  {result.response && (
                    <div className="text-xs bg-white p-2 rounded border mt-2">
                      <strong>Response:</strong>
                      <pre className="mt-1 overflow-x-auto">
                        {JSON.stringify(result.response, null, 2)}
                      </pre>
                    </div>
                  )}

                  {result.headers && (
                    <details className="text-xs mt-2">
                      <summary className="cursor-pointer text-blue-600">Headers</summary>
                      <pre className="mt-1 bg-white p-2 rounded border overflow-x-auto">
                        {JSON.stringify(result.headers, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Troubleshooting */}
        <div className="p-4 bg-yellow-50 border-t">
          <h3 className="font-semibold text-yellow-800 mb-2">💡 Gợi ý khắc phục lỗi:</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• <strong>500 Internal Server Error:</strong> Backend có lỗi code hoặc database</li>
            <li>• <strong>404 Not Found:</strong> Endpoint không tồn tại hoặc routing sai</li>
            <li>• <strong>Network Error:</strong> Không thể kết nối đến server</li>
            <li>• <strong>CORS Error:</strong> Backend chưa cấu hình CORS cho frontend domain</li>
            <li>• <strong>401 Unauthorized:</strong> Token không hợp lệ hoặc hết hạn</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NetworkTest; 