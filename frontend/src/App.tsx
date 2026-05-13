import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/auth/Login';
import { Register } from './components/auth/Register';
import { ChatList } from './components/chat/ChatList';
import { ChatWindow } from './components/chat/ChatWindow';
import { Profile } from './components/profile/Profile';
import { SearchUsers } from './components/search/SearchUsers';
import { Toaster } from 'react-hot-toast';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/chat" element={<PrivateRoute><ChatList /></PrivateRoute>} />
            <Route path="/chat/:username" element={<PrivateRoute><ChatWindow /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/search/users" element={<PrivateRoute><SearchUsers /></PrivateRoute>} />
            <Route path="/" element={<Navigate to="/chat" />} />
        </Routes>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AppRoutes />
            <Toaster position="top-right" />
        </AuthProvider>
    );
}