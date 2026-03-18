import axios from 'axios';
import toast from 'react-hot-toast';

/**
 * Axios instance for ResourceFlow API.
 * withCredentials is set to true to handle httpOnly cookies.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Response Interceptor: Handles Token Refreshing and Global Errors
api.interceptors.response.use(
  (response) => {
    // If the backend sends a success message, we can handle it here or in components
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized errors (except for login/refresh/logout attempts)
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      const isAuthUrl = 
        originalRequest.url.includes('/auth/login') || 
        originalRequest.url.includes('/auth/refresh') ||
        originalRequest.url.includes('/auth/logout');

      if (isAuthUrl) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post('/auth/refresh');
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // Bug 4: Normalize pathname (remove trailing slashes)
        const normalizedPath = window.location.pathname.replace(/\/+$/, '') || '/';
        const publicPages = ['', '/login', '/register', '/verify-email', '/reset-password', '/forgot-password'];
        const isPublicPage = publicPages.includes(normalizedPath);

        if (!isPublicPage && normalizedPath !== '/login') {
            window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // PROVIDE CLEANER ERROR HANDLING: Don't redirect on specific public API calls
    const publicEndpoints = ['/auth/me', '/auth/login', '/auth/register', '/auth/verify-email', '/auth/forgot-password', '/auth/reset-password'];
    const isPublicEndpoint = publicEndpoints.some(ep => originalRequest.url.includes(ep));

    if (error.response?.status === 401 && isPublicEndpoint) {
        return Promise.reject(error);
    }

    // Global Error Notifications
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.message;

      // Handle specific statuses with toasts
      if (status === 429) {
        toast.error('Too many requests. Please slow down.');
      } else if (status === 500) {
        toast.error('Internal server error. Our team is on it.');
        // Optional: window.location.href = '/500';
      } else if (status === 403) {
        toast.error('Access denied. You do not have permission.');
      } else if (status >= 400 && !isPublicEndpoint && status !== 401) {
        // Show general errors for non-auth requests
        toast.error(message);
      }
    } else {
      toast.error('Network error. Check your connection.');
    }

    return Promise.reject(error);
  }
);

export default api;
