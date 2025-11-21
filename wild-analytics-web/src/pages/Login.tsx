import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { addYandexMetrika } from '../utils/yandexMetrika';
import './Auth.css';

// Добавляем типизацию для window.ym
declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: any[]) => void;
  }
}

const Login: React.FC = () => {
  const [email, setEmail] = useState('demo@wildbot.com');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, login } = useAuth();

  // Добавляем Yandex.Metrika счетчик для страницы авторизации
  useEffect(() => {
    console.log('🚀 Login page mounted, adding Yandex.Metrika...');
    addYandexMetrika('104757300');
    
    // Проверяем через 2 секунды, что счетчик работает
    setTimeout(() => {
      if (window.ym) {
        console.log('✅ Yandex.Metrika is available');
        // Отправляем тестовое событие
        window.ym(104757300, 'reachGoal', 'login_page_viewed');
        console.log('📊 Test event sent to Yandex.Metrika');
      } else {
        console.log('❌ Yandex.Metrika is not available');
      }
    }, 2000);
  }, []);

  // Если пользователь уже авторизован, перенаправляем на главную
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🐺 SAMP Analytics</h1>
          <p>Войти в систему</p>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Введите ваш email"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Пароль</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Введите ваш пароль"
            />
          </div>
          
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>
            Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
          </p>
        </div>
        
        <div className="test-credentials">
          <h4>Тестовые данные:</h4>
          <p>Email: test@example.com</p>
          <p>Пароль: testpassword</p>
        </div>
      </div>
    </div>
  );
};

export default Login; 