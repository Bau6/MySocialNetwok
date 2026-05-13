import React, { useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Check, CheckCheck, Download, Image, File, Reply } from 'lucide-react';

interface MessageProps {
    id: number;
    senderUsername: string;
    decryptedText: string;
    timestamp: string;
    read: boolean;
    isOwn: boolean;
    type?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    onReply?: () => void;
}

export const Message: React.FC<MessageProps> = ({
                                                    id,
                                                    senderUsername,
                                                    decryptedText,
                                                    timestamp,
                                                    read,
                                                    isOwn,
                                                    type = 'TEXT',
                                                    fileUrl,
                                                    fileName,
                                                    fileSize,
                                                    onReply
                                                }) => {
    const [imageLoading, setImageLoading] = useState(true);

    const formatTime = (dateString: string) => {
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
        switch (type) {
            case 'IMAGE':
                return (
                    <div className="mt-1">
                        {fileUrl && (
                            <img
                                src={fileUrl}
                                alt="Изображение"
                                className={`rounded-lg max-w-full max-h-64 object-cover cursor-pointer ${imageLoading ? 'hidden' : ''}`}
                                onLoad={() => setImageLoading(false)}
                                onClick={() => window.open(fileUrl, '_blank')}
                            />
                        )}
                        {imageLoading && (
                            <div className="w-32 h-32 bg-gray-200 rounded-lg animate-pulse flex items-center justify-center">
                                <Image className="w-8 h-8 text-gray-400" />
                            </div>
                        )}
                    </div>
                );
            case 'FILE':
                return (
                    <a href={fileUrl} download={fileName} className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                        <File className="w-5 h-5 text-indigo-600" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{fileName || 'Файл'}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(fileSize)}</p>
                        </div>
                        <Download className="w-4 h-4 text-gray-500" />
                    </a>
                );
            default:
                return <p className="text-sm break-words whitespace-pre-wrap">{decryptedText}</p>;
        }
    };

    return (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} message-enter group`}>
            <div className={`max-w-[70%] rounded-lg p-3 ${isOwn ? 'bg-indigo-600 text-white' : 'bg-white shadow-sm border border-gray-200'}`}>
                {!isOwn && <p className="text-xs font-semibold mb-1 text-indigo-600">{senderUsername}</p>}
                {renderContent()}
                <div className="flex items-center justify-end gap-1 mt-1">
                    <span className={`text-xs ${isOwn ? 'text-indigo-200' : 'text-gray-400'}`}>{formatTime(timestamp)}</span>
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