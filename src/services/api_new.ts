import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export interface User {
  user_id?: number;
  username: string;
  email: string;
  password: string;
  birthday?: string;
  role_id: number;
  role_name?: string;
  // Thông tin khóa tài khoản
  lock_id?: number;
  reason?: string;
  lock_status?: string; // Trạng thái khóa: 'locked' hoặc 'unlocked'
  lock_time?: string;
  unlock_time?: string;
  // Trạng thái online/offline
  status?: string; // 'online' hoặc 'offline'
  join_date?: string;
}

export interface UserLock {
  user_id: number;
  reason: string;
  lock_time: string;
  unlock_time: string;
}

export interface UserLockStatus {
  totalUsers: number;
  lockedUsers: number;
  lockedPercentage: number;
}

export interface OnlineStatus {
  totalUsers: number;
  onlineUsers: number;
  onlinePercentage: number;
}

export interface Role {
  role_id: number;
  role_name: string;
  description: string;
}

export const api = {
  // Lấy danh sách users
  getUsers: async () => {
    const response = await axios.get<{ items: User[] }>(`${API_URL}/user/data`);
    return response.data.items;
  },

  // Tạo user mới
  createUser: async (userData: User) => {
    const response = await axios.post<{ message: string; data: User }>(`${API_URL}/user/send`, userData);
    return response.data;
  },

  // Cập nhật thông tin user
  updateUser: async (userData: User) => {
    const response = await axios.put<{ message: string; data: User }>(`${API_URL}/user/update/${userData.user_id}`, userData);
    return response.data;
  },

  // Xóa user
  deleteUser: async (userId: number) => {
    const response = await axios.delete<{ message: string }>(`${API_URL}/user/delete/${userId}`);
    return response.data;
  },

  // Khóa tài khoản user
  lockUser: async (lockData: UserLock) => {
    const response = await axios.post<{ message: string }>(`${API_URL}/user/lock`, lockData);
    return response.data;
  },

  // Mở khóa tài khoản user
  unlockUser: async (userId: number) => {
    const response = await axios.post<{ message: string }>(`${API_URL}/user/unlock/${userId}`);
    return response.data;
  },

  // Cập nhật trạng thái online/offline
  updateStatus: async (userId: number, status: 'online' | 'offline') => {
    try {
      // Gọi API cập nhật trạng thái vào database
      await axios.post<{ success: boolean; message: string }>(`${API_URL}/user/update-status`, {
        user_id: userId,
        status
      });
      
      return { success: true, message: `Trạng thái đã được cập nhật thành ${status}` };
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái:', error);
      return { success: false, message: 'Lỗi khi cập nhật trạng thái' };
    }
  },

  // Lấy trạng thái khóa tài khoản
  getLockStatus: async () => {
    try {
      // Lấy danh sách người dùng
      const users = await api.getUsers();
      
      // Tính toán số liệu - kiểm tra lock_id và lock_status từ bảng user_lock
      const totalUsers = users.length;
      const lockedUsers = users.filter(user => user.lock_id && user.lock_status === 'locked').length;
      const lockedPercentage = totalUsers > 0 ? Math.round((lockedUsers / totalUsers) * 100) : 0;
      
      return {
        totalUsers,
        lockedUsers,
        lockedPercentage
      };
    } catch (error) {
      console.error('Lỗi khi lấy trạng thái khóa tài khoản:', error);
      return {
        totalUsers: 0,
        lockedUsers: 0,
        lockedPercentage: 0
      };
    }
  },

  // Đánh dấu người dùng đang online
  updateUserActivity: async (userId: number) => {
    try {
      if (!userId) return;
      
      // Cập nhật trạng thái online
      await api.updateStatus(userId, 'online');
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái hoạt động:', error);
    }
  },

  // Đánh dấu người dùng offline
  updateUserOffline: async (userId: number) => {
    try {
      if (!userId) return;
      
      // Cập nhật trạng thái offline
      await api.updateStatus(userId, 'offline');
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái offline:', error);
    }
  },

  // Lấy số liệu người dùng đang online
  getOnlineStatus: async () => {
    try {
      // Lấy danh sách tất cả người dùng
      const users = await api.getUsers();
      const totalUsers = users.length;
      
      // Đếm số người dùng đang online dựa vào cột status
      const onlineUsers = users.filter(user => user.status === 'online').length;
      const onlinePercentage = totalUsers > 0 ? Math.round((onlineUsers / totalUsers) * 100) : 0;
      
      return {
        totalUsers,
        onlineUsers: onlineUsers,
        onlinePercentage: onlinePercentage
      };
    } catch (error) {
      console.error('Lỗi khi lấy trạng thái online:', error);
      return {
        totalUsers: 0,
        onlineUsers: 0,
        onlinePercentage: 0
      };
    }
  },

  // Lấy danh sách vai trò
  getRoles: async () => {
    const response = await axios.get<{ items: Role[] }>(`${API_URL}/role/data`);
    return response.data.items;
  },

  // Tạo vai trò mới
  createRole: async (roleData: Partial<Role>) => {
    const response = await axios.post<{ message: string; data: Role }>(`${API_URL}/role/send`, roleData);
    return response.data;
  },

  // Cập nhật vai trò
  updateRole: async (roleData: Partial<Role>) => {
    const response = await axios.put<{ message: string; data: Role }>(`${API_URL}/role/update/${roleData.role_id}`, roleData);
    return response.data;
  },

  // Xóa vai trò
  deleteRole: async (roleId: number) => {
    const response = await axios.delete<{ message: string }>(`${API_URL}/role/delete/${roleId}`);
    return response.data;
  },

  // Lấy lịch sử khóa tài khoản
  getLockHistory: async () => {
    const response = await axios.get<{ items: any[] }>(`${API_URL}/user/lock-history`);
    return response.data.items;
  }
};

export default api; 