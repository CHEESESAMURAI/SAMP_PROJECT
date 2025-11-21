import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Layout.css';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigationItems = [
    { path: '/dashboard', label: 'Дашборд', icon: '📊' },
    { path: '/product-analysis', label: 'Анализ товара', icon: '📦' },
    { path: '/brand-analysis', label: 'Анализ бренда', icon: '🏢' },
    { path: '/supplier-analysis', label: 'Анализ продавца', icon: '🏪' },
    { path: '/category-analysis', label: 'Анализ категорий', icon: '📂' },
    { path: '/seasonality-analysis', label: 'Анализ сезонности', icon: '📅' },
    { path: '/ai-helper', label: 'ИИ помощник', icon: '🤖' },
    { path: '/oracle-queries', label: 'Оракул запросов', icon: '🧠' },
    { path: '/supply-planning', label: 'План поставок', icon: '🚚' },
    { path: '/blogger-search', label: 'Поиск блогеров', icon: '👥' },
    { path: '/ad-monitoring', label: 'Мониторинг рекламы', icon: '📢' },
    { path: '/global-search', label: 'Глобальный поиск', icon: '🌐' },
    { path: '/profile', label: 'Профиль', icon: '👤' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="layout">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <h2>SAMP ANALYTICS</h2>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
        </div>
        
        <nav className="sidebar-nav">
          {navigationItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>
        
        <div className="sidebar-footer">
          <div className="user-info">
            <Link to="/profile" className="user-details" onClick={() => setSidebarOpen(false)}>
              <p className="user-email">{user?.email}</p>
              <p className="user-balance">💰 {user?.balance}₽</p>
              <p className="user-subscription">🎯 {user?.subscription_type}</p>
            </Link>
            <button className="logout-button" onClick={logout}>
              🚪 Выйти
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <header className="header">
          <button 
            className="mobile-menu-button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
          <div className="header-title">
            <h1>SAMP Analytics Dashboard</h1>
            <p>Профессиональная аналитика для Wildberries</p>
          </div>
          <div className="header-user">
            <Link to="/profile" className="header-user-link">
              👋 {user?.email}
            </Link>
          </div>
        </header>
        
        <main className="content">
          <Outlet />
        </main>
      </div>

      {/* Sidebar Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout; 