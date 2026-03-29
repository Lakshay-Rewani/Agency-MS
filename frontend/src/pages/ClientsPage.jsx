/**
 * Clients Page
 * CRUD table with search, type filter, and create/edit modal
 */
import { useState, useEffect } from 'react';
import { clientsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function ClientsPage() {
  const { isAdmin } = useAuth();
  const [clients, setClients] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', type: 'supplier', balance: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadClients();
  }, [pagination.page, search, typeFilter]);

  const loadClients = async () => {
    try {
      const res = await clientsAPI.list({
        page: pagination.page,
        limit: 20,
        search: search || undefined,
        type: typeFilter || undefined
      });
      setClients(res.data.clients);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Load clients error:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingClient(null);
    setForm({ name: '', phone: '', type: 'supplier', balance: 0 });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (client) => {
    setEditingClient(client);
    setForm({ name: client.name, phone: client.phone || '', type: client.type, balance: client.balance });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingClient) {
        await clientsAPI.update(editingClient.id, form);
      } else {
        await clientsAPI.create(form);
      }
      setModalOpen(false);
      loadClients();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save client');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete client "${name}"? This will also delete all their transactions and payments.`)) return;
    try {
      await clientsAPI.delete(id);
      loadClients();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header page-header-actions">
        <div>
          <h1>Clients</h1>
          <p>Manage your suppliers and receivers</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <FiPlus /> Add Client
        </button>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <input
              type="text"
              className="table-search"
              placeholder="Search clients..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPagination(p => ({...p, page: 1})); }}
            />
            <select
              className="table-filter"
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value); setPagination(p => ({...p, page: 1})); }}
            >
              <option value="">All Types</option>
              <option value="supplier">Supplier</option>
              <option value="receiver">Receiver</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Type</th>
                <th>Balance</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.length > 0 ? clients.map(client => (
                <tr key={client.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{client.name}</td>
                  <td>{client.phone || '—'}</td>
                  <td>
                    <span className={`badge ${client.type === 'supplier' ? 'badge-info' : 'badge-primary'}`}>
                      {client.type}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>₹{parseFloat(client.balance).toLocaleString()}</td>
                  <td>{new Date(client.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(client)} title="Edit">
                        <FiEdit2 />
                      </button>
                      {isAdmin && (
                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(client.id, client.name)} title="Delete">
                          <FiTrash2 />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="empty-state" style={{ padding: '40px' }}>
                    <h3>No clients found</h3>
                    <p>Add your first client to get started</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingClient ? 'Edit Client' : 'Add New Client'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : editingClient ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        {error && <div className="login-error" style={{ marginBottom: '16px' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Client Name</label>
            <input
              type="text"
              className="form-control"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Enter client name"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Phone</label>
              <input
                type="text"
                className="form-control"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select
                className="form-control"
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
              >
                <option value="supplier">Supplier</option>
                <option value="receiver">Receiver</option>
              </select>
            </div>
          </div>
          <div className="form-group mb-0">
            <label>Opening Balance (₹)</label>
            <input
              type="number"
              className="form-control"
              value={form.balance}
              onChange={e => setForm({ ...form, balance: e.target.value })}
              step="0.01"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
