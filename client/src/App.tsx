// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Navbar from './components/layout/Navbar';
import Dashboard from './components/pages/Dashboard';
import ExamView from './components/pages/ExamView';
import { Toaster } from "./components/ui/toaster";
import Login from 'Login';

export function App() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <Navbar />
        <div className="p-6 pt-20"> {/* Added padding-top to account for fixed navbar */}
          <Routes>
            <Route 
              path="/" 
              element={user ? <Dashboard /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/exam/:examId" 
              element={user ? <ExamView /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/login" 
              element={!user ? <div className="flex justify-center pt-20"><Login /></div> : <Navigate to="/" replace />} 
            />
          </Routes>
        </div>
        <Toaster />
      </div>
    </BrowserRouter>
  );
}

export default App;