'use client';

import React, { useEffect, useState } from 'react';
import { Users, Mail, Phone, MapPin, Search, Loader2, RefreshCw, Eye, ShieldCheck } from 'lucide-react';
import CustomerDetailModal from '@/components/admin/CustomerDetailModal';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/customers');
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Filter customers by search query
  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q))
    );
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={22} color="#ef4444" />
            Direktori Pelanggan & Klien
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Kelola data pelanggan terdaftar, kontak, serta riwayat transaksi servis IT
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchCustomers} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-subtle)',
              }}
            />
            <input
              type="text"
              className="input-field"
              placeholder="Cari pelanggan berdasarkan nama, email, atau no. telepon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '38px', margin: 0, height: '40px' }}
            />
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Menampilkan <strong>{filteredCustomers.length}</strong> dari <strong>{customers.length}</strong> pelanggan
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={24} className="spin" style={{ margin: '0 auto 12px auto', color: '#ef4444' }} />
            <div>Memuat data pelanggan...</div>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            {searchQuery ? 'Tidak ada pelanggan yang cocok dengan pencarian.' : 'Belum ada pelanggan terdaftar.'}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nama Pelanggan</th>
                  <th>Kontak & Email</th>
                  <th>Alamat</th>
                  <th>Total Order</th>
                  <th>Selesai</th>
                  <th>Total Spendid</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                        Terdaftar: {new Date(c.createdAt).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td>
                      <div>{c.email}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>{c.phone || '-'}</div>
                    </td>
                    <td style={{ maxWidth: '220px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {c.address || '-'}
                    </td>
                    <td>
                      <span className="badge badge-pending">{c.totalOrders || 0} Order</span>
                    </td>
                    <td>
                      <span className="badge badge-completed">{c.completedOrders || 0} Selesai</span>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--success)' }}>{formatPrice(c.totalSpent || 0)}</strong>
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setSelectedCustomer(c);
                          setIsDetailOpen(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      >
                        <Eye size={12} />
                        <span>Detail & History</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedCustomer(null);
          }}
        />
      )}
    </div>
  );
}

