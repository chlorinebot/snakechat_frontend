import React, { useState } from 'react';
import axios from 'axios';
import { API_CONFIG } from '../../config/api';

interface TestResult {
  endpoint: string;
  status: string;
  response?: any;
  error?: string;
  time: number;
}

const TestConnection: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const testEndpoints = [
    { name: 'API Health', url: `${API_CONFIG.API_URL}/health` },
    { name: 'User Data', url: `${API_CONFIG.API_URL}/user/data` },
    { name: 'Auth Check', url: `${API_CONFIG.API_URL}/auth/check` },
  ];

  const testSingleEndpoint = async (endpoint: { name: string; url: string }) => {
    const startTime = Date.now();
    try {
      const response = await axios.get(endpoint.url, {
        timeout: 10000, // 10 seconds timeout
      });
      const endTime = Date.now();
      
      return {
        endpoint: endpoint.name,
        status: 'SUCCESS',
        response: response.data,
        time: endTime - startTime
      };
    } catch (error: any) {
      const endTime = Date.now();
      return {
        endpoint: endpoint.name,
        status: 'FAILED',
        error: error.response?.data?.message || error.message || 'Unknown error',
        time: endTime - startTime
      };
    }
  };

  const runAllTests = async () => {
    setIsLoading(true);
    setResults([]);
    
    console.log('🚀 Bắt đầu test kết nối API...');
    console.log('📡 Base URL:', API_CONFIG.API_URL);
    
    const testResults: TestResult[] = [];
    
    for (const endpoint of testEndpoints) {
      console.log(`🔍 Đang test: ${endpoint.name} - ${endpoint.url}`);
      const result = await testSingleEndpoint(endpoint);
      testResults.push(result);
      setResults([...testResults]);
      
      console.log(`${result.status === 'SUCCESS' ? '✅' : '❌'} ${endpoint.name}: ${result.status} (${result.time}ms)`);
      if (result.error) {
        console.error(`   Error: ${result.error}`);
      }
    }
    
    setIsLoading(false);
    console.log('🏁 Test hoàn tất!');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'text-green-600';
      case 'FAILED': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">🔧 Test Kết Nối API</h2>
      
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Cấu hình API hiện tại:</h3>
        <p><strong>API URL:</strong> {API_CONFIG.API_URL}</p>
        <p><strong>Socket URL:</strong> {API_CONFIG.SOCKET_URL}</p>
        <p><strong>Base URL:</strong> {API_CONFIG.BASE_URL}</p>
      </div>

      <button
        onClick={runAllTests}
        disabled={isLoading}
        className={`px-6 py-3 rounded-lg font-semibold mb-6 ${
          isLoading 
            ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isLoading ? '🔄 Đang test...' : '🚀 Chạy Test'}
      </button>

      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">📊 Kết quả Test:</h3>
          
          {results.map((result, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold">{result.endpoint}</h4>
                <span className={`font-bold ${getStatusColor(result.status)}`}>
                  {result.status} ({result.time}ms)
                </span>
              </div>
              
              {result.error && (
                <div className="text-red-600 text-sm mb-2">
                  <strong>Lỗi:</strong> {result.error}
                </div>
              )}
              
              {result.response && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-blue-600">Xem response</summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(result.response, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">💡 Gợi ý sửa lỗi:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Kiểm tra Railway backend có đang chạy không</li>
              <li>• Xác minh URL API trong file config</li>
              <li>• Kiểm tra CORS settings</li>
              <li>• Xem logs Railway để tìm lỗi server</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestConnection; 