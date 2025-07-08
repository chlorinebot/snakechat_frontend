import axios from 'axios';
import { toast } from 'react-toastify';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  isNetworkError: boolean;
}

// Simple wrapper function for API calls with retry logic
export const handleApiCall = async <T>(
  apiCall: () => Promise<T>,
  endpoint: string,
  maxRetries: number = 3,
  showToast: boolean = false
): Promise<T | null> => {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await apiCall();
      return result;
    } catch (error) {
      lastError = error;
      
      const apiError = parseError(error);
      console.error(`❌ API Error [${endpoint}] (Attempt ${attempt + 1}/${maxRetries + 1}):`, {
        message: apiError.message,
        status: apiError.status,
        isNetworkError: apiError.isNetworkError
      });

      // Check if we should retry
      const shouldRetry = shouldRetryError(apiError) && attempt < maxRetries;
      
      if (shouldRetry) {
        console.log(`🔄 Retrying ${endpoint} (attempt ${attempt + 2}/${maxRetries + 1})`);
        await delay(1000 * (attempt + 1)); // Exponential backoff
      } else {
        // Show error toast on final failure if enabled
        if (showToast) {
          showErrorToast(apiError, endpoint);
        }
        break;
      }
    }
  }
  
  return null;
};

const parseError = (error: any): ApiError => {
  // Check if it's an axios error with response
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data as any;
    
    let message = 'Đã xảy ra lỗi không xác định';
    
    switch (status) {
      case 400:
        message = data?.message || 'Dữ liệu gửi lên không hợp lệ';
        break;
      case 401:
        message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        break;
      case 403:
        message = 'Bạn không có quyền thực hiện hành động này';
        break;
      case 404:
        message = data?.message || 'Không tìm thấy dữ liệu hoặc endpoint không tồn tại';
        break;
      case 429:
        message = 'Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.';
        break;
      case 500:
        message = data?.message || 'Lỗi server nội bộ. Vui lòng thử lại sau.';
        break;
      case 502:
      case 503:
      case 504:
        message = 'Server đang bảo trì hoặc quá tải. Vui lòng thử lại sau.';
        break;
      default:
        message = data?.message || `Lỗi HTTP ${status}`;
    }
    
    return {
      message,
      status,
      isNetworkError: false
    };
  } else if (error.request) {
    // Network errors (no response received)
    return {
      message: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.',
      isNetworkError: true,
      code: error.code
    };
  }
  
  // Other errors
  return {
    message: error.message || 'Đã xảy ra lỗi không xác định',
    isNetworkError: false
  };
};

const shouldRetryError = (error: ApiError): boolean => {
  // Retry network errors
  if (error.isNetworkError) {
    return true;
  }
  
  // Retry server errors (5xx)
  if (error.status && error.status >= 500) {
    return true;
  }
  
  // Retry rate limiting
  if (error.status === 429) {
    return true;
  }
  
  // Don't retry client errors (4xx) except 429
  return false;
};

const showErrorToast = (error: ApiError, endpoint: string): void => {
  const isImportantError = !error.isNetworkError && error.status !== 404;
  
  if (isImportantError) {
    toast.error(`Lỗi API: ${error.message}`, {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  } else {
    // Less intrusive notification for network errors and 404s
    console.warn(`⚠️ ${endpoint}: ${error.message}`);
  }
};

const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
}; 