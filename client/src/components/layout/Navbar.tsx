import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, LogIn } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/Avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import Login from '../../Login';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      <nav className="bg-white shadow-sm fixed w-full top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-800">מערכת מבחנים</h1>
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-3 focus:outline-none">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                      {user.email}
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="ml-2 h-4 w-4" />
                      <span>התנתק</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  <LogIn className="ml-2 h-4 w-4" />
                  <span>התחבר</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {showLoginModal && !user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">          
          <Login onClose={() => setShowLoginModal(false)} />
        </div>
      )}

      <div className="h-16" /> {/* Spacer for fixed navbar */}
    </>
  );
};

export default Navbar;