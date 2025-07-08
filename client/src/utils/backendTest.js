// Simple backend test script
const API_BASE_URL = 'https://snakechatbackend.up.railway.app';

async function testBackendEndpoints() {
  console.log('🚀 Bắt đầu test backend endpoints...');
  console.log('🔗 Backend URL:', API_BASE_URL);
  
  const endpoints = [
    { name: 'Health Check', url: '/health' },
    { name: 'Root Endpoint', url: '/' },
    { name: 'API Health', url: '/api/health' },
    { name: 'User Data', url: '/api/user/data' },
    { name: 'Auth Verify', url: '/api/auth/verify' }
  ];

  for (const endpoint of endpoints) {
    const fullUrl = `${API_BASE_URL}${endpoint.url}`;
    console.log(`\n🔍 Testing: ${endpoint.name}`);
    console.log(`📍 URL: ${fullUrl}`);
    
    try {
      const startTime = Date.now();
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SnakeChat-Test/1.0'
        },
        // Không cache để có kết quả mới nhất
        cache: 'no-cache'
      });
      
      const responseTime = Date.now() - startTime;
      const contentType = response.headers.get('content-type');
      
      console.log(`✅ Status: ${response.status} ${response.statusText}`);
      console.log(`⏱️  Response Time: ${responseTime}ms`);
      console.log(`📋 Content-Type: ${contentType}`);
      
      // Thử parse response
      try {
        const data = await response.text();
        console.log(`📄 Response:`, data.substring(0, 200));
        
        // Nếu là JSON, thử parse
        if (contentType && contentType.includes('application/json')) {
          try {
            const jsonData = JSON.parse(data);
            console.log(`📊 JSON Data:`, jsonData);
          } catch (e) {
            console.log('⚠️  Response không phải JSON hợp lệ');
          }
        }
      } catch (e) {
        console.log('❌ Không thể đọc response body:', e.message);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.log('🌐 Network Error - Không thể kết nối đến server');
      }
    }
  }
  
  console.log('\n✅ Hoàn thành test tất cả endpoints');
}

// Export function để có thể gọi từ browser console
window.testBackendEndpoints = testBackendEndpoints;

// Auto run khi load file
if (typeof window !== 'undefined') {
  console.log('🔧 Backend Test Tool đã sẵn sàng!');
  console.log('📞 Chạy: testBackendEndpoints() để bắt đầu test');
}

export default testBackendEndpoints; 