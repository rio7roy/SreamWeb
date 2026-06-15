import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('stream_token'));
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  // Check auth on mount
  const checkAuth = useCallback(async () => {
    const storedToken = localStorage.getItem('stream_token');
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      setUser(response.data.data);
      setToken(storedToken);
    } catch (error) {
      // If error is 401, the token is genuinely invalid
      if (error.response?.status === 401) {
        localStorage.removeItem('stream_token');
        localStorage.removeItem('stream_user');
        setUser(null);
        setToken(null);
      } else {
        // Render free tier sleeping or network error - use cached user data
        const cachedUser = localStorage.getItem('stream_user');
        if (cachedUser) {
          try {
            setUser(JSON.parse(cachedUser));
            setToken(storedToken);
          } catch {
            setUser(null);
            setToken(null);
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (identifier, password) => {
    const response = await api.post('/auth/login', { identifier, password });
    const { token: newToken, user: userData } = response.data.data;

    localStorage.setItem('stream_token', newToken);
    localStorage.setItem('stream_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);

    return userData;
  };

  const logout = () => {
    localStorage.removeItem('stream_token');
    localStorage.removeItem('stream_user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updates) => {
    setUser(prev => {
      const newUser = { ...prev, ...updates };
      localStorage.setItem('stream_user', JSON.stringify(newUser));
      return newUser;
    });
  };

  const value = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
