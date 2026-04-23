import React from 'react';
import { format, isToday, isYesterday, differenceInMinutes } from 'date-fns';
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
    const formatMessageTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMinutes = differenceInMinutes(now, date);

        // Если сообщение отправлено меньше минуты назад
        if (diffMinutes < 1) return 'Только что';

        // Если меньше часа назад
        if (diffMinutes < 60) {
            const minutes = diffMinutes;
            const words = ['минуту', 'минуты', 'минут'];
            const cases = [2, 0, 1, 1, 1, 2];
            const text = words[(minutes % 100 > 4 && minutes % 100 < 20) ? 2 : cases[(minutes % 10 < 5) ? minutes % 10 : 5]];
            return `${minutes} ${text} назад`;
        }

        // Если сегодня
        if (isToday(date)) {
            return format(date, 'HH:mm', { locale: ru });
        }

        // Если вчера
        if (isYesterday(date)) {
            return `Вчера в ${format(date, 'HH:mm', { locale: ru })}`;
        }

        // Если в этом году
        if (date.getFullYear() === now.getFullYear()) {
            return format(date, 'd MMMM, HH:mm', { locale: ru });
        }

        // Если в прошлом году
        return format(date, 'd MMMM yyyy, HH:mm', { locale: ru });
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
                    {formatMessageTime(timestamp)}
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