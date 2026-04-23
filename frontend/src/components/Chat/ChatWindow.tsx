import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/api';
import { cryptoService } from '../../services/crypto';
import { Send, ArrowLeft, Circle } from 'lucide-react';
import { Message } from './Message';
import toast from 'react-hot-toast';

interface ChatMessage {
    id: number;
    senderUsername: string;
    receiverUsername: string;
    encryptedContent: string;
    timestamp: string;
    read: boolean;
}

export const ChatWindow: React.FC = () => {
    const { username } = useParams<{ username: string }>();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [chatKey, setChatKey] = useState<string>('');
    const [isOnline, setIsOnline] = useState(false);
    const [lastSeen, setLastSeen] = useState<string>('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const hasMarkedRead = useRef(false);

    const currentUser = localStorage.getItem('user')
        ? JSON.parse(localStorage.getItem('user')!).username
        : '';

    // Загружаем статус собеседника
    useEffect(() => {
        if (username) {
            loadUserStatus();
            const statusInterval = setInterval(loadUserStatus, 5000);
            return () => clearInterval(statusInterval);
        }
    }, [username]);

    useEffect(() => {
        if (username) {
            initChat();
            const interval = setInterval(loadMessages, 3000);
            return () => clearInterval(interval);
        }
    }, [username]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Отмечаем сообщения как прочитанные при загрузке чата и при появлении новых
    useEffect(() => {
        if (messages.length > 0 && username) {
            markMessagesAsRead();
        }
    }, [messages, username]);

    const loadUserStatus = async () => {
        if (!username) return;
        try {
            const status = await api.getUserStatus(username);
            setIsOnline(status.online);
            setLastSeen(status.lastSeen);
        } catch (error) {
            console.error('Failed to load user status:', error);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const markMessagesAsRead = async () => {
        const unreadMessages = messages.filter(msg =>
            msg.receiverUsername === currentUser && !msg.read
        );

        if (unreadMessages.length > 0) {
            try {
                await api.markMessagesAsRead(username!);

                // Обновляем статус сообщений локально
                setMessages(prev => prev.map(msg =>
                    msg.receiverUsername === currentUser && !msg.read
                        ? { ...msg, read: true }
                        : msg
                ));

                // Отправляем событие обновления списка чатов
                window.dispatchEvent(new CustomEvent('messagesRead'));
            } catch (error) {
                console.error('Failed to mark messages as read:', error);
            }
        }
    };

    const initChat = async () => {
        if (!username) return;
        try {
            let key = cryptoService.getChatKey(username);
            if (!key) {
                const response = await api.createChat(username);
                key = response.chatKey;
                cryptoService.setChatKey(username, key);
            }
            setChatKey(key || '');
            await loadMessages();
        } catch (error) {
            console.error('Init chat error', error);
            toast.error('Could not initialize chat');
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async () => {
        if (!username) return;
        try {
            const data = await api.getConversation(username);
            setMessages(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newMessage.trim()) {
            toast.error('Введите сообщение');
            return;
        }

        if (sending) return;
        if (!chatKey) {
            toast.error('Ключ шифрования не найден');
            return;
        }

        setSending(true);

        try {
            const encrypted = cryptoService.encryptMessage(newMessage, chatKey);
            await api.sendMessage({
                receiverUsername: username!,
                encryptedContent: encrypted
            });

            window.dispatchEvent(new CustomEvent('newMessage', {
                detail: { senderUsername: currentUser, message: newMessage }
            }));

            setNewMessage('');
            await loadMessages();
            toast.success('Сообщение отправлено');
        } catch (error: any) {
            console.error('Failed to send message:', error);
            toast.error(error.response?.data?.message || 'Не удалось отправить сообщение');
        } finally {
            setSending(false);
        }
    };

    const decryptMessage = (encrypted: string): string => {
        if (!chatKey) return '🔒 Загрузка...';
        try {
            return cryptoService.decryptMessage(encrypted, chatKey);
        } catch (error) {
            console.error('Decryption failed:', error);
            return '🔒 Не удалось расшифровать';
        }
    };

    const formatLastSeen = (lastSeenStr?: string) => {
        if (!lastSeenStr) return 'неизвестно';
        const date = new Date(lastSeenStr);
        const now = new Date();
        const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

        if (diffMinutes < 1) return 'только что';
        if (diffMinutes < 60) return `${diffMinutes} мин. назад`;
        if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} ч. назад`;
        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => navigate('/chat')}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-lg">
                                {username?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        {isOnline && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                    </div>
                    <div>
                        <h2 className="font-semibold text-gray-900">{username}</h2>
                        <p className="text-xs text-gray-500">
                            {isOnline ? (
                                <span className="flex items-center gap-1">
                                    <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                                    Онлайн
                                </span>
                            ) : (
                                `Был(а) ${formatLastSeen(lastSeen)}`
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <p className="text-gray-500 mb-2">Нет сообщений</p>
                        <p className="text-sm text-gray-400">Напишите первое сообщение</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isOwn = msg.senderUsername === currentUser;
                        const decryptedText = decryptMessage(msg.encryptedContent);
                        return (
                            <Message
                                key={msg.id}
                                id={msg.id}
                                senderUsername={msg.senderUsername}
                                receiverUsername={msg.receiverUsername}
                                encryptedContent={msg.encryptedContent}
                                timestamp={msg.timestamp}
                                read={msg.read}
                                isOwn={isOwn}
                                decryptedText={decryptedText}
                            />
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t p-4">
                <form onSubmit={handleSend} className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Введите сообщение..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        disabled={sending}
                    />
                    <button
                        type="submit"
                        disabled={sending || !newMessage.trim()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition"
                    >
                        <Send className="w-4 h-4" />
                        <span>{sending ? 'Отправка...' : 'Отправить'}</span>
                    </button>
                </form>
            </div>
        </div>
    );
};