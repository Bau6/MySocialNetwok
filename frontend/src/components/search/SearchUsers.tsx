// src/components/search/SearchUsers.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/api';
import { Search, ArrowLeft, UserPlus, Users, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { User } from '../../types';

export const SearchUsers: React.FC = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            if (query.trim()) {
                performSearch();
            } else {
                setResults([]);
            }
        }, 500);
        return () => clearTimeout(delayDebounce);
    }, [query]);

    const performSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        try {
            const res = await api.searchUsers(query);
            const filtered = res.filter(u => u.username !== user?.username);
            setResults(filtered);
        } catch (error) {
            console.error('Search error:', error);
            toast.error('Ошибка поиска');
        } finally {
            setLoading(false);
        }
    };

    const handleStartChat = (username: string) => {
        navigate(`/chat/${username}`);
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center space-x-4">
                    <button onClick={() => navigate('/chat')} className="p-2 hover:bg-gray-100 rounded-lg">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900">Поиск пользователей</h1>
                </div>
            </div>
            <div className="max-w-2xl mx-auto px-4 py-6">
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Введите имя пользователя, телефон или email..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        autoFocus
                    />
                </div>
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center"><Loader2 className="animate-spin h-8 w-8 text-indigo-600 mx-auto" /></div>
                    ) : results.length === 0 ? (
                        <div className="p-8 text-center">
                            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">{query ? 'Пользователи не найдены' : 'Введите запрос для поиска'}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {results.map((userResult) => (
                                <div key={userResult.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                            {(userResult.fullName || userResult.username).charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{userResult.fullName || userResult.username}</p>
                                            <p className="text-xs text-gray-500">@{userResult.username}</p>
                                            {userResult.phone && <p className="text-xs text-gray-400">{userResult.phone}</p>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleStartChat(userResult.username)}
                                        className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1 text-sm"
                                    >
                                        <UserPlus className="w-4 h-4" /> Написать
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};