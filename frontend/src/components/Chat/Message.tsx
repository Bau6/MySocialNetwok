import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Check, CheckCheck } from 'lucide-react';

interface MessageProps {
    id: number;
    senderUsername: string;
    receiverUsername: string;
    encryptedContent: string;
    timestamp: string;
    read: boolean;
    isOwn: boolean;
    decryptedText: string;
}

export const Message: React.FC<MessageProps> = ({
                                                    senderUsername,
                                                    decryptedText,
                                                    timestamp,
                                                    read,
                                                    isOwn,
                                                }) => {
    const formatTime = (date: string) => {
        return formatDistanceToNow(new Date(date), {
            addSuffix: true,
            locale: ru,
        });
    };

    return (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} message-enter`}>
            <div className={`max-w-[70%] rounded-lg p-3 ${
                isOwn
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-900 shadow-sm border border-gray-200'
            }`}>
                {!isOwn && (
                    <p className="text-xs font-semibold mb-1 text-indigo-600">
                        {senderUsername}
                    </p>
                )}
                <p className="text-sm break-words whitespace-pre-wrap">
                    {decryptedText}
                </p>
                <p className={`text-xs mt-1 ${isOwn ? 'text-indigo-200' : 'text-gray-400'}`}>
                    {formatTime(timestamp)}
                </p>
                {isOwn && (
                    <div className="flex justify-end mt-1">
                        {read ? (
                            <CheckCheck className="w-3 h-3 text-indigo-200" />
                        ) : (
                            <Check className="w-3 h-3 text-indigo-200" />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};