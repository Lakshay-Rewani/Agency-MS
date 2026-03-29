/**
 * Payments Page
 * CRUD with client filter and status filter
 */
import { useState, useEffect } from 'react';
import { paymentsAPI, clientsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function PaymentsPage() {
  const { isAdmin } = useAuth();
  const [payments, setPayments] = useState([]);
  const [clients, setClients] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ client_id: '', status: '', from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPmt, setEditingPmt] = useState(null);
  const [form, setForm] = useState({ client_id: '', amount: '', status: 'pending', date: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    clientsAPI.listAll().then(r => setClients(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    loadPayments();
  }, [pagination.page, filters]);

  const loadPayments = async () => {
    try {
      const params = { page: pagination.page, limit: 20 };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await paymentsAPI.list(params);
      setPayments(res.data.payments);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Load payments error:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingPmt(null);
    setForm({ client_id: '', amount: '', status: 'pending', date: new Date().toISOString().split('T')[0], notes: '' });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (pmt) => {
    setEditingPmt(pmt);
    setForm({
      client_id: pmt.client_id, amount: pmt.amount, status: pmt.status,
      date: new Date(pmt.date).toISOString().split('T')[0], notes: pmt.notes || ''
    });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingPmt) {
        await paymentsAPI.update(editingPmt.id, form);
      } else {
        await paymentsAPI.create(form);
      }
      setModalOpen(false);
      loadPayments();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this payment?')) return;
    try {
      await paymentsAPI.delete(id);
      loadPayments();
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
          <h1>Payments</h1>
          <p>Track payments per client</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <FiPlus /> Add Payment
        </button>
      </div>

      <div className="filters-bar">
        <select className="table-filter" value={filters.client_id} onChange={e => updateFilter('client_id', e.target.value)}>
          <option value="">All Clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="table-filter" value={filters.status} onChange={e => updateFilter('status', e.target.value)}>
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
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
                <th>Amount</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.length > 0 ? payments.map(pmt => (
                <tr key={pmt.id}>
                  <td>{new Date(pmt.date).toLocaleDateString()}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{pmt.client_name}</td>
                  <td style={{ fontWeight: 700 }}>₹{parseFloat(pmt.amount).toLocaleString()}</td>
                  <td>
                    <span className={`badge ${pmt.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                      {pmt.status}
                    </span>
                  </td>
                  <td className="text-muted">{pmt.notes || '—'}</td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(pmt)}><FiEdit2 /></button>
                      {isAdmin && (
                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(pmt.id)}><FiTrash2 /></button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No payments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={p => setPagination(prev => ({ ...prev, page: p }))} />
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingPmt ? 'Edit Payment' : 'New Payment'}
        footer={<><button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : editingPmt ? 'Update' : 'Create'}</button></>}
      >
        {error && <div className="login-error" style={{ marginBottom: '16px' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Client</label>
            <select className="form-control" value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} required>
              <option value="">Select client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Amount (₹)</label>
              <input type="number" className="form-control" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required min="0.01" step="0.01" placeholder="0.00" />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select className="form-control" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
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
