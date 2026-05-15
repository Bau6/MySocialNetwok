import { useEffect, useRef, useState } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import { useAuth } from '../contexts/AuthContext';
import { Message as ChatMessage, SendMessageData } from '../types';

export const useWebSocketChat = (onNewMessage: (msg: ChatMessage) => void) => {
    const { user } = useAuth();
    const stompClient = useRef<Client | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (!user) return;

        // Получаем текущий хост и порт (бэкенд на 8080)
        const wsUrl = `${window.location.protocol === 'https:' ? 'wss://' : 'ws://'}${window.location.hostname}:8080/ws`;
        const client = new Client({
            brokerURL: wsUrl,
            onConnect: () => {
                setConnected(true);
                client.subscribe(`/user/${user.username}/queue/messages`, (message: IMessage) => {
                    const newMsg: ChatMessage = JSON.parse(message.body);
                    onNewMessage(newMsg);
                });
            },
            onDisconnect: () => setConnected(false),
            onStompError: (frame) => console.error('STOMP error:', frame),
        });
        client.activate();
        stompClient.current = client;

        return () => {
            if (stompClient.current) {
                stompClient.current.deactivate();
            }
        };
    }, [user, onNewMessage]);

    const sendMessage = (receiverUsername: string, data: SendMessageData) => {
        if (!stompClient.current || !connected) {
            console.warn('WebSocket not connected');
            return;
        }
        stompClient.current.publish({
            destination: '/app/chat.send',
            body: JSON.stringify({
                senderUsername: user?.username,
                receiverUsername,
                encryptedContent: data.encryptedContent,
                encryptedSessionKey: data.encryptedSessionKey,
                iv: data.iv,
                encryptedContentForSender: data.encryptedContentForSender,
                encryptedSessionKeyForSender: data.encryptedSessionKeyForSender,
                ivForSender: data.ivForSender,
                type: data.type,
                circle: data.circle,
                fileUrl: data.fileUrl,
                fileName: data.fileName,
                fileSize: data.fileSize,
                replyToId: data.replyToId,
            }),
        });
    };

    return { sendMessage, connected };
};