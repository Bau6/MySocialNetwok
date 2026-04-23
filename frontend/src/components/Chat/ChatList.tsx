import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/api';
import { User, LogOut, Search, MessageCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cryptoService } from '../../services/crypto';
import { differenceInMinutes, differenceInHours, format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ChatUser {
    id: number;
    username: string;
    phone: string;
    email?: string;
    lastMessage?: string;
    lastMessageTime?: string;
    lastMessageDecrypted?: string;
    unreadCount?: number;
    isOnline?: boolean;
    lastSeen?: string;
}

export const ChatList: React.FC = () => {
    const [users, setUsers] = useState<ChatUser[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Загружаем чаты при монтировании и каждые 3 секунды
    useEffect(() => {
        loadChats();
        const interval = setInterval(loadChats, 3000);
        return () => clearInterval(interval);
    }, []);

    const loadChats = async () => {
        try {
            // Получаем всех пользователей
            const data = await api.getUsers(searchTerm || undefined);

            // Для каждого пользователя получаем последнее сообщение и счетчик
            const usersWithMeta = await Promise.all(
                data.map(async (u: ChatUser) => {
                    try {
                        const conversation = await api.getConversation(u.username);

                        // Получаем ключ для расшифровки
                        let chatKey = cryptoService.getChatKey(u.username);
                        if (!chatKey && conversation.length > 0) {
                            try {
                                const { chatKey: newKey } = await api.createChat(u.username);
                                cryptoService.setChatKey(u.username, newKey);
                                chatKey = newKey;
                            } catch (e) {}
                        }

                        // Получаем последнее сообщение
                        const lastMsg = conversation[conversation.length - 1];
                        let lastMessageDecrypted = '';
                        if (lastMsg && chatKey) {
                            try {
                                lastMessageDecrypted = cryptoService.decryptMessage(lastMsg.encryptedContent, chatKey);
                                if (lastMessageDecrypted.length > 50) {
                                    lastMessageDecrypted = lastMessageDecrypted.substring(0, 50) + '...';
                                }
                            } catch (e) {
                                lastMessageDecrypted = '🔒 Зашифрованное сообщение';
                            }
                        }

                        // Считаем непрочитанные (только где получатель - текущий пользователь)
                        const unreadCount = conversation.filter(msg =>
                            !msg.read && msg.receiverUsername === user?.username
                        ).length;

                        // Получаем статус пользователя
                        const status = await api.getUserStatus(u.username);

                        return {
                            ...u,
                            lastMessage: lastMsg ? (lastMessageDecrypted || 'Новое сообщение') : 'Нет сообщений',
                            lastMessageTime: lastMsg?.timestamp,
                            unreadCount,
                            isOnline: status.online,
                            lastSeen: status.lastSeen
                        };
                    } catch (error) {
                        console.error('Error processing user:', u.username, error);
                        return {
                            ...u,
                            lastMessage: 'Нет сообщений',
                            unreadCount: 0,
                            isOnline: false,
                            lastSeen: new Date().toISOString()
                        };
                    }
                })
            );

            // Сортируем: сначала с непрочитанными, потом онлайн, потом по времени
            usersWithMeta.sort((a, b) => {
                // Сначала с непрочитанными (только если > 0)
                if ((a.unreadCount || 0) > 0 && (b.unreadCount || 0) === 0) return -1;
                if ((a.unreadCount || 0) === 0 && (b.unreadCount || 0) > 0) return 1;
                if (a.isOnline && !b.isOnline) return -1;
                if (!a.isOnline && b.isOnline) return 1;
                if (a.lastMessageTime && b.lastMessageTime) {
                    return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
                }
                return 0;
            });

            setUsers(usersWithMeta);

            // Воспроизводим звук уведомления если есть новые сообщения
            const hasNewMessages = usersWithMeta.some(u => u.unreadCount && u.unreadCount > 0);
            if (hasNewMessages && document.hidden) {
                playNotificationSound();
            }

        } catch (error) {
            console.error('Error loading chats:', error);
        } finally {
            setLoading(false);
        }
    };

    const playNotificationSound = () => {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.log('Audio play failed:', e));
    };

    const formatLastSeen = (lastSeen?: string) => {
        if (!lastSeen) return 'Неизвестно';

        const date = new Date(lastSeen);
        const now = new Date();
        const diffMinutes = differenceInMinutes(now, date);
        const diffHours = differenceInHours(now, date);

        if (diffMinutes < 1) return 'Только что';
        if (diffMinutes < 60) return `${diffMinutes} мин. назад`;
        if (diffHours < 24) return `${diffHours} ч. назад`;
        return format(date, 'd MMM', { locale: ru });
    };

    const formatMessageTime = (timestamp?: string) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diffMinutes = differenceInMinutes(now, date);

        if (diffMinutes < 1) return 'Только что';
        if (diffMinutes < 60) return `${diffMinutes} мин. назад`;
        if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} ч. назад`;
        return format(date, 'd MMM', { locale: ru });
    };

    const handleChatOpen = async (otherUsername: string) => {
        // Сброс счетчика непрочитанных при открытии чата
        setUsers(prev => prev.map(u =>
            u.username === otherUsername ? { ...u, unreadCount: 0 } : u
        ));

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

    // Браузерные уведомления
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        const handleNewMessage = (event: CustomEvent) => {
            const { senderUsername, message } = event.detail;
            if (document.hidden && Notification.permission === 'granted') {
                new Notification(`Новое сообщение от ${senderUsername}`, {
                    body: message,
                    icon: '/vite.svg'
                });
            }
            loadChats();
        };

        const handleMessagesRead = () => {
            // Обновляем список чатов, чтобы убрать счетчик непрочитанных
            loadChats();
        };

        window.addEventListener('newMessage', handleNewMessage as EventListener);
        window.addEventListener('messagesRead', handleMessagesRead as EventListener);

        return () => {
            window.removeEventListener('newMessage', handleNewMessage as EventListener);
            window.removeEventListener('messagesRead', handleMessagesRead as EventListener);
        };
    }, []);

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone.includes(searchTerm) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

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
                            <div className="relative">
                                <User className="w-5 h-5 text-gray-500" />
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                            </div>
                            <span className="text-gray-700">{user?.username}</span>
                        </div>
                        <button onClick={handleLogout} className="flex items-center space-x-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg">
                            <LogOut className="w-4 h-4" />
                            <span>Выйти</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Поиск по имени, телефону или email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 pb-6">
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            <p className="mt-2 text-gray-500">Загрузка...</p>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-gray-500">
                                {searchTerm ? 'Пользователи не найдены' : 'Нет контактов'}
                            </p>
                            <p className="text-sm text-gray-400 mt-2">
                                {searchTerm ? 'Попробуйте изменить поисковый запрос' : 'Начните общаться с новыми людьми'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {filteredUsers.map((u) => (
                                <button
                                    key={u.id}
                                    onClick={() => handleChatOpen(u.username)}
                                    className="w-full p-4 flex items-center space-x-4 hover:bg-gray-50 transition text-left relative"
                                >
                                    <div className="relative flex-shrink-0">
                                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                                            <span className="text-white font-semibold text-lg">
                                                {u.username.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        {u.isOnline && (
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                                        )}
                                    </div>

                                    <div className="flex-1 text-left">
                                        <div className="flex justify-between items-baseline">
                                            <h3 className="font-semibold text-gray-900">{u.username}</h3>
                                            {u.lastMessageTime && (
                                                <span className="text-xs text-gray-400">
                                                    {formatMessageTime(u.lastMessageTime)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-2 mt-1">
                                            <p className={`text-sm truncate ${u.unreadCount ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                                                {u.lastMessage || 'Нет сообщений'}
                                            </p>
                                        </div>
                                        {u.email && (
                                            <p className="text-xs text-gray-400 mt-0.5">{u.phone}</p>
                                        )}
                                    </div>

                                    {u.unreadCount && u.unreadCount > 0 && (
                                        <div className="ml-2 bg-indigo-600 text-white rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-bold">
                                            {u.unreadCount > 99 ? '99+' : u.unreadCount}
                                        </div>
                                    )}

                                    <MessageCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};