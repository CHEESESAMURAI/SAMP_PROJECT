import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface User {
  email: string;
  balance: number;
  subscription_type: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Настройка axios interceptors
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    // Interceptor для автоматического logout при 401
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  // Проверка авторизации при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      console.log('🔐 AuthContext: Checking auth, token exists:', !!token);
      
      if (token) {
        try {
          console.log('📡 AuthContext: Making auth check request...');
          const response = await axios.get(`${API_BASE}/auth/check`);
          console.log('✅ AuthContext: Auth check response:', response.data);
          
          if (response.data.authenticated) {
            setUser(response.data.user);
            console.log('👤 AuthContext: User set:', response.data.user);
          } else {
            console.log('❌ AuthContext: Not authenticated, clearing token');
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
          }
        } catch (error: any) {
          console.error('❌ AuthContext: Auth check failed:', error.response?.status, error.response?.data);
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        }
      } else {
        console.log('🚫 AuthContext: No token found');
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('🔑 AuthContext: Attempting login for:', email);
      const response = await axios.post(`${API_BASE}/auth/login`, {
        email,
        password
      });
      
      const { access_token } = response.data;
      console.log('✅ AuthContext: Login successful, token received');
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Получаем данные пользователя через auth/check
      const userResponse = await axios.get(`${API_BASE}/auth/check`);
      if (userResponse.data.authenticated) {
        setUser(userResponse.data.user);
        console.log('👤 AuthContext: User data loaded after login:', userResponse.data.user);
      } else {
        throw new Error('Не удалось получить данные пользователя');
      }
    } catch (error: any) {
      console.error('❌ AuthContext: Login failed:', error.response?.data);
      throw new Error(error.response?.data?.detail || 'Ошибка авторизации');
    }
  };

  const register = async (email: string, password: string) => {
    try {
      await axios.post(`${API_BASE}/auth/register`, {
        email,
        password
      });
      
      // После регистрации автоматически входим
      await login(email, password);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Ошибка регистрации');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 