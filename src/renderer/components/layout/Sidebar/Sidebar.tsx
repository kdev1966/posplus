import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  const menuItems = [
    { path: '/pos', label: 'Point de Vente', icon: '🛒' },
    { path: '/products', label: 'Produits', icon: '📦' },
    { path: '/reports', label: 'Rapports', icon: '📊' },
    { path: '/users', label: 'Utilisateurs', icon: '👥' },
    { path: '/settings', label: 'Paramètres', icon: '⚙️' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-logo">POSPlus</h1>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
            }
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
