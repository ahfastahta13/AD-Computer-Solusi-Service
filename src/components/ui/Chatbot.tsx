'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, User, Loader2, RotateCcw, MessageCircle } from 'lucide-react';
import { buildWhatsAppUrl } from '@/lib/whatsapp';

// Simple markdown renderer for chatbot messages
function renderMarkdown(text: string) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Bold: **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      // Italic: *text* (single asterisk only)
      return part.split(/(\*[^*]+\*)/g).map((p, k) => {
        if (p.startsWith('*') && p.endsWith('*') && p.length > 2) {
          return <em key={k}>{p.slice(1, -1)}</em>;
        }
        return p;
      });
    });
    return <span key={i}>{parts}{i < lines.length - 1 ? <br /> : null}</span>;
  });
}

type Message = {
  role: 'user' | 'assistant';
  content: string;
  showWhatsApp?: boolean;
  userProblem?: string;
};

const GREETING: Message = {
  role: 'assistant',
  content:
    'Halo! **Saya adalah AI Assistant AD Computer**, asisten virtual resmi AD Computer yang siap membantu Anda mendapatkan informasi layanan servis komputer dan laptop, informasi pesanan, serta bantuan lainnya.\n\nSilakan pilih topik di bawah atau ketik pertanyaan Anda:',
};

const ADMIN_SUGGESTIONS = [
  'Berapa jumlah pesanan hari ini?',
  'Tampilkan pesanan terbaru.',
  'Berapa pesanan yang belum selesai?',
  'Bagaimana ringkasan pesanan servis?',
  'Ada berapa user di website ini?',
];

const CUSTOMER_SUGGESTIONS = [
  'Apa saja layanan AD Computer?',
  'Bagaimana cara melakukan servis?',
  'Bagaimana cara cek status pesanan?',
  'Bagaimana cara menghubungi Admin?',
  'Apakah bisa servis laptop?',
];

const GUEST_SUGGESTIONS = [
  'Apa saja layanan AD Computer?',
  'Bagaimana cara melakukan pemesanan?',
  'Bagaimana cara melihat status pesanan?',
  'Berapa biaya servis?',
  'Siapa kamu?',
];

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [displayMessages, setDisplayMessages] = useState<Message[]>([GREETING]);
  const apiMessagesRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages, isLoading]);

  useEffect(() => {
    if (isOpen && !isLoading) {
      inputRef.current?.focus();
    }
  }, [isOpen, isLoading]);

  const handleReset = () => {
    setDisplayMessages([GREETING]);
    apiMessagesRef.current = [];
    setInput('');
  };

  // Detect if on admin page or customer page
  const isAdminPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
  const isCustomerPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/customer');
  const apiEndpoint = isAdminPage ? '/api/admin/chatbot' : '/api/chat';

  const currentSuggestions = isAdminPage
    ? ADMIN_SUGGESTIONS
    : isCustomerPage
    ? CUSTOMER_SUGGESTIONS
    : GUEST_SUGGESTIONS;

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userText = text.trim();
    const userMessage: Message = { role: 'user', content: userText };

    // Tambahkan ke display
    setDisplayMessages((prev) => [...prev, userMessage]);
    // Tambahkan ke api messages ref
    apiMessagesRef.current = [
      ...apiMessagesRef.current,
      { role: 'user', content: userText },
    ];
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessagesRef.current }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const choice = data.choices?.[0]?.message;
      const content = choice?.content || data.reply || 'Ada yang bisa saya bantu lagi?';
      const showWhatsApp = Boolean(choice?.showWhatsApp ?? data.showWhatsApp);

      const assistantMessage: Message = {
        role: 'assistant',
        content,
        showWhatsApp,
        userProblem: userText,
      };

      // Simpan balasan ke display DAN ke api messages ref
      setDisplayMessages((prev) => [...prev, assistantMessage]);
      apiMessagesRef.current = [
        ...apiMessagesRef.current,
        { role: 'assistant', content },
      ];
    } catch (error) {
      console.error('[CHATBOT] Chat error:', error);
      setDisplayMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Maaf, terjadi kendala saat memproses permintaan. Anda dapat langsung mengklik tombol di bawah untuk berkonsultasi via WhatsApp dengan Admin kami.',
          showWhatsApp: true,
          userProblem: userText,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(input);
  };

  const handleSuggestionClick = (suggestionText: string) => {
    sendMessage(suggestionText);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        id="chatbot-toggle-btn"
        onClick={() => setIsOpen(true)}
        className="btn btn-primary"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          padding: 0,
          display: isOpen ? 'none' : 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 0 20px rgba(56,189,248,0.4)',
          zIndex: 9999,
          animation: 'pulse 2s infinite',
        }}
        title="Buka Asisten AI"
      >
        <Bot size={28} />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '380px',
            height: '560px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-active)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9999,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border-glass)',
              background: 'linear-gradient(135deg, rgba(2,132,199,0.2) 0%, rgba(15,23,42,0.9) 100%)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(56,189,248,0.2)',
                  border: '1px solid rgba(56,189,248,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot size={20} color="var(--primary-light)" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>AI Assistant AD Computer</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Online · Powered by NVIDIA</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleReset}
                title="Reset percakapan"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Tutup"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {displayMessages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '8px',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  animation: 'fadeInUp 0.2s ease',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: msg.role === 'user' ? 'var(--primary-main)' : 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid ' + (msg.role === 'user' ? 'transparent' : 'rgba(56,189,248,0.3)'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {msg.role === 'user' ? (
                    <User size={14} color="#fff" />
                  ) : (
                    <Bot size={14} color="var(--primary-light)" />
                  )}
                </div>
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                    backgroundColor: msg.role === 'user' ? 'var(--primary-main)' : 'rgba(255, 255, 255, 0.05)',
                    border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.07)',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                    maxWidth: '82%',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  <div style={{ wordBreak: 'break-word' }}>{renderMarkdown(msg.content)}</div>

                  {msg.role === 'assistant' && msg.showWhatsApp && (
                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <a
                        href={buildWhatsAppUrl({ userProblem: msg.userProblem })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="chatbot-whatsapp-btn"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 12px',
                          backgroundColor: '#22c55e',
                          color: '#ffffff',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '0.82rem',
                          textDecoration: 'none',
                          boxShadow: '0 2px 8px rgba(34, 197, 94, 0.35)',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                        }}
                      >
                        <MessageCircle size={15} />
                        <span>💬 Chat WhatsApp Admin</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Saran Pertanyaan Cepat (Quick Suggestions) */}
            {displayMessages.length === 1 && !isLoading && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  paddingLeft: '36px',
                  animation: 'fadeInUp 0.3s ease',
                }}
              >
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Saran pertanyaan:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {currentSuggestions.map((suggestion, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      style={{
                        background: 'rgba(56, 189, 248, 0.08)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        borderRadius: '16px',
                        color: 'var(--primary-light)',
                        fontSize: '0.78rem',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(56, 189, 248, 0.18)';
                        e.currentTarget.style.borderColor = 'var(--primary-light)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(56, 189, 248, 0.08)';
                        e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.25)';
                      }}
                    >
                      💡 {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56,189,248,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Bot size={14} color="var(--primary-light)" />
                </div>
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '4px 16px 16px 16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--primary-light)', animation: 'bounce 1s infinite 0ms', display: 'inline-block' }} />
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--primary-light)', animation: 'bounce 1s infinite 150ms', display: 'inline-block' }} />
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--primary-light)', animation: 'bounce 1s infinite 300ms', display: 'inline-block' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSend}
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border-glass)',
              display: 'flex',
              gap: '8px',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              id="chatbot-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isLoading ? 'Menunggu balasan...' : 'Tulis pesan...'}
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--border-glass)',
                padding: '10px 14px',
                borderRadius: '8px',
                color: 'var(--text-main)',
                outline: 'none',
                fontSize: '0.9rem',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--primary-light)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border-glass)'; }}
              disabled={isLoading}
            />
            <button
              type="submit"
              id="chatbot-send-btn"
              className="btn btn-primary"
              style={{
                padding: '0 14px',
                borderRadius: '8px',
                opacity: isLoading || !input.trim() ? 0.5 : 1,
                transition: 'opacity 0.2s',
              }}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
            </button>
          </form>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(56,189,248,0.4); }
          50% { box-shadow: 0 0 30px rgba(56,189,248,0.7); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
