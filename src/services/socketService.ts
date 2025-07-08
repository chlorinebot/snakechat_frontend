import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private static instance: SocketService | null = null;
  private userId: number | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private eventListeners: Map<string, Set<(...args: any[]) => void>> = new Map();
  private isConnecting: boolean = false;
  private connectionRetryTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  // Tự động detect server URL dựa trên environment
  private getServerUrl(): string {
    const hostname = window.location.hostname;
    
    // Production environment
    if (hostname.includes('snakechatfrontend.up.railway.app') || 
        hostname.includes('railway.app') ||
        !hostname.includes('localhost')) {
      return 'https://snakechatbackend.up.railway.app';
    }
    
    // Development environment
    return 'http://localhost:8000';
  }

  public connect(userId: number): void {
    // Tránh multiple connection attempts
    if (this.isConnecting) {
      return;
    }

    // Lưu userId để sử dụng khi tái kết nối
    this.userId = userId;

    // Nếu đã có socket và đã kết nối, không cần kết nối lại
    if (this.socket && this.socket.connected) {
      return;
    }

    this.isConnecting = true;

    // Đóng socket cũ nếu có
    if (this.socket) {
      this.socket.disconnect();
    }

    // Clear existing timeouts
    if (this.connectionRetryTimeout) {
      clearTimeout(this.connectionRetryTimeout);
      this.connectionRetryTimeout = null;
    }
    
    const serverUrl = this.getServerUrl();
    console.log(`[SOCKET-SERVICE] Đang kết nối tới: ${serverUrl}`);
    
    // Tạo socket mới với các tùy chọn tối ưu cho production
    this.socket = io(serverUrl, {
      query: { userId },
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 15000,
      forceNew: true,
      transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
      upgrade: true
    });

    // Thiết lập các sự kiện cơ bản
    this.setupSocketEvents();
  }

  private setupSocketEvents(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[SOCKET-SERVICE] ✅ Kết nối socket thành công!');
      
      // Reset các biến trạng thái
      this.reconnectAttempts = 0;
      this.isConnecting = false;
      
      // Đăng ký lại tất cả các sự kiện đã lưu
      this.reattachEventListeners();
      
      // Bắt đầu heartbeat
      this.startHeartbeat();
    });

    this.socket.on('connection_success', (data) => {
      console.log('[SOCKET-SERVICE] 🎉 Xác nhận kết nối từ server:', data);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[SOCKET-SERVICE] ❌ Lỗi kết nối socket:', error.message);
      this.isConnecting = false;
      this.handleReconnect();
    });

    this.socket.on('disconnect', (reason) => {
      console.warn(`[SOCKET-SERVICE] 🔌 Socket đã ngắt kết nối. Lý do: ${reason}`);
      this.isConnecting = false;
      this.stopHeartbeat();
      
      // Nếu không phải do người dùng chủ động ngắt kết nối, thử kết nối lại
      if (reason !== 'io client disconnect' && reason !== 'io server disconnect') {
        this.handleReconnect();
      }
    });

    this.socket.on('error', (error) => {
      console.error('[SOCKET-SERVICE] ⚠️ Lỗi socket:', error);
    });

    this.socket.on('pong', (data) => {
      console.log('[SOCKET-SERVICE] 💓 Heartbeat response:', data);
    });

    // Xử lý lỗi từ server
    this.socket.on('error', (data) => {
      console.error('[SOCKET-SERVICE] Server error:', data.message);
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat(); // Clear existing heartbeat
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('ping', { timestamp: new Date().toISOString() });
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handleReconnect(): void {
    // Tăng số lần thử kết nối
    this.reconnectAttempts++;
    
    // Nếu chưa vượt quá số lần thử tối đa và có userId, thử kết nối lại
    if (this.reconnectAttempts <= this.maxReconnectAttempts && this.userId && !this.isConnecting) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000); // Exponential backoff, max 30s
      
      console.log(`[SOCKET-SERVICE] 🔄 Thử kết nối lại sau ${delay}ms... (Lần thử ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      this.connectionRetryTimeout = setTimeout(() => {
        if (this.userId && !this.isConnecting) {
          this.connect(this.userId);
        }
      }, delay);
    } else {
      console.error('[SOCKET-SERVICE] ❌ Đã vượt quá số lần thử kết nối lại hoặc không có userId');
      this.isConnecting = false;
    }
  }

  private reattachEventListeners(): void {
    if (!this.socket) return;
    
    // Đăng ký lại tất cả các sự kiện đã lưu
    this.eventListeners.forEach((callbacks, event) => {
      callbacks.forEach(callback => {
        this.socket?.on(event, callback);
      });
    });
  }

  public disconnect(): void {
    console.log('[SOCKET-SERVICE] 🔚 Đang ngắt kết nối socket...');
    
    // Clear all timeouts and intervals
    if (this.connectionRetryTimeout) {
      clearTimeout(this.connectionRetryTimeout);
      this.connectionRetryTimeout = null;
    }
    
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.userId = null;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    // Xóa tất cả event listeners
    this.eventListeners.clear();
  }

  public isConnected(): boolean {
    return this.socket !== null && this.socket.connected;
  }

  public getConnectionState(): string {
    if (!this.socket) return 'disconnected';
    if (this.isConnecting) return 'connecting';
    if (this.socket.connected) return 'connected';
    return 'disconnected';
  }

  public on(event: string, callback: (...args: any[]) => void): void {
    // Lưu callback vào danh sách để có thể đăng ký lại khi tái kết nối
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(callback);
    
    // Đăng ký sự kiện nếu socket đã kết nối
    if (this.socket && this.socket.connected) {
      this.socket.on(event, callback);
    } else if (this.userId && !this.isConnecting) {
      // Thử kết nối lại nếu có userId và chưa đang kết nối
      this.connect(this.userId);
    }
  }

  public off(event: string, callback: (...args: any[]) => void): void {
    // Xóa callback khỏi danh sách
    const callbacks = this.eventListeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      
      // Nếu không còn callback nào cho event này, xóa event khỏi map
      if (callbacks.size === 0) {
        this.eventListeners.delete(event);
      }
    }
    
    // Hủy đăng ký sự kiện nếu socket đã kết nối
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  public emit(event: string, data: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`[SOCKET-SERVICE] ⚠️ Không thể gửi event '${event}': Socket chưa kết nối`);
      
      // Thử kết nối lại nếu có userId
      if (this.userId && !this.isConnecting) {
        this.connect(this.userId);
        
        // Thử gửi lại sau khi kết nối
        setTimeout(() => {
          if (this.socket && this.socket.connected) {
            console.log(`[SOCKET-SERVICE] 🔄 Gửi lại event '${event}' sau khi kết nối`);
            this.socket.emit(event, data);
          }
        }, 2000);
      }
    }
  }

  // Method để force reconnect
  public forceReconnect(): void {
    if (this.userId) {
      console.log('[SOCKET-SERVICE] 🔄 Buộc kết nối lại...');
      this.reconnectAttempts = 0;
      this.isConnecting = false;
      this.connect(this.userId);
    }
  }
}

const socketService = SocketService.getInstance();
export default socketService; 