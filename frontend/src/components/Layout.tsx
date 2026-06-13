import { Link, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, BookOpen, LogOut, MessageCircle } from 'lucide-react'; // ← Added MessageCircle
import NavigationMenu from './NavigationMenu';
import ExamMenu from './ExamMenu';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-indigo-600" />
              <span className="font-bold text-xl text-gray-900 hidden sm:inline">
                Menen Student Assistant
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition"
              >
                <Home className="h-5 w-5" />
                <span>Dashboard</span>
              </Link>

              <NavigationMenu target="study" />
              <ExamMenu />

              {/* ✅ New Chat Menu Item */}
              <Link
                to="/chat"
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition"
              >
                <MessageCircle className="h-5 w-5" />
                <span>Messages</span>
              </Link>

              <Link
                to="/student-status"
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition"
              >
                📊
                <span>Student Status</span>
              </Link>
            </div>

            {/* User Info & Logout */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden sm:block">
                {user?.email?.split('@')[0] || 'Student'}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;