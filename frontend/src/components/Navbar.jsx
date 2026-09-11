import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Home, Plus, Target } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-40 bg-dark-900/80 backdrop-blur-md border-b border-dark-700/50">
      <div className="w-full px-8 lg:px-12">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              Guru<span className="text-primary-400">OS</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className={`btn-ghost ${location.pathname === '/' ? 'text-white bg-dark-700/50' : ''}`}
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Vault</span>
            </Link>
            <Link
              to="/plan-builder"
              className={`btn-ghost ${location.pathname === '/plan-builder' ? 'text-white bg-dark-700/50' : ''}`}
            >
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Plan Builder</span>
            </Link>
            <button
              onClick={() => navigate('/', { state: { openAddSubject: true } })}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Subject</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
