/**
 * Transactions Page
 * CRUD with filters (date range, client, type), and create/edit modal
 */
import { useState, useEffect } from 'react';
import { transactionsAPI, clientsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function TransactionsPage() {
  const { isAdmin } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [clients, setClients] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ search: '', client_id: '', type: '', from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [form, setForm] = useState({
    client_id: '', type: 'IN', cloth_type: '', quantity: '', rate: '', date: '', notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    clientsAPI.listAll().then(r => setClients(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [pagination.page, filters]);

  const loadTransactions = async () => {
    try {
      const params = { page: pagination.page, limit: 20 };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await transactionsAPI.list(params);
      setTransactions(res.data.transactions);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Load transactions error:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingTx(null);
    setForm({ client_id: '', type: 'IN', cloth_type: '', quantity: '', rate: '', date: new Date().toISOString().split('T')[0], notes: '' });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (tx) => {
    setEditingTx(tx);
    setForm({
      client_id: tx.client_id, type: tx.type, cloth_type: tx.cloth_type,
      quantity: tx.quantity, rate: tx.rate,
      date: new Date(tx.date).toISOString().split('T')[0], notes: tx.notes || ''
    });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingTx) {
        await transactionsAPI.update(editingTx.id, form);
      } else {
        await transactionsAPI.create(form);
      }
      setModalOpen(false);
      loadTransactions();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction? Client balance will be adjusted.')) return;
    try {
      await transactionsAPI.delete(id);
      loadTransactions();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  const updateFilter = (key, val) => {
    setFilters(prev => ({ ...prev, [key]: val }));
    setPagination(p => ({ ...p, page: 1 }));
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header page-header-actions">
        <div>
          <h1>Transactions</h1>
          <p>Track incoming and outgoing cloth transactions</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <FiPlus /> Add Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <input type="text" className="table-search" placeholder="Search cloth type..." value={filters.search} onChange={e => updateFilter('search', e.target.value)} />
        <select className="table-filter" value={filters.client_id} onChange={e => updateFilter('client_id', e.target.value)}>
          <option value="">All Clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="table-filter" value={filters.type} onChange={e => updateFilter('type', e.target.value)}>
          <option value="">All Types</option>
          <option value="IN">IN</option>
          <option value="OUT">OUT</option>
        </select>
        <label>From:</label>
        <input type="date" className="table-filter" value={filters.from} onChange={e => updateFilter('from', e.target.value)} />
        <label>To:</label>
        <input type="date" className="table-filter" value={filters.to} onChange={e => updateFilter('to', e.target.value)} />
      </div>

      <div className="table-container">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Client</th>
                <th>Type</th>
                <th>Cloth Type</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Total</th>
                <th>By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length > 0 ? transactions.map(tx => (
                <tr key={tx.id}>
                  <td>{new Date(tx.date).toLocaleDateString()}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{tx.client_name}</td>
                  <td>
                    <span className={`badge ${tx.type === 'IN' ? 'badge-success' : 'badge-warning'}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td>{tx.cloth_type}</td>
                  <td>{tx.quantity}</td>
                  <td>₹{parseFloat(tx.rate).toLocaleString()}</td>
                  <td style={{ fontWeight: 700 }}>₹{parseFloat(tx.total).toLocaleString()}</td>
                  <td className="text-muted">{tx.user_name || '—'}</td>
                  <td>
                    <div className="action-btns">
                      {isAdmin && (
                        <>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(tx)}><FiEdit2 /></button>
                          <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(tx.id)}><FiTrash2 /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={p => setPagination(prev => ({ ...prev, page: p }))} />
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingTx ? 'Edit Transaction' : 'New Transaction'}
        footer={<><button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : editingTx ? 'Update' : 'Create'}</button></>}
      >
        {error && <div className="login-error" style={{ marginBottom: '16px' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Client</label>
              <select className="form-control" value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} required>
                <option value="">Select client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Type</label>
              <select className="form-control" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="IN">IN (Incoming)</option>
                <option value="OUT">OUT (Outgoing)</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Cloth Type</label>
            <input type="text" className="form-control" value={form.cloth_type} onChange={e => setForm({ ...form, cloth_type: e.target.value })} required placeholder="e.g., Cotton, Silk, Polyester" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Quantity</label>
              <input type="number" className="form-control" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required min="0.01" step="0.01" placeholder="0.00" />
            </div>
            <div className="form-group">
              <label>Rate (₹)</label>
              <input type="number" className="form-control" value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} required min="0" step="0.01" placeholder="0.00" />
            </div>
          </div>
          {form.quantity && form.rate && (
            <div className="form-group">
              <label>Total</label>
              <div style={{ fontSize: 'var(--font-xl)', fontWeight: 800, color: 'var(--primary)' }}>
                ₹{(parseFloat(form.quantity || 0) * parseFloat(form.rate || 0)).toLocaleString()}
              </div>
            </div>
          )}
          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input type="date" className="form-control" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="form-group mb-0">
              <label>Notes</label>
              <input type="text" className="form-control" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
