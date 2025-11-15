import React from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import './Header.css';

const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-title">
          <h2>Bienvenue, {user?.full_name}</h2>
          <p className="text-muted">{user?.role === 'admin' ? 'Administrateur' : 'Caissier'}</p>
        </div>
        <div className="header-actions">
          <button className="btn-logout" onClick={logout}>
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
