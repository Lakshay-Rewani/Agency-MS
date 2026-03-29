/**
 * User Management Page (Admin Only)
 * Create, view, update, and delete staff users
 */
import { useState, useEffect } from 'react';
import { usersAPI, authAPI } from '../services/api';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { FiPlus, FiEdit2, FiTrash2, FiShield } from 'react-icons/fi';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, [pagination.page]);

  const loadUsers = async () => {
    try {
      const res = await usersAPI.list({ page: pagination.page, limit: 20 });
      setUsers(res.data.users);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Load users error:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm({ name: '', email: '', password: '', role: 'staff' });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, password: '', role: user.role });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingUser) {
        const updateData = { name: form.name, email: form.email, role: form.role };
        if (form.password) updateData.password = form.password;
        await usersAPI.update(editingUser.id, updateData);
      } else {
        await authAPI.register(form);
      }
      setModalOpen(false);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete user "${name}"? This action cannot be undone.`)) return;
    try {
      await usersAPI.delete(id);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header page-header-actions">
        <div>
          <h1>User Management</h1>
          <p>Add and manage staff users</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <FiPlus /> Add User
        </button>
      </div>

      <div className="table-container">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {user.name}
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge ${user.role === 'admin' ? 'badge-primary' : 'badge-info'}`}>
                      <FiShield style={{ marginRight: '4px', fontSize: '12px' }} />
                      {user.role}
                    </span>
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(user)}><FiEdit2 /></button>
                      <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(user.id, user.name)}><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={p => setPagination(prev => ({ ...prev, page: p }))} />
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingUser ? 'Edit User' : 'Add New User'}
        footer={<><button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : editingUser ? 'Update' : 'Create'}</button></>}
      >
        {error && <div className="login-error" style={{ marginBottom: '16px' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Full name" />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" className="form-control" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required placeholder="email@example.com" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{editingUser ? 'New Password (leave blank to keep)' : 'Password'}</label>
              <input type="password" className="form-control" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={!editingUser} minLength={6} placeholder="Min 6 characters" />
            </div>
            <div className="form-group mb-0">
              <label>Role</label>
              <select className="form-control" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
