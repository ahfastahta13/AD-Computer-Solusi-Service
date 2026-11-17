'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Search, Edit2, Trash2, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function AdminKnowledgeBasePage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Form state
  const [category, setCategory] = useState('FAQ');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Confirmation state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: (() => void) | null;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: null
  });

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/knowledge-base');
      const data = await res.json();
      if (data.success) {
        setItems(data.items);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openModal = (item?: any) => {
    setErrorMsg('');
    if (item) {
      setEditingItem(item);
      setCategory(item.category);
      setTitle(item.title);
      setContent(item.content);
    } else {
      setEditingItem(null);
      setCategory('FAQ');
      setTitle('');
      setContent('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setErrorMsg('Title dan Content wajib diisi');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const url = editingItem ? `/api/admin/knowledge-base/${editingItem.id}` : '/api/admin/knowledge-base';
      const method = editingItem ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, title, content }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        fetchItems();
        closeModal();
      } else {
        setErrorMsg(data.message || 'Gagal menyimpan data');
      }
    } catch (err) {
      setErrorMsg('Kesalahan jaringan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    setConfirmState({
      isOpen: true,
      title: currentStatus ? 'Nonaktifkan Knowledge' : 'Aktifkan Knowledge',
      message: `Yakin ingin ${currentStatus ? 'menonaktifkan' : 'mengaktifkan'} data ini?`,
      action: async () => {
        try {
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          await fetch(`/api/admin/knowledge-base/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: !currentStatus }),
          });
          fetchItems();
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleDelete = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Hapus Permanen',
      message: 'Yakin ingin menghapus data knowledge base ini secara permanen?',
      action: async () => {
        try {
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          await fetch(`/api/admin/knowledge-base/${id}`, {
            method: 'DELETE',
          });
          fetchItems();
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const filteredItems = items.filter(
    (i) => 
      i.title.toLowerCase().includes(search.toLowerCase()) || 
      i.category.toLowerCase().includes(search.toLowerCase()) ||
      i.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={22} style={{ color: '#ef4444' }} />
            AI Knowledge Base
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
            Kelola data FAQ, SOP, dan kebijakan bisnis sebagai referensi AI Assistant
          </p>
        </div>
        <button onClick={() => openModal()} className="btn btn-primary btn-sm" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' }}>
          <Plus size={16} />
          <span>Tambah Knowledge</span>
        </button>
      </div>

      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-surface)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
          <Search size={18} style={{ color: 'var(--text-subtle)' }} />
          <input
            type="text"
            placeholder="Cari berdasarkan judul, kategori, atau isi konten..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', flex: 1, outline: 'none', color: 'var(--text-main)', fontSize: '0.9rem' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '30vh', gap: '12px' }}>
          <Loader2 className="animate-spin" size={24} style={{ color: '#ef4444' }} />
          <span>Memuat knowledge base...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <BookOpen size={40} style={{ margin: '0 auto 16px auto', opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: '0.95rem' }}>Belum ada data knowledge base ditemukan.</p>
        </div>
      ) : (
        <div className="table-responsive card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Kategori</th>
                <th>Judul Informasi</th>
                <th>Konten (Preview)</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      {item.category}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                      Ditambahkan: {new Date(item.createdAt).toLocaleDateString('id-ID')}
                    </div>
                  </td>
                  <td style={{ maxWidth: '300px' }}>
                    <div style={{ 
                      fontSize: '0.85rem', 
                      color: 'var(--text-muted)', 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis' 
                    }}>
                      {item.content}
                    </div>
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggleActive(item.id, item.isActive)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: item.isActive ? '#10b981' : 'var(--text-subtle)',
                      }}
                    >
                      {item.isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      {item.isActive ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => openModal(item)} className="btn btn-sm" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-glass)' }}>
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="btn btn-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(5, 8, 22, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '28px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 20px 0' }}>
              {editingItem ? 'Edit Knowledge Base' : 'Tambah Knowledge Base'}
            </h3>

            {errorMsg && (
              <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.12)', color: '#f87171', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Kategori</label>
                <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="FAQ">FAQ (Pertanyaan Umum)</option>
                  <option value="POLICY">POLICY (Kebijakan Bisnis/Garansi)</option>
                  <option value="SOP">SOP (Standar Operasional)</option>
                  <option value="PRICING">PRICING (Informasi Harga Khusus)</option>
                  <option value="TROUBLESHOOTING">TROUBLESHOOTING (Panduan Solusi)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Judul (Topik)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Contoh: Kebijakan Garansi Hardware"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Konten Pengetahuan</label>
                <textarea
                  className="form-control"
                  rows={5}
                  placeholder="Tuliskan informasi lengkap yang akan dipelajari oleh AI..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button type="button" onClick={closeModal} className="btn btn-outline">Batal</button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', border: 'none' }}>
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={() => {
          if (confirmState.action) confirmState.action();
        }}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
