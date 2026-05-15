import React, { useState, useRef, useEffect } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Check, CheckCheck, Download, Image, File, Mic, Video, Reply, Loader2, Maximize2 } from 'lucide-react';
import { cryptoService } from '../../services/crypto';
import { useAuth } from '../../contexts/AuthContext';
import { fileCache } from '../../services/fileCache';

interface MessageProps {
    id: number;
    senderUsername: string;
    decryptedText: string;
    timestamp: string;
    read: boolean;
    isOwn: boolean;
    type?: string;
    circle?: boolean;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    encryptedSessionKey?: string;
    encryptedSessionKeyForSender?: string;
    iv?: string;
    ivForSender?: string;
    onReply?: () => void;
    onPlayAudio?: (url: string) => void;
    onPlayVideo?: (url: string, circle: boolean) => void;
}

export const Message: React.FC<MessageProps> = ({
                                                    id,
                                                    senderUsername,
                                                    decryptedText,
                                                    timestamp,
                                                    read,
                                                    isOwn,
                                                    type = 'TEXT',
                                                    circle = false,
                                                    fileUrl,
                                                    fileName,
                                                    fileSize,
                                                    encryptedSessionKey,
                                                    encryptedSessionKeyForSender,
                                                    iv,
                                                    ivForSender,
                                                    onReply,
                                                    onPlayAudio,
                                                    onPlayVideo
                                                }) => {
    const { user } = useAuth();
    const [imageLoading, setImageLoading] = useState(true);
    const [decryptedUrl, setDecryptedUrl] = useState<string | null>(() => {
        // Инициализация из кеша
        return fileCache.get(id) || null;
    });
    const [decrypting, setDecrypting] = useState(false);
    const [decryptError, setDecryptError] = useState(false);
    const hasStartedRef = useRef(false);

    // Расшифровка – только если нет в кеше и ещё не запускали
    useEffect(() => {
        if (type === 'TEXT') return;
        if (decryptedUrl) return;
        if (hasStartedRef.current) return;
        hasStartedRef.current = true;
        decryptFile();
    }, [type, decryptedUrl]);

    const decryptFile = async () => {
        setDecrypting(true);
        try {
            const sessionKeyToUse = isOwn ? encryptedSessionKeyForSender : encryptedSessionKey;
            const ivToUse = isOwn ? ivForSender : iv;
            if (!sessionKeyToUse || !ivToUse) throw new Error('Missing encryption keys');
            const fileKey = await cryptoService.decryptSessionKey(sessionKeyToUse, ivToUse);
            const response = await fetch(fileUrl!);
            const encryptedBlob = await response.blob();
            const decryptedBlob = await cryptoService.decryptBlob(encryptedBlob, fileKey);
            const url = URL.createObjectURL(decryptedBlob);
            fileCache.set(id, url);
            setDecryptedUrl(url);
            setDecryptError(false);
        } catch (err) {
            console.error('Decryption error:', err);
            setDecryptError(true);
        } finally {
            setDecrypting(false);
        }
    };

    const handlePlayAudio = () => {
        if (decryptedUrl && onPlayAudio) onPlayAudio(decryptedUrl);
    };

    const handleExpandVideo = () => {
        if (decryptedUrl && onPlayVideo) onPlayVideo(decryptedUrl, circle);
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        if (isToday(date)) return format(date, 'HH:mm', { locale: ru });
        if (isYesterday(date)) return `Вчера в ${format(date, 'HH:mm', { locale: ru })}`;
        return format(date, 'd MMM, HH:mm', { locale: ru });
    };

    const formatFileSize = (bytes?: number): string => {
        if (!bytes) return '';
        const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    };

    const renderContent = () => {
        if (type === 'TEXT') {
            return <p className="text-sm break-words whitespace-pre-wrap">{decryptedText}</p>;
        }

        if (decrypting) {
            return (
                <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Загрузка...</span>
                </div>
            );
        }

        if (decryptError) {
            return (
                <div className="text-red-500 text-sm flex items-center gap-2">
                    <span>Ошибка загрузки</span>
                    <button onClick={decryptFile} className="text-xs underline">Повторить</button>
                </div>
            );
        }

        if (!decryptedUrl) {
            return (
                <div className="flex items-center gap-2 text-gray-400">
                    <div className="w-20 h-8 bg-gray-200 rounded-lg animate-pulse" />
                </div>
            );
        }

        switch (type) {
            case 'IMAGE':
                return (
                    <img
                        src={decryptedUrl}
                        alt="Изображение"
                        className={`rounded-lg max-w-full max-h-64 object-cover cursor-pointer ${imageLoading ? 'hidden' : ''}`}
                        onLoad={() => setImageLoading(false)}
                        onClick={() => window.open(decryptedUrl, '_blank')}
                    />
                );
            case 'VOICE':
                return (
                    <button
                        onClick={handlePlayAudio}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition text-gray-700 text-sm"
                    >
                        <Mic className="w-4 h-4" />
                        <span>Голосовое сообщение</span>
                    </button>
                );
            case 'VIDEO':
                return (
                    <div className="relative group">
                        <video
                            src={decryptedUrl}
                            className={`${circle ? 'w-32 h-32 rounded-full object-cover' : 'max-w-full max-h-64 rounded-lg'} cursor-pointer`}
                            controls
                            playsInline
                        />
                        <button
                            onClick={handleExpandVideo}
                            className="absolute top-2 right-2 bg-black bg-opacity-50 p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                            title="Развернуть"
                        >
                            <Maximize2 className="w-4 h-4 text-white" />
                        </button>
                    </div>
                );
            case 'FILE':
                return (
                    <a href={decryptedUrl} download={fileName} className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                        <File className="w-5 h-5 text-indigo-600" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{fileName || 'Файл'}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(fileSize)}</p>
                        </div>
                        <Download className="w-4 h-4 text-gray-500" />
                    </a>
                );
            default:
                return null;
        }
    };

    const getIcon = () => {
        if (type === 'VOICE') return <Mic className="w-3 h-3" />;
        if (type === 'VIDEO') return <Video className="w-3 h-3" />;
        if (type === 'IMAGE') return <Image className="w-3 h-3" />;
        if (type === 'FILE') return <File className="w-3 h-3" />;
        return null;
    };

    return (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} message-enter group`}>
            <div className={`max-w-[70%] rounded-lg p-3 ${isOwn ? 'bg-indigo-600 text-white' : 'bg-white shadow-sm border border-gray-200'}`}>
                {!isOwn && <p className="text-xs font-semibold mb-1 text-indigo-600">{senderUsername}</p>}
                <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                    {getIcon()}
                    {type !== 'TEXT' && type !== 'IMAGE' && type !== 'VIDEO' && type !== 'VOICE' && (
                        <span className="text-xs">{type}</span>
                    )}
                </div>
                {renderContent()}
                <div className="flex items-center justify-end gap-1 mt-1">
                    <span className={`text-xs ${isOwn ? 'text-indigo-200' : 'text-gray-400'}`}>{formatDateTime(timestamp)}</span>
                    {isOwn && (read ? <CheckCheck className="w-3 h-3 text-indigo-200" /> : <Check className="w-3 h-3 text-indigo-200" />)}
                </div>
            </div>
            {onReply && (
                <button onClick={onReply} className="opacity-0 group-hover:opacity-100 ml-2 p-1 hover:bg-gray-200 rounded-full self-center">
                    <Reply className="w-4 h-4 text-gray-500" />
                </button>
            )}
        </div>
    );
};