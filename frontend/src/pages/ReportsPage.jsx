/**
 * Reports Page
 * Daily and monthly reports with client-wise history and date filtering
 */
import { useState, useEffect } from 'react';
import { reportsAPI, clientsAPI } from '../services/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function ReportsPage() {
  const [tab, setTab] = useState('daily');
  const [clients, setClients] = useState([]);
  const [dailyData, setDailyData] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [clientReport, setClientReport] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedClient, setSelectedClient] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    clientsAPI.listAll().then(r => setClients(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'daily') loadDaily();
    else if (tab === 'monthly') loadMonthly();
    else if (tab === 'client' && selectedClient) loadClientReport();
  }, [tab, selectedDate, selectedMonth, selectedYear, selectedClient]);

  const loadDaily = async () => {
    setLoading(true);
    try {
      const res = await reportsAPI.daily({ date: selectedDate });
      setDailyData(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadMonthly = async () => {
    setLoading(true);
    try {
      const res = await reportsAPI.monthly({ year: selectedYear, month: selectedMonth });
      setMonthlyData(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadClientReport = async () => {
    if (!selectedClient) return;
    setLoading(true);
    try {
      const res = await reportsAPI.client(selectedClient);
      setClientReport(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Reports</h1>
        <p>View daily, monthly and client-wise reports</p>
      </div>

      {/* Tab Buttons */}
      <div className="filters-bar" style={{ marginBottom: '24px' }}>
        <button className={`btn ${tab === 'daily' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('daily')}>Daily Report</button>
        <button className={`btn ${tab === 'monthly' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('monthly')}>Monthly Report</button>
        <button className={`btn ${tab === 'client' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('client')}>Client Report</button>
      </div>

      {loading && <div className="loading"><div className="spinner" /></div>}

      {/* Daily Report */}
      {tab === 'daily' && !loading && (
        <div>
          <div className="filters-bar">
            <label>Date:</label>
            <input type="date" className="table-filter" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
          </div>

          {dailyData && (
            <>
              <div className="stats-grid">
                <div className="stat-card" style={{ '--stat-color': '#10b981' }}>
                  <div className="stat-info">
                    <h3>Qty IN</h3>
                    <div className="value">{parseFloat(dailyData.summary.qty_in).toLocaleString()}</div>
                    <div className="subtext">₹{parseFloat(dailyData.summary.value_in).toLocaleString()}</div>
                  </div>
                </div>
                <div className="stat-card" style={{ '--stat-color': '#f59e0b' }}>
                  <div className="stat-info">
                    <h3>Qty OUT</h3>
                    <div className="value">{parseFloat(dailyData.summary.qty_out).toLocaleString()}</div>
                    <div className="subtext">₹{parseFloat(dailyData.summary.value_out).toLocaleString()}</div>
                  </div>
                </div>
              </div>

              <div className="table-container" style={{ marginBottom: '20px' }}>
                <div className="table-toolbar"><h3 style={{ fontWeight: 700 }}>Transactions on {new Date(dailyData.date).toLocaleDateString()}</h3></div>
                <div className="table-responsive">
                  <table>
                    <thead><tr><th>Client</th><th>Type</th><th>Cloth</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead>
                    <tbody>
                      {dailyData.transactions.length > 0 ? dailyData.transactions.map(tx => (
                        <tr key={tx.id}>
                          <td className="fw-600">{tx.client_name}</td>
                          <td><span className={`badge ${tx.type === 'IN' ? 'badge-success' : 'badge-warning'}`}>{tx.type}</span></td>
                          <td>{tx.cloth_type}</td>
                          <td>{tx.quantity}</td>
                          <td>₹{parseFloat(tx.rate).toLocaleString()}</td>
                          <td className="fw-700">₹{parseFloat(tx.total).toLocaleString()}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No transactions on this date</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Monthly Report */}
      {tab === 'monthly' && !loading && (
        <div>
          <div className="filters-bar">
            <label>Year:</label>
            <select className="table-filter" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <label>Month:</label>
            <select className="table-filter" value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>
          </div>

          {monthlyData && (
            <>
              {monthlyData.dailyData.length > 0 && (
                <div className="chart-card" style={{ marginBottom: '24px' }}>
                  <h3>Transaction Values by Day</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData.dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tickFormatter={d => new Date(d).getDate()} stroke="var(--text-muted)" fontSize={12} />
                      <YAxis stroke="var(--text-muted)" fontSize={12} />
                      <Tooltip labelFormatter={d => new Date(d).toLocaleDateString()} contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                      <Legend />
                      <Bar dataKey="value_in" name="Value IN" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="value_out" name="Value OUT" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="stats-grid">
                <div className="stat-card" style={{ '--stat-color': '#10b981' }}>
                  <div className="stat-info">
                    <h3>Payments Collected</h3>
                    <div className="value">₹{parseFloat(monthlyData.paymentSummary.total_paid).toLocaleString()}</div>
                  </div>
                </div>
                <div className="stat-card" style={{ '--stat-color': '#f59e0b' }}>
                  <div className="stat-info">
                    <h3>Pending Payments</h3>
                    <div className="value">₹{parseFloat(monthlyData.paymentSummary.total_pending).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Client Report */}
      {tab === 'client' && !loading && (
        <div>
          <div className="filters-bar">
            <label>Client:</label>
            <select className="table-filter" value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
              <option value="">Select Client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {clientReport && (
            <>
              <div className="stats-grid">
                <div className="stat-card" style={{ '--stat-color': '#6366f1' }}>
                  <div className="stat-info">
                    <h3>Client</h3>
                    <div className="value" style={{ fontSize: 'var(--font-lg)' }}>{clientReport.client.name}</div>
                    <div className="subtext">{clientReport.client.type} | {clientReport.client.phone || 'No phone'}</div>
                  </div>
                </div>
                <div className="stat-card" style={{ '--stat-color': '#3b82f6' }}>
                  <div className="stat-info">
                    <h3>Balance</h3>
                    <div className="value">₹{parseFloat(clientReport.client.balance).toLocaleString()}</div>
                  </div>
                </div>
                <div className="stat-card" style={{ '--stat-color': '#10b981' }}>
                  <div className="stat-info">
                    <h3>Total Transactions</h3>
                    <div className="value">{clientReport.transactions.length}</div>
                  </div>
                </div>
              </div>

              <div className="table-container" style={{ marginBottom: '20px' }}>
                <div className="table-toolbar"><h3 className="fw-700">Transaction History</h3></div>
                <div className="table-responsive">
                  <table>
                    <thead><tr><th>Date</th><th>Type</th><th>Cloth</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead>
                    <tbody>
                      {clientReport.transactions.map(tx => (
                        <tr key={tx.id}>
                          <td>{new Date(tx.date).toLocaleDateString()}</td>
                          <td><span className={`badge ${tx.type === 'IN' ? 'badge-success' : 'badge-warning'}`}>{tx.type}</span></td>
                          <td>{tx.cloth_type}</td>
                          <td>{tx.quantity}</td>
                          <td>₹{parseFloat(tx.rate).toLocaleString()}</td>
                          <td className="fw-700">₹{parseFloat(tx.total).toLocaleString()}</td>
                        </tr>
                      ))}
                      {clientReport.transactions.length === 0 && (
                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No transactions</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="table-container">
                <div className="table-toolbar"><h3 className="fw-700">Payment History</h3></div>
                <div className="table-responsive">
                  <table>
                    <thead><tr><th>Date</th><th>Amount</th><th>Status</th><th>Notes</th></tr></thead>
                    <tbody>
                      {clientReport.payments.map(p => (
                        <tr key={p.id}>
                          <td>{new Date(p.date).toLocaleDateString()}</td>
                          <td className="fw-700">₹{parseFloat(p.amount).toLocaleString()}</td>
                          <td><span className={`badge ${p.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>{p.status}</span></td>
                          <td className="text-muted">{p.notes || '—'}</td>
                        </tr>
                      ))}
                      {clientReport.payments.length === 0 && (
                        <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No payments</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
