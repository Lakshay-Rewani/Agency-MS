/**
 * Sidebar Component
 * Dark sidebar with navigation, role-based menu items, and user info
 */
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { 
  FiHome, FiUsers, FiRepeat, FiDollarSign, 
  FiBarChart2, FiUserPlus, FiPackage, FiLogOut, FiMenu, FiX 
} from 'react-icons/fi';

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { to: '/', icon: <FiHome />, label: 'Dashboard' },
    { to: '/clients', icon: <FiUsers />, label: 'Clients' },
    { to: '/transactions', icon: <FiRepeat />, label: 'Transactions' },
    { to: '/inventory', icon: <FiPackage />, label: 'Inventory' },
    { to: '/payments', icon: <FiDollarSign />, label: 'Payments' },
    { to: '/reports', icon: <FiBarChart2 />, label: 'Reports' },
  ];

  const adminItems = [
    { to: '/users', icon: <FiUserPlus />, label: 'User Management' },
  ];

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <FiX /> : <FiMenu />}
        </button>
        <h3>Textile Agency</h3>
      </div>

      {/* Overlay */}
      <div className={`sidebar-overlay ${mobileOpen ? 'open' : ''}`} onClick={closeMobile} />

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">🧵</div>
          <div>
            <h2>Textile Agency</h2>
            <p>Management System</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <span className="sidebar-section-label">Main Menu</span>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={closeMobile}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <span className="sidebar-section-label">Administration</span>
              {adminItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                >
                  <span className="icon">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="sidebar-user-info">
            <div className="name">{user?.name || 'User'}</div>
            <div className="role">{user?.role || 'staff'}</div>
          </div>
          <button className="sidebar-logout" onClick={logout} title="Logout">
            <FiLogOut />
          </button>
        </div>
      </aside>
    </>
  );
}
