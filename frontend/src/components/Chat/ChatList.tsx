import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/api';
import { User, LogOut, Search, MessageCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cryptoService } from '../../services/crypto';

interface ChatUser {
    id: number;
    username: string;
    phone: string;
}

export const ChatList: React.FC = () => {
    const [users, setUsers] = useState<ChatUser[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        loadUsers();
    }, [searchTerm]);

    const loadUsers = async () => {
        try {
            const data = await api.getUsers(searchTerm || undefined);
            setUsers(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleChatOpen = async (otherUsername: string) => {
        // Проверяем, есть ли ключ чата
        let key = cryptoService.getChatKey(otherUsername);
        if (!key) {
            try {
                const { chatKey } = await api.createChat(otherUsername);
                cryptoService.setChatKey(otherUsername, chatKey);
            } catch (error) {
                console.error('Failed to create chat', error);
            }
        }
        navigate(`/chat/${otherUsername}`);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <MessageCircle className="w-8 h-8 text-indigo-600" />
                        <h1 className="text-2xl font-bold text-gray-900">Secure Chat</h1>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <User className="w-5 h-5 text-gray-500" />
                            <span className="text-gray-700">{user?.username}</span>
                        </div>
                        <button onClick={handleLogout} className="flex items-center space-x-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg">
                            <LogOut className="w-4 h-4" />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input type="text" placeholder="Search by username or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 pb-6">
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div><p className="mt-2 text-gray-500">Loading...</p></div>
                    ) : users.length === 0 ? (
                        <div className="p-8 text-center"><p className="text-gray-500">No contacts found</p></div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {users.map((u) => (
                                <button key={u.id} onClick={() => handleChatOpen(u.username)} className="w-full p-4 flex items-center space-x-4 hover:bg-gray-50 transition text-left">
                                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                                        <span className="text-white font-semibold text-lg">{u.username.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900">{u.username}</h3>
                                        <p className="text-sm text-gray-500">{u.phone}</p>
                                    </div>
                                    <MessageCircle className="w-5 h-5 text-indigo-600" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};