import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/api';
import { cryptoService } from '../../services/crypto';
import { Send, ArrowLeft, Circle, Loader2, MessageCircle, ChevronUp, Search, X } from 'lucide-react';
import { Message } from './Message';
import toast from 'react-hot-toast';
import { Message as MessageType, User, PageResponse } from '../../types';

interface ExtendedMessage extends MessageType {
    decryptedText?: string;
}

export const ChatWindow: React.FC = () => {
    const { username } = useParams<{ username: string }>();
    const [messages, setMessages] = useState<ExtendedMessage[]>([]);
    const [filteredMessages, setFilteredMessages] = useState<ExtendedMessage[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    const [recipientPublicKey, setRecipientPublicKey] = useState<string | null>(null);
    const [myPublicKey, setMyPublicKey] = useState<string | null>(null);
    const [otherUser, setOtherUser] = useState<User | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const prevScrollHeightRef = useRef<number>(0);
    const hasMarkedReadRef = useRef<boolean>(false);

    useEffect(() => {
        if (!username) navigate('/chat');
    }, [username, navigate]);

    // Загрузка ключей
    useEffect(() => {
        if (!username || !user) {
            if (!user) { logout(); navigate('/login'); }
            return;
        }
        const load = async () => {
            try {
                let myKey = user.publicKey;
                if (!myKey) {
                    const myProfile = await api.getCurrentUser();
                    myKey = myProfile.publicKey;
                }
                if (!myKey) throw new Error('Свой публичный ключ не найден');
                setMyPublicKey(myKey);

                const key = await api.getUserPublicKey(username);
                setRecipientPublicKey(key);
                const info = await api.getUserProfile(username);
                setOtherUser(info);
            } catch (err) {
                console.error(err);
                toast.error('Не удалось получить ключи для чата');
                navigate('/chat');
            }
        };
        load();
    }, [username, user, logout, navigate]);

    // Расшифровка
    const decryptMessages = useCallback(async (msgs: MessageType[]): Promise<ExtendedMessage[]> => {
        const result: ExtendedMessage[] = [];
        for (const msg of msgs) {
            const isOwn = msg.senderUsername === user?.username;
            try {
                let text: string;
                if (isOwn) {
                    text = await cryptoService.decryptFromUser({
                        encryptedContent: msg.encryptedContentForSender,
                        encryptedSessionKey: msg.encryptedSessionKeyForSender,
                        iv: msg.ivForSender,
                    });
                } else {
                    text = await cryptoService.decryptFromUser({
                        encryptedContent: msg.encryptedContent,
                        encryptedSessionKey: msg.encryptedSessionKey,
                        iv: msg.iv,
                    });
                }
                result.push({ ...msg, decryptedText: text });
            } catch (err) {
                console.error(`Decryption error for message ${msg.id}:`, err);
                result.push({ ...msg, decryptedText: isOwn ? 'Вы: ...' : '🔒 Ошибка расшифровки' });
            }
        }
        return result;
    }, [user]);

    // Загрузка первой страницы
    const loadFirstPage = useCallback(async () => {
        if (!username) return;
        setLoading(true);
        hasMarkedReadRef.current = false;
        try {
            const data = await api.getConversationPage(username, 0, 100);
            const decrypted = await decryptMessages(data.content);
            const sorted = decrypted.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            setMessages(sorted);
            setFilteredMessages(sorted);
            setHasMore(!data.last);
            setCurrentPage(0);
        } catch (error) {
            console.error('Failed to load messages:', error);
            toast.error('Не удалось загрузить сообщения');
        } finally {
            setLoading(false);
        }
    }, [username, decryptMessages]);

    // Загрузка предыдущих
    const loadMoreMessages = useCallback(async () => {
        if (!username || !hasMore || loadingMore) return;
        setLoadingMore(true);
        try {
            const nextPage = currentPage + 1;
            const data = await api.getConversationPage(username, nextPage, 100);
            const decrypted = await decryptMessages(data.content);
            if (decrypted.length > 0) {
                if (messagesContainerRef.current) {
                    prevScrollHeightRef.current = messagesContainerRef.current.scrollHeight;
                }
                const newMessages = [...decrypted, ...messages];
                setMessages(newMessages);
                setFilteredMessages(newMessages);
                setCurrentPage(nextPage);
                setHasMore(!data.last);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error('Failed to load more messages:', error);
            toast.error('Не удалось загрузить историю');
        } finally {
            setLoadingMore(false);
        }
    }, [username, hasMore, loadingMore, currentPage, decryptMessages, messages]);

    // Отметка о прочтении при загрузке
    useEffect(() => {
        if (!username || messages.length === 0) return;
        const unreadFromOther = messages.filter(m => m.senderUsername !== user?.username && !m.read);
        if (unreadFromOther.length > 0 && !hasMarkedReadRef.current) {
            hasMarkedReadRef.current = true;
            api.markMessagesAsRead(username).then(() => {
                setMessages(prev => prev.map(m =>
                    m.senderUsername !== user?.username && !m.read ? { ...m, read: true } : m
                ));
                setFilteredMessages(prev => prev.map(m =>
                    m.senderUsername !== user?.username && !m.read ? { ...m, read: true } : m
                ));
            }).catch(console.error);
        }
    }, [messages, username, user]);

    // Инициализация
    useEffect(() => {
        if (myPublicKey && recipientPublicKey) loadFirstPage();
    }, [myPublicKey, recipientPublicKey, loadFirstPage]);

    // Поиск
    useEffect(() => {
        if (!searchTerm.trim()) setFilteredMessages(messages);
        else {
            const lower = searchTerm.toLowerCase();
            setFilteredMessages(messages.filter(m => m.decryptedText?.toLowerCase().includes(lower)));
        }
    }, [searchTerm, messages]);

    // Восстановление прокрутки
    useEffect(() => {
        if (!loadingMore && prevScrollHeightRef.current > 0 && messagesContainerRef.current) {
            const newHeight = messagesContainerRef.current.scrollHeight;
            messagesContainerRef.current.scrollTop = newHeight - prevScrollHeightRef.current;
            prevScrollHeightRef.current = 0;
        }
    }, [loadingMore, messages]);

    // Опрос новых сообщений и обновление статуса прочтения
    useEffect(() => {
        if (!username || !myPublicKey || !recipientPublicKey) return;
        const interval = setInterval(async () => {
            try {
                // Получаем последние 100 сообщений (это обновит и статусы read для всех сообщений)
                const freshData = await api.getConversationPage(username, 0, 100);
                const decrypted = await decryptMessages(freshData.content);
                const sorted = decrypted.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                setMessages(sorted);
                setFilteredMessages(sorted);
                setHasMore(!freshData.last);
                setCurrentPage(0);
                // Если среди новых есть сообщение от собеседника, помечаем его прочитанным (повторно)
                const hasNewFromOther = sorted.some(m => m.senderUsername !== user?.username && !m.read);
                if (hasNewFromOther) {
                    await api.markMessagesAsRead(username);
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [username, user, decryptMessages, myPublicKey, recipientPublicKey]);

    // Прокрутка вниз
    useEffect(() => {
        if (filteredMessages.length) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [filteredMessages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;
        if (!recipientPublicKey || !myPublicKey) {
            toast.error('Ключи не загружены');
            return;
        }
        if (!cryptoService.isReady()) {
            toast.error('Криптомодуль не готов. Перезайдите.');
            return;
        }
        setSending(true);
        try {
            const forReceiver = await cryptoService.encryptForUser(newMessage, recipientPublicKey);
            const forSender = await cryptoService.encryptForUser(newMessage, myPublicKey);
            const sentMsg = await api.sendEncryptedMessage({
                receiverUsername: username!,
                encryptedContent: forReceiver.encryptedContent,
                encryptedSessionKey: forReceiver.encryptedSessionKey,
                iv: forReceiver.iv,
                encryptedContentForSender: forSender.encryptedContent,
                encryptedSessionKeyForSender: forSender.encryptedSessionKey,
                ivForSender: forSender.iv,
                type: 'TEXT',
            });
            const decryptedMe = await cryptoService.decryptFromUser({
                encryptedContent: forSender.encryptedContent,
                encryptedSessionKey: forSender.encryptedSessionKey,
                iv: forSender.iv,
            });
            const optMsg: ExtendedMessage = { ...sentMsg, decryptedText: decryptedMe, read: false };
            const newMsgs = [...messages, optMsg];
            setMessages(newMsgs);
            setFilteredMessages(newMsgs);
            setNewMessage('');
            localStorage.setItem(`last_own_msg_${username!}`, JSON.stringify({
                text: newMessage.length > 50 ? newMessage.substring(0,47)+'...' : newMessage,
                timestamp: sentMsg.timestamp,
            }));
        } catch (err) {
            console.error(err);
            toast.error('Не удалось отправить сообщение');
        } finally {
            setSending(false);
        }
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.target as HTMLDivElement;
        if (target.scrollTop === 0 && hasMore && !loadingMore) loadMoreMessages();
    };

    const toggleSearch = () => {
        setShowSearch(!showSearch);
        if (showSearch) setSearchTerm('');
    };

    if (loading || !myPublicKey || !recipientPublicKey) {
        return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;
    }

    const getDisplayText = (msg: ExtendedMessage) => msg.decryptedText || (msg.senderUsername === user?.username ? 'Вы: ...' : '🔒 Расшифровка...');

    return (
        <div className="flex-1 flex flex-col bg-gray-50 h-screen">
            {/* Header */}
            <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center">
                    <button onClick={() => navigate('/chat')} className="p-2 hover:bg-gray-100 rounded-lg mr-3">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {otherUser?.fullName?.charAt(0) || username?.charAt(0) || '?'}
                        </div>
                        {otherUser?.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>}
                    </div>
                    <div className="ml-3">
                        <h2 className="font-semibold text-gray-900">{otherUser?.fullName || username}</h2>
                        <p className="text-xs text-gray-500">{otherUser?.online ? <span className="flex items-center gap-1"><Circle className="w-2 h-2 fill-green-500 text-green-500" /> Онлайн</span> : 'Не в сети'}</p>
                    </div>
                </div>
                <button onClick={toggleSearch} className="p-2 hover:bg-gray-100 rounded-lg">
                    {showSearch ? <X className="w-5 h-5 text-gray-600" /> : <Search className="w-5 h-5 text-gray-600" />}
                </button>
            </div>

            {showSearch && (
                <div className="bg-white p-3 border-b">
                    <input type="text" placeholder="Поиск по сообщениям..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" autoFocus />
                    {searchTerm && <p className="text-xs text-gray-400 mt-1">Найдено {filteredMessages.length} из {messages.length}</p>}
                </div>
            )}

            <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMore && <div className="flex justify-center py-2"><Loader2 className="animate-spin h-5 w-5 text-indigo-600" /></div>}
                {filteredMessages.length === 0 && !loadingMore && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
                        <p className="text-gray-500">{searchTerm ? 'Сообщения не найдены' : 'Нет сообщений'}</p>
                    </div>
                )}
                {filteredMessages.map(msg => (
                    <Message key={msg.id} id={msg.id} senderUsername={msg.senderUsername} decryptedText={getDisplayText(msg)} timestamp={msg.timestamp} read={msg.read} isOwn={msg.senderUsername === user?.username} type={msg.type} fileUrl={msg.fileUrl} fileName={msg.fileName} fileSize={msg.fileSize} />
                ))}
                {!loadingMore && hasMore && messages.length >= 100 && filteredMessages.length === messages.length && (
                    <div className="flex justify-center py-2">
                        <button onClick={loadMoreMessages} className="text-indigo-600 text-sm hover:underline flex items-center gap-1"><ChevronUp className="w-4 h-4" /> Загрузить предыдущие</button>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="bg-white border-t p-4">
                <form onSubmit={handleSend} className="flex items-center space-x-2">
                    <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Введите сообщение..." className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" disabled={sending} />
                    <button type="submit" disabled={sending || !newMessage.trim()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}<span>Отправить</span>
                    </button>
                </form>
            </div>
        </div>
    );
};