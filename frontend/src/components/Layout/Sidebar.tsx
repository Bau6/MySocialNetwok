import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/api';
import {
    MessageCircle,
    Users,
    Settings,
    LogOut,
    Shield,
    User,
    Search,
    PlusCircle,
    ChevronLeft,
    ChevronRight,
    Star,
    Archive,
    Bell,
    Menu
} from 'lucide-react';

interface ChatUser {
    id: number;
    username: string;
    email: string;
    lastMessage?: string;
    lastMessageTime?: string;
    unreadCount?: number;
    online?: boolean;
}

interface SidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    onSelectChat?: (username: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle, onSelectChat }) => {
    const [users, setUsers] = useState<ChatUser[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'chats' | 'contacts'>('chats');
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        loadUsers();
        const interval = setInterval(loadUsers, 10000);
        return () => clearInterval(interval);
    }, []);

    const loadUsers = async () => {
        try {
            const data = await api.getAllUsers();
            // Simulate last message and unread count (in real app, get from API)
            const usersWithMeta = data.map((u: any) => ({
                ...u,
                lastMessage: 'Click to start chatting',
                lastMessageTime: new Date().toISOString(),
                unreadCount: Math.random() > 0.8 ? Math.floor(Math.random() * 5) : 0,
                online: Math.random() > 0.7
            }));
            setUsers(usersWithMeta);
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleChatSelect = (username: string) => {
        if (onSelectChat) {
            onSelectChat(username);
        } else {
            navigate(`/chat/${username}`);
        }
        if (window.innerWidth < 768) {
            onToggle();
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
                    onClick={onToggle}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed md:relative top-0 left-0 h-full bg-white dark:bg-gray-800 shadow-xl transition-transform duration-300 z-30 flex flex-col ${
                    isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                }`}
                style={{ width: '320px' }}
            >
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <MessageCircle className="w-5 h-5 text-white" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Secure Chat</h2>
                        </div>
                        <button
                            onClick={onToggle}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 md:hidden"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search chats..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('chats')}
                        className={`flex-1 py-3 text-sm font-medium transition ${
                            activeTab === 'chats'
                                ? 'text-indigo-600 border-b-2 border-indigo-600'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                    >
                        <div className="flex items-center justify-center space-x-2">
                            <MessageCircle className="w-4 h-4" />
                            <span>Chats</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('contacts')}
                        className={`flex-1 py-3 text-sm font-medium transition ${
                            activeTab === 'contacts'
                                ? 'text-indigo-600 border-b-2 border-indigo-600'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                    >
                        <div className="flex items-center justify-center space-x-2">
                            <Users className="w-4 h-4" />
                            <span>Contacts</span>
                        </div>
                    </button>
                </div>

                {/* User list */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full p-4">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            <p className="mt-2 text-sm text-gray-500">Loading contacts...</p>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                            <Users className="w-12 h-12 text-gray-300 mb-2" />
                            <p className="text-gray-500">No contacts found</p>
                            <button className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition">
                                Add Contact
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredUsers.map((chatUser) => (
                                <button
                                    key={chatUser.id}
                                    onClick={() => handleChatSelect(chatUser.username)}
                                    className="w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left group"
                                >
                                    <div className="flex items-center space-x-3">
                                        {/* Avatar */}
                                        <div className="relative flex-shrink-0">
                                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">
                          {chatUser.username.charAt(0).toUpperCase()}
                        </span>
                                            </div>
                                            {chatUser.online && (
                                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                                            )}
                                        </div>

                                        {/* User info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className="font-semibold text-gray-900 dark:text-white truncate">
                                                    {chatUser.username}
                                                </p>
                                                {chatUser.lastMessageTime && (
                                                    <span className="text-xs text-gray-400">
                            {new Date(chatUser.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                {chatUser.lastMessage || 'Click to start chatting'}
                                            </p>
                                        </div>

                                        {/* Unread badge */}
                                        {chatUser.unreadCount && chatUser.unreadCount > 0 && (
                                            <div className="flex-shrink-0 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                                                <span className="text-white text-xs">{chatUser.unreadCount}</span>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.username}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Online</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-1">
                            <button
                                onClick={handleLogout}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                title="Logout"
                            >
                                <LogOut className="w-4 h-4 text-red-500" />
                            </button>
                            <button
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                title="Settings"
                            >
                                <Settings className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                            </button>
                            <button
                                onClick={onToggle}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition md:hidden"
                            >
                                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};