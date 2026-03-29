/**
 * Dashboard Page
 * Stats cards, charts, and recent transactions
 */
import { useState, useEffect } from 'react';
import { reportsAPI } from '../services/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { FiUsers, FiRepeat, FiAlertCircle, FiPackage } from 'react-icons/fi';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6'];

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [dashRes, monthRes] = await Promise.all([
        reportsAPI.dashboard(),
        reportsAPI.monthly({ 
          year: new Date().getFullYear(), 
          month: new Date().getMonth() + 1 
        })
      ]);
      setData(dashRes.data);
      setMonthlyData(monthRes.data.dailyData || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner" /></div>;
  }

  if (!data) {
    return (
      <div className="empty-state">
        <div className="icon">📊</div>
        <h3>Unable to load dashboard</h3>
        <p>Please check your database connection</p>
      </div>
    );
  }

  const stockPieData = [
    { name: 'Stock In', value: data.stock.totalIn },
    { name: 'Stock Out', value: data.stock.totalOut },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome back! Here's your business overview.</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card" style={{ '--stat-color': '#6366f1' }}>
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
            <FiUsers />
          </div>
          <div className="stat-info">
            <h3>Total Clients</h3>
            <div className="value">{data.totalClients}</div>
          </div>
        </div>

        <div className="stat-card" style={{ '--stat-color': '#3b82f6' }}>
          <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
            <FiRepeat />
          </div>
          <div className="stat-info">
            <h3>Transactions</h3>
            <div className="value">{data.totalTransactions}</div>
            <div className="subtext">₹{data.totalTransactionValue.toLocaleString()}</div>
          </div>
        </div>

        <div className="stat-card" style={{ '--stat-color': '#f59e0b' }}>
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
            <FiAlertCircle />
          </div>
          <div className="stat-info">
            <h3>Pending Payments</h3>
            <div className="value">{data.pendingPayments.count}</div>
            <div className="subtext">₹{data.pendingPayments.total.toLocaleString()}</div>
          </div>
        </div>

        <div className="stat-card" style={{ '--stat-color': '#10b981' }}>
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
            <FiPackage />
          </div>
          <div className="stat-info">
            <h3>Current Stock</h3>
            <div className="value">{data.stock.currentStock}</div>
            <div className="subtext">In: {data.stock.totalIn} | Out: {data.stock.totalOut}</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Daily Transactions (This Month)</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(d) => new Date(d).getDate()}
                  stroke="var(--text-muted)"
                  fontSize={12}
                />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--bg-secondary)', 
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '13px'
                  }}
                  labelFormatter={(d) => new Date(d).toLocaleDateString()}
                />
                <Bar dataKey="value_in" name="IN Value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="value_out" name="OUT Value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px' }}>
              <p>No data for this month</p>
            </div>
          )}
        </div>

        <div className="chart-card">
          <h3>Stock Distribution</h3>
          {data.stock.totalIn > 0 || data.stock.totalOut > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stockPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {stockPieData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px' }}>
              <p>No stock data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="table-container">
        <div className="table-toolbar">
          <h3 style={{ fontWeight: 700, fontSize: 'var(--font-base)' }}>Recent Transactions</h3>
        </div>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Type</th>
                <th>Cloth Type</th>
                <th>Qty</th>
                <th>Total</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.recentTransactions.length > 0 ? data.recentTransactions.map(tx => (
                <tr key={tx.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{tx.client_name}</td>
                  <td>
                    <span className={`badge ${tx.type === 'IN' ? 'badge-success' : 'badge-warning'}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td>{tx.cloth_type}</td>
                  <td>{tx.quantity}</td>
                  <td style={{ fontWeight: 600 }}>₹{parseFloat(tx.total).toLocaleString()}</td>
                  <td>{new Date(tx.date).toLocaleDateString()}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No transactions yet
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
