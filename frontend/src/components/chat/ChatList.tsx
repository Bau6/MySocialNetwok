import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/api';
import { cryptoService } from '../../services/crypto';
import { LogOut, MessageCircle, UserCircle, Settings, Users, Search } from 'lucide-react';
import { differenceInMinutes, format } from 'date-fns';
import { ru } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { ChatPreviewResponse } from '../../types';
import { useWebSocketChat } from '../../hooks/useWebSocketChat';

const getLastOwnMessageCacheKey = (chatUsername: string) => `last_own_msg_${chatUsername}`;

export const ChatList: React.FC = () => {
    const [chats, setChats] = useState<(ChatPreviewResponse & { lastMessageDecrypted?: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const previousUnreadCounts = useRef<Map<string, number>>(new Map());
    const notificationSoundPlayed = useRef<Set<string>>(new Set());

    // Загрузка чатов с бэкенда
    const loadChats = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await api.getChats();
            const chatsWithDecrypted = await Promise.all(data.map(async (chat) => {
                let lastMessageDecrypted = '';
                if (chat.lastMessageType === 'TEXT' && chat.lastMessageEncrypted) {
                    try {
                        const decrypted = await cryptoService.decryptFromUser({
                            encryptedContent: chat.lastMessageEncrypted,
                            encryptedSessionKey: chat.lastMessageEncryptedSessionKey,
                            iv: chat.lastMessageIv,
                        });
                        lastMessageDecrypted = decrypted.length > 50 ? decrypted.substring(0, 47) + '...' : decrypted;
                    } catch (e) {
                        lastMessageDecrypted = '🔒 Зашифрованное сообщение';
                    }
                } else if (chat.lastMessageType === 'VOICE') {
                    lastMessageDecrypted = 'Голосовое сообщение';
                } else if (chat.lastMessageType === 'VIDEO') {
                    lastMessageDecrypted = 'Видеосообщение';
                } else if (chat.lastMessageType === 'IMAGE') {
                    lastMessageDecrypted = 'Изображение';
                } else if (chat.lastMessageType === 'FILE') {
                    lastMessageDecrypted = 'Файл';
                } else {
                    if (chat.lastMessageEncrypted) {
                        try {
                            const decrypted = await cryptoService.decryptFromUser({
                                encryptedContent: chat.lastMessageEncrypted,
                                encryptedSessionKey: chat.lastMessageEncryptedSessionKey,
                                iv: chat.lastMessageIv,
                            });
                            lastMessageDecrypted = decrypted.length > 50 ? decrypted.substring(0, 47) + '...' : decrypted;
                        } catch (e) {
                            const cached = localStorage.getItem(getLastOwnMessageCacheKey(chat.username));
                            if (cached) {
                                try {
                                    const { text, timestamp } = JSON.parse(cached);
                                    if (timestamp === chat.lastMessageTime) {
                                        lastMessageDecrypted = text;
                                    } else {
                                        lastMessageDecrypted = 'Вы: ...';
                                    }
                                } catch {
                                    lastMessageDecrypted = 'Вы: ...';
                                }
                            } else {
                                lastMessageDecrypted = 'Новое сообщение';
                            }
                        }
                    }
                }
                return { ...chat, lastMessageDecrypted };
            }));
            setChats(chatsWithDecrypted);
        } catch (error) {
            console.error('Error loading chats:', error);
            toast.error('Не удалось загрузить чаты');
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Обработчик новых сообщений от WebSocket – обновляем список чатов
    const handleNewMessage = useCallback(() => {
        // Просто перезагружаем чаты
        loadChats();
    }, [loadChats]);

    // Подписка на WebSocket для получения новых сообщений
    useWebSocketChat(handleNewMessage);

    // Первоначальная загрузка
    useEffect(() => {
        loadChats();
    }, [loadChats]);

    // Уведомления (звук, браузерные) обрабатываются отдельно при обновлении
    useEffect(() => {
        if (chats.length) {
            chats.forEach(chat => {
                const prev = previousUnreadCounts.current.get(chat.username) || 0;
                if (chat.unreadCount > prev) {
                    const key = `${chat.username}_${Date.now()}`;
                    if (!notificationSoundPlayed.current.has(key)) {
                        notificationSoundPlayed.current.add(key);
                        playNotificationSound();
                        if (Notification.permission === 'granted') {
                            new Notification(`Новое сообщение от ${chat.fullName || chat.username}`, {
                                body: chat.lastMessageDecrypted || 'У вас новое сообщение',
                                icon: '/vite.svg'
                            });
                        }
                        setTimeout(() => notificationSoundPlayed.current.delete(key), 5000);
                    }
                }
                previousUnreadCounts.current.set(chat.username, chat.unreadCount);
            });
        }
    }, [chats]);

    const playNotificationSound = () => {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.log('Audio play failed:', e));
    };

    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    const formatMessageTime = (timestamp?: string) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = differenceInMinutes(now, date);
        if (diff < 1) return 'Только что';
        if (diff < 60) return `${diff} мин. назад`;
        if (diff < 1440) return `${Math.floor(diff / 60)} ч. назад`;
        return format(date, 'd MMM', { locale: ru });
    };

    const formatLastSeen = (lastSeenStr?: string) => {
        if (!lastSeenStr) return '';
        const date = new Date(lastSeenStr);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 60000);
        if (diff < 1) return 'только что';
        if (diff < 60) return `${diff} мин. назад`;
        if (diff < 1440) return `${Math.floor(diff / 60)} ч. назад`;
        return format(date, 'd MMM', { locale: ru });
    };

    const handleChatOpen = (username: string) => {
        setChats(prev => prev.map(c => c.username === username ? { ...c, unreadCount: 0 } : c));
        previousUnreadCounts.current.set(username, 0);
        navigate(`/chat/${username}`);
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <div className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <MessageCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Secure Chat</h1>
                            <p className="text-xs text-gray-500">E2EE защита</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button onClick={() => navigate('/search/users')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg flex items-center gap-1">
                            <Search className="w-5 h-5" />
                            <span className="hidden sm:inline">Поиск</span>
                        </button>
                        <button onClick={() => navigate('/profile')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                            <Settings className="w-5 h-5" />
                        </button>
                        <button onClick={handleLogout} className="flex items-center space-x-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg">
                            <LogOut className="w-4 h-4" />
                            <span>Выйти</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto w-full px-4 pb-6 flex-1">
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" /></div>
                    ) : chats.length === 0 ? (
                        <div className="p-8 text-center">
                            <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">Нет чатов</p>
                            <button onClick={() => navigate('/search/users')} className="mt-2 text-indigo-600 hover:underline">Найти пользователей</button>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {chats.map((chat) => (
                                <button key={chat.username} onClick={() => handleChatOpen(chat.username)} className="w-full p-4 flex items-center space-x-4 hover:bg-gray-50 transition text-left group">
                                    <div className="relative">
                                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                                            {(chat.fullName || chat.username).charAt(0).toUpperCase()}
                                        </div>
                                        {chat.online && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-baseline">
                                            <h3 className="font-semibold text-gray-900">{chat.fullName || chat.username}</h3>
                                            {chat.lastMessageTime && <span className="text-xs text-gray-400">{formatMessageTime(chat.lastMessageTime)}</span>}
                                        </div>
                                        <p className={`text-sm truncate ${chat.unreadCount ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                                            {chat.lastMessageDecrypted || 'Нет сообщений'}
                                        </p>
                                        {!chat.online && chat.lastSeen && <p className="text-xs text-gray-400 mt-1">Был(а) {formatLastSeen(chat.lastSeen)}</p>}
                                    </div>
                                    {chat.unreadCount > 0 && (
                                        <div className="bg-indigo-600 text-white rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-bold">
                                            {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                                        </div>
                                    )}
                                    <Users className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};