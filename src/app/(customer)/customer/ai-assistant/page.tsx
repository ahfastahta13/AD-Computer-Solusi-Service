'use client';

import React, { useState } from 'react';
import { Bot, Send, User, Sparkles, AlertCircle, Wrench, ArrowRight, Loader2, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { buildWhatsAppUrl } from '@/lib/whatsapp';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  showWhatsApp?: boolean;
  userProblem?: string;
}

export default function CustomerAIAssistantPage() {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Halo! **Saya adalah AI Assistant AD Computer**, asisten virtual resmi AD Computer yang siap membantu Anda mendapatkan informasi layanan servis komputer dan laptop, informasi pesanan, serta bantuan lainnya. Ceritakan keluhan perangkat Anda atau tanyakan seputar layanan dan status pesanan Anda!',
    },
  ]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userText = input.trim();
    const userMsg: ChatMessage = { role: 'user', content: userText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/customer/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessages([
          ...newMessages,
          {
            role: 'assistant',
            content: data.reply,
            showWhatsApp: Boolean(data.showWhatsApp),
            userProblem: userText,
          },
        ]);
      } else {
        setMessages([
          ...newMessages,
          {
            role: 'assistant',
            content:
              data.reply ||
              'Maaf, layanan AI sedang sibuk. Anda dapat langsung mengklik tombol di bawah untuk berkonsultasi via WhatsApp dengan Admin kami.',
            showWhatsApp: true,
            userProblem: userText,
          },
        ]);
      }
    } catch (error) {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content:
            'Terjadi kendala koneksi. Anda dapat langsung berkonsultasi via WhatsApp dengan Admin kami di bawah ini.',
          showWhatsApp: true,
          userProblem: userText,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="card" style={{ height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column', padding: 0 }}>
        {/* Chat Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-glass)',
            background: 'var(--bg-glass)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-cyan) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              <Bot size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>AI IT Troubleshooting Assistant</h2>
                <span className="badge badge-diagnosing" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                  <Sparkles size={10} /> Online
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                Diagnosa mandiri & estimasi solusi kerusakan perangkat 24/7
              </p>
            </div>
          </div>

          <Link href="/customer/services/booking" className="btn btn-primary btn-sm">
            <Wrench size={14} />
            <span>Booking Servis</span>
          </Link>
        </div>

        {/* Chat Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((msg, idx) => {
            const isBot = msg.role === 'assistant';
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignSelf: isBot ? 'flex-start' : 'flex-end',
                  maxWidth: '85%',
                }}
              >
                {isBot && (
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-cyan) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    <Bot size={18} />
                  </div>
                )}
                <div
                  style={{
                    background: isBot ? 'var(--bg-surface)' : 'linear-gradient(135deg, var(--primary) 0%, #0369a1 100%)',
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-lg)',
                    border: isBot ? '1px solid var(--border-glass)' : 'none',
                    color: '#fff',
                    fontSize: '0.9rem',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  <ReactMarkdown>{msg.content}</ReactMarkdown>

                  {isBot && msg.showWhatsApp && (
                    <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-glass)' }}>
                      <a
                        href={buildWhatsAppUrl({ userProblem: msg.userProblem })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm"
                        style={{
                          backgroundColor: '#22c55e',
                          color: '#ffffff',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(34, 197, 94, 0.35)',
                          textDecoration: 'none',
                        }}
                      >
                        <MessageCircle size={16} />
                        <span>💬 Chat WhatsApp Admin</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {isTyping && (
            <div
              style={{
                display: 'flex',
                gap: '12px',
                alignSelf: 'flex-start',
                maxWidth: '85%',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-cyan) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                <Bot size={18} />
              </div>
              <div
                style={{
                  background: 'var(--bg-surface)',
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-glass)',
                  color: '#fff',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Loader2 size={16} className="animate-spin" /> AI sedang berpikir...
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-glass)', background: 'var(--bg-card)' }}>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Ketik keluhan (contoh: laptop cepat panas dan kipas berbunyi keras)..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isTyping}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px' }} disabled={isTyping}>
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
