import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { MessageCircle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    return (
        <header className="bg-white shadow-sm sticky top-0 z-20">
            <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <MessageCircle className="w-7 h-7 text-indigo-600" />
                    <h1 className="text-xl font-bold text-indigo-600">Secure Chat</h1>
                </div>
                <div className="flex items-center space-x-4">
                    <span className="text-gray-700">{user?.username}</span>
                    <button onClick={logout} className="p-2 rounded-lg hover:bg-gray-100"><LogOut className="w-5 h-5 text-red-500" /></button>
                </div>
            </div>
        </header>
    );
};