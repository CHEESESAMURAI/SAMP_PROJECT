import React, { useState } from 'react';
import './Analysis.css';

export default function AIHelper() {
  const [contentType, setContentType] = useState('product_description');
  const [prompt, setPrompt] = useState('');
  const [generated, setGenerated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const contentOptions: { value: string; label: string }[] = [
    { value: 'product_description', label: 'Описание товара' },
    { value: 'product_card', label: 'Карточка товара' },
    { value: 'sales_text', label: 'Продающий текст (AIDA)' },
    { value: 'ad_copy', label: 'Рекламный текст' },
    { value: 'social_post', label: 'Пост для соцсетей' },
    { value: 'email_marketing', label: 'Email-рассылка' },
    { value: 'landing_page', label: 'Структура лендинга' },
    { value: 'seo_content', label: 'SEO-контент' },
  ];

  const generateContent = async () => {
    if (!prompt.trim()) {
      setError('Введите описание/задание для генерации');
      return;
    }
    setError('');
    setLoading(true);
    setGenerated(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/analysis/ai-helper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content_type: contentType, prompt }),
      });

      if (!response.ok) {
        throw new Error('Ошибка генерации контента');
      }

      const data = await response.json();
      setGenerated(data.data?.content || '');
    } catch (err) {
      console.error(err);
      setError('Произошла ошибка при генерации контента');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '30px', color: 'white' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
          🤖 Помощь с нейронкой
        </h1>
        <p style={{ fontSize: '1.1rem', opacity: 0.9 }}>
          Сгенерируйте продающий контент так же, как в Telegram-боте
        </p>
      </div>

      {/* Form */}
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        marginBottom: '30px'
      }}>
        <p style={{ marginBottom: '15px', color: '#4b5563' }}>
          1. Выберите тип контента в выпадающем списке.<br />
          2. В поле ниже опишите задачу или товар (например: «Описание для спортивной бутылки 650&nbsp;мл»).<br />
          3. Нажмите «Сгенерировать» – текст появится ниже.
        </p>

        <div className="ai-helper-form" style={{ 
          display: 'flex', 
          gap: '20px', 
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="ai-helper-content-type-select"
            style={{ 
              flex: '0 0 280px',
              padding: '14px 18px',
              fontSize: '16px',
              border: '2px solid #e1e8ed',
              borderRadius: '12px',
              backgroundColor: 'white',
              color: '#374151',
              fontWeight: '500',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              cursor: 'pointer',
              outline: 'none'
            }}
            onFocus={(e) => {
              const target = e.target as HTMLSelectElement;
              target.style.borderColor = '#667eea';
              target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
            }}
            onBlur={(e) => {
              const target = e.target as HTMLSelectElement;
              target.style.borderColor = '#e1e8ed';
              target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            }}
          >
            {contentOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Опишите, что сгенерировать..."
            className="ai-helper-prompt-input"
            style={{ 
              flex: 1, 
              minWidth: '300px',
              padding: '14px 18px',
              fontSize: '16px',
              border: '2px solid #e1e8ed',
              borderRadius: '12px',
              backgroundColor: 'white',
              color: '#374151',
              fontWeight: '500',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none'
            }}
            onFocus={(e) => {
              const target = e.target as HTMLInputElement;
              target.style.borderColor = '#667eea';
              target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
            }}
            onBlur={(e) => {
              const target = e.target as HTMLInputElement;
              target.style.borderColor = '#e1e8ed';
              target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            }}
          />

          <button
            onClick={generateContent}
            disabled={loading}
            className="ai-helper-generate-button"
            style={{
              padding: '14px 28px',
              fontSize: '16px',
              fontWeight: '600',
              border: 'none',
              borderRadius: '12px',
              background: loading 
                ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)' 
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: loading 
                ? '0 2px 8px rgba(156, 163, 175, 0.3)' 
                : '0 4px 12px rgba(102, 126, 234, 0.3)',
              minWidth: '140px',
              whiteSpace: 'nowrap',
              opacity: loading ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                const target = e.target as HTMLButtonElement;
                target.style.transform = 'translateY(-2px)';
                target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.transform = 'translateY(0)';
              target.style.boxShadow = loading 
                ? '0 2px 8px rgba(156, 163, 175, 0.3)' 
                : '0 4px 12px rgba(102, 126, 234, 0.3)';
            }}
          >
            {loading ? 'Генерируем...' : 'Сгенерировать'}
          </button>
        </div>
        {error && (
          <div style={{ 
            marginTop: '15px', 
            padding: '12px 16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Generated Content */}
      {generated && (
        <div style={{
          background: 'white',
          padding: '35px',
          borderRadius: '20px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          whiteSpace: 'pre-wrap',
          lineHeight: 1.7,
          fontSize: '1.1rem',
          color: '#374151',
          border: '1px solid #f3f4f6'
        }}>
          <div style={{
            marginBottom: '20px',
            paddingBottom: '15px',
            borderBottom: '2px solid #f3f4f6',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{
              fontSize: '20px',
              color: '#667eea'
            }}>✨</span>
            <h3 style={{
              margin: 0,
              color: '#1f2937',
              fontSize: '1.3rem',
              fontWeight: '600'
            }}>
              Сгенерированный контент
            </h3>
          </div>
          <div style={{
            fontSize: '1rem',
            lineHeight: '1.8',
            color: '#4b5563'
          }}>
            {generated}
          </div>
        </div>
      )}
    </div>
  );
} 