import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/api';
import { cryptoService } from '../../services/crypto';
import { Send, ArrowLeft, Circle, Loader2, MessageCircle, Search, X, Paperclip, ArrowDown } from 'lucide-react';
import { Message } from './Message';
import { fileCache } from '../../services/fileCache';
import { VoiceRecorder } from './VoiceRecorder';
import { VideoRecorder } from './VideoRecorder';
import toast from 'react-hot-toast';
import { Message as MessageType, User, PageResponse, SendMessageData } from '../../types';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useWebSocketChat } from '../../hooks/useWebSocketChat';
import { GlobalAudioPlayer } from './GlobalAudioPlayer';
import { VideoModal } from './VideoModal';

interface ExtendedMessage extends MessageType {
    decryptedText?: string;
}

export const ChatWindow: React.FC = () => {
    const { username } = useParams<{ username: string }>();
    const [messages, setMessages] = useState<ExtendedMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    const [recipientPublicKey, setRecipientPublicKey] = useState<string | null>(null);
    const [myPublicKey, setMyPublicKey] = useState<string | null>(null);
    const [otherUser, setOtherUser] = useState<User | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [replyTo, setReplyTo] = useState<ExtendedMessage | null>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const scrollTimeoutRef = useRef<NodeJS.Timeout>();
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [showAudioPlayer, setShowAudioPlayer] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [videoCircle, setVideoCircle] = useState(false);

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

    // Очистка кеша при выходе из чата
    useEffect(() => {
        return () => {
            fileCache.clear();
        };
    }, [username]);

    // Расшифровка сообщений (только для текстовых)
    const decryptMessages = useCallback(async (msgs: MessageType[]): Promise<ExtendedMessage[]> => {
        const result: ExtendedMessage[] = [];
        for (const msg of msgs) {
            if (msg.type !== 'TEXT') {
                result.push({ ...msg, decryptedText: '' });
                continue;
            }
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
        try {
            const data = await api.getConversationPage(username, 0, 100);
            const decrypted = await decryptMessages(data.content);
            const sorted = decrypted.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            setMessages(sorted);
            setHasMore(!data.last);
            setPage(0);
        } catch (error) {
            console.error('Failed to load messages:', error);
            toast.error('Не удалось загрузить сообщения');
        } finally {
            setLoading(false);
        }
    }, [username, decryptMessages]);

    // Загрузка предыдущих сообщений
    const loadMore = useCallback(async () => {
        if (!username || !hasMore || loadingMore) return;
        setLoadingMore(true);
        try {
            const nextPage = page + 1;
            const data = await api.getConversationPage(username, nextPage, 100);
            const decrypted = await decryptMessages(data.content);
            if (decrypted.length > 0) {
                setMessages(prev => [...decrypted.reverse(), ...prev]);
                setPage(nextPage);
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
    }, [username, hasMore, loadingMore, page, decryptMessages]);

    // Обработчик скролла
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const target = e.target as HTMLDivElement;
        const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
        setIsAtBottom(isNearBottom);
        setShowScrollButton(!isNearBottom);
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {}, 500);
    }, []);

    const scrollToBottom = useCallback(() => {
        if (messages.length > 0) {
            virtuosoRef.current?.scrollToIndex({ index: messages.length - 1, behavior: 'smooth' });
            setIsAtBottom(true);
            setShowScrollButton(false);
        }
    }, [messages.length]);

    useEffect(() => {
        if (messages.length > 0 && isAtBottom && !searchTerm) {
            scrollToBottom();
        }
    }, [messages.length, isAtBottom, searchTerm, scrollToBottom]);

    // WebSocket обработчик
    const handleNewWebSocketMessage = useCallback((newMsg: MessageType) => {
        const isOwn = newMsg.senderUsername === user?.username;
        (async () => {
            let decryptedText = '';
            if (newMsg.type === 'TEXT') {
                if (isOwn) {
                    decryptedText = await cryptoService.decryptFromUser({
                        encryptedContent: newMsg.encryptedContentForSender,
                        encryptedSessionKey: newMsg.encryptedSessionKeyForSender,
                        iv: newMsg.ivForSender,
                    });
                } else {
                    decryptedText = await cryptoService.decryptFromUser({
                        encryptedContent: newMsg.encryptedContent,
                        encryptedSessionKey: newMsg.encryptedSessionKey,
                        iv: newMsg.iv,
                    });
                }
            }
            setMessages(prev => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, { ...newMsg, decryptedText }];
            });
            if (!isOwn && username) {
                api.markMessagesAsRead(username);
            }
        })();
    }, [user, username]);

    const { sendMessage } = useWebSocketChat(handleNewWebSocketMessage);

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
            const sendData: SendMessageData = {
                receiverUsername: username!,
                encryptedContent: forReceiver.encryptedContent,
                encryptedSessionKey: forReceiver.encryptedSessionKey,
                iv: forReceiver.iv,
                encryptedContentForSender: forSender.encryptedContent,
                encryptedSessionKeyForSender: forSender.encryptedSessionKey,
                ivForSender: forSender.iv,
                type: 'TEXT',
            };
            const sentMsg = await api.sendEncryptedMessage(sendData);
            sendMessage(username!, sendData);
            const decryptedMe = await cryptoService.decryptFromUser({
                encryptedContent: forSender.encryptedContent,
                encryptedSessionKey: forSender.encryptedSessionKey,
                iv: forSender.iv,
            });
            const optimisticMsg: ExtendedMessage = { ...sentMsg, decryptedText: decryptedMe };
            setMessages(prev => [...prev, optimisticMsg]);
            setNewMessage('');
            inputRef.current?.focus();
            if (isAtBottom) scrollToBottom();
            localStorage.setItem(`last_own_msg_${username!}`, JSON.stringify({
                text: newMessage.length > 50 ? newMessage.substring(0, 47) + '...' : newMessage,
                timestamp: sentMsg.timestamp,
            }));
        } catch (err) {
            console.error(err);
            toast.error('Не удалось отправить сообщение');
        } finally {
            setSending(false);
        }
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setUploadingFile(true);
        try {
            let fileType: 'avatar' | 'message' | 'voice' = 'message';
            if (file.type.startsWith('audio/')) fileType = 'voice';
            if (file.type.startsWith('video/')) fileType = 'message';

            const fileKey = await cryptoService.generateFileKey();
            const encryptedBlob = await cryptoService.encryptBlob(file, fileKey);
            const encryptedFile = new File([encryptedBlob], file.name, { type: file.type });
            const uploadRes = await api.uploadFile(encryptedFile, fileType);

            const forReceiver = await cryptoService.encryptSessionKey(fileKey, recipientPublicKey!);
            const forSender = await cryptoService.encryptSessionKey(fileKey, myPublicKey!);

            let msgType = 'FILE';
            if (file.type.startsWith('audio/')) msgType = 'VOICE';
            else if (file.type.startsWith('video/')) msgType = 'VIDEO';
            else if (file.type.startsWith('image/')) msgType = 'IMAGE';

            const sendData: SendMessageData = {
                receiverUsername: username!,
                encryptedContent: '',
                encryptedSessionKey: forReceiver.encryptedSessionKey,
                iv: forReceiver.iv,
                encryptedContentForSender: '',
                encryptedSessionKeyForSender: forSender.encryptedSessionKey,
                ivForSender: forSender.iv,
                type: msgType,
                circle: msgType === 'VIDEO',
                fileUrl: uploadRes.fileUrl,
                fileName: uploadRes.fileName,
                fileSize: uploadRes.fileSize,
            };
            const sentMsg = await api.sendEncryptedMessage(sendData);
            sendMessage(username!, sendData);
            setMessages(prev => [...prev, { ...sentMsg, decryptedText: '' }]);
            toast.success('Файл отправлен');
            if (isAtBottom) scrollToBottom();
        } catch (err) {
            console.error(err);
            toast.error('Не удалось отправить файл');
        } finally {
            setUploadingFile(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    useEffect(() => {
        if (messages.length && username) {
            const unreadFromOther = messages.some(m => m.senderUsername !== user?.username && !m.read);
            if (unreadFromOther) {
                api.markMessagesAsRead(username);
                setMessages(prev => prev.map(m =>
                    m.senderUsername !== user?.username && !m.read ? { ...m, read: true } : m
                ));
            }
        }
    }, [messages, username, user]);

    useEffect(() => {
        if (myPublicKey && recipientPublicKey) loadFirstPage();
    }, [myPublicKey, recipientPublicKey, loadFirstPage]);

    useEffect(() => {
        if (!loading && messages.length > 0) {
            setTimeout(() => scrollToBottom(), 100);
        }
    }, [loading, messages.length, scrollToBottom]);

    const handlePlayAudio = (url: string) => {
        setAudioUrl(url);
        setShowAudioPlayer(true);
    };

    const handlePlayVideo = (url: string, circle: boolean) => {
        setVideoUrl(url);
        setVideoCircle(circle);
        setShowVideoModal(true);
    };

    const closeAudioPlayer = () => {
        setShowAudioPlayer(false);
        setAudioUrl(null);
    };

    const closeVideoModal = () => {
        setShowVideoModal(false);
        setVideoUrl(null);
    };

    if (loading || !myPublicKey || !recipientPublicKey) {
        return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;
    }

    const getDisplayText = (msg: ExtendedMessage) => {
        if (msg.type === 'TEXT') {
            return msg.decryptedText || (msg.senderUsername === user?.username ? 'Вы: ...' : '🔒 Расшифровка...');
        }
        return '';
    };

    const filteredMessages = searchTerm ? messages.filter(msg => msg.decryptedText?.toLowerCase().includes(searchTerm.toLowerCase())) : messages;

    return (
        <div className="flex-1 flex flex-col bg-gray-50 h-screen">
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
                <button onClick={() => setShowSearch(!showSearch)} className="p-2 hover:bg-gray-100 rounded-lg">
                    {showSearch ? <X className="w-5 h-5 text-gray-600" /> : <Search className="w-5 h-5 text-gray-600" />}
                </button>
            </div>

            {showSearch && (
                <div className="bg-white p-3 border-b">
                    <input
                        type="text"
                        placeholder="Поиск по сообщениям..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                        autoFocus
                    />
                    {searchTerm && (
                        <p className="text-xs text-gray-400 mt-1">
                            Найдено {filteredMessages.length} из {messages.length}
                        </p>
                    )}
                </div>
            )}

            <div className="flex-1 overflow-y-auto relative">
                <Virtuoso
                    ref={virtuosoRef}
                    data={filteredMessages}
                    itemContent={(index, msg) => (
                        <div key={msg.id}>
                            <Message
                                id={msg.id}
                                senderUsername={msg.senderUsername}
                                decryptedText={getDisplayText(msg)}
                                timestamp={msg.timestamp}
                                read={msg.read}
                                isOwn={msg.senderUsername === user?.username}
                                type={msg.type}
                                circle={msg.circle}
                                fileUrl={msg.fileUrl}
                                fileName={msg.fileName}
                                fileSize={msg.fileSize}
                                encryptedSessionKey={msg.encryptedSessionKey}
                                encryptedSessionKeyForSender={msg.encryptedSessionKeyForSender}
                                iv={msg.iv}
                                ivForSender={msg.ivForSender}
                                onReply={() => setReplyTo(msg)}
                                onPlayAudio={handlePlayAudio}
                                onPlayVideo={handlePlayVideo}
                            />
                        </div>
                    )}
                    startReached={loadMore}
                    onScroll={handleScroll}
                />
                {showScrollButton && (
                    <button
                        onClick={scrollToBottom}
                        className="absolute bottom-4 right-4 bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-700 transition z-10"
                        title="Прокрутить вниз"
                    >
                        <ArrowDown className="w-5 h-5" />
                    </button>
                )}
            </div>

            <div className="bg-white border-t p-4">
                <form onSubmit={handleSend} className="flex items-center space-x-2">
                    <VoiceRecorder
                        recipientUsername={username!}
                        recipientPublicKey={recipientPublicKey!}
                        myPublicKey={myPublicKey!}
                        onSent={loadFirstPage}
                    />
                    <VideoRecorder
                        recipientUsername={username!}
                        recipientPublicKey={recipientPublicKey!}
                        myPublicKey={myPublicKey!}
                        onSent={loadFirstPage}
                    />
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,audio/*,video/*" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingFile} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition disabled:opacity-50">
                        {uploadingFile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                    </button>
                    <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Введите сообщение..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg outline-none"
                        disabled={sending}
                    />
                    <button type="submit" disabled={sending || !newMessage.trim()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        <span>Отправить</span>
                    </button>
                </form>
            </div>

            <GlobalAudioPlayer visible={showAudioPlayer} url={audioUrl} onClose={closeAudioPlayer} />
            <VideoModal visible={showVideoModal} url={videoUrl} circle={videoCircle} onClose={closeVideoModal} />
        </div>
    );
};