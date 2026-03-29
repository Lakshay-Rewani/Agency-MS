/**
 * Inventory Page
 * Auto-calculated stock summary from IN/OUT transactions
 */
import { useState, useEffect } from 'react';
import { transactionsAPI } from '../services/api';
import { FiPackage } from 'react-icons/fi';

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const res = await transactionsAPI.inventorySummary();
      setInventory(res.data);
    } catch (err) {
      console.error('Load inventory error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const totalIn = inventory.reduce((sum, item) => sum + parseFloat(item.total_in), 0);
  const totalOut = inventory.reduce((sum, item) => sum + parseFloat(item.total_out), 0);
  const totalStock = inventory.reduce((sum, item) => sum + parseFloat(item.current_stock), 0);

  return (
    <div>
      <div className="page-header">
        <h1>Inventory</h1>
        <p>Auto-calculated stock based on transactions</p>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card" style={{ '--stat-color': '#10b981' }}>
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
            <FiPackage />
          </div>
          <div className="stat-info">
            <h3>Total Stock In</h3>
            <div className="value">{totalIn.toLocaleString()}</div>
          </div>
        </div>
        <div className="stat-card" style={{ '--stat-color': '#f59e0b' }}>
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
            <FiPackage />
          </div>
          <div className="stat-info">
            <h3>Total Stock Out</h3>
            <div className="value">{totalOut.toLocaleString()}</div>
          </div>
        </div>
        <div className="stat-card" style={{ '--stat-color': '#6366f1' }}>
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
            <FiPackage />
          </div>
          <div className="stat-info">
            <h3>Current Stock</h3>
            <div className="value">{totalStock.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Stock Table */}
      <div className="table-container">
        <div className="table-toolbar">
          <h3 style={{ fontWeight: 700 }}>Stock by Cloth Type</h3>
        </div>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Cloth Type</th>
                <th>Total IN</th>
                <th>Total OUT</th>
                <th>Current Stock</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {inventory.length > 0 ? inventory.map((item, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.cloth_type}</td>
                  <td className="text-success fw-600">{parseFloat(item.total_in).toLocaleString()}</td>
                  <td className="text-warning fw-600">{parseFloat(item.total_out).toLocaleString()}</td>
                  <td style={{ fontWeight: 700, fontSize: 'var(--font-base)' }}>{parseFloat(item.current_stock).toLocaleString()}</td>
                  <td>
                    <span className={`badge ${parseFloat(item.current_stock) > 0 ? 'badge-success' : parseFloat(item.current_stock) === 0 ? 'badge-warning' : 'badge-danger'}`}>
                      {parseFloat(item.current_stock) > 0 ? 'In Stock' : parseFloat(item.current_stock) === 0 ? 'Empty' : 'Deficit'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No inventory data — add transactions to see stock
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
