// src/types/index.ts

export interface User {
    id: number;
    username: string;
    phone: string;
    email?: string;
    fullName?: string;
    avatarUrl?: string;
    publicKey: string;
    encryptedPrivateKey: string;
    online: boolean;
    lastSeen: string;
}

export interface Message {
    id: number;
    senderUsername: string;
    receiverUsername: string;
    encryptedContent: string;
    encryptedSessionKey: string;
    iv: string;
    encryptedContentForSender: string;
    encryptedSessionKeyForSender: string;
    ivForSender: string;
    timestamp: string;
    read: boolean;
    type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'VOICE';
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    replyToId?: number;
}

export interface SendMessageData {
    receiverUsername: string;
    encryptedContent: string;
    encryptedSessionKey: string;
    iv: string;
    encryptedContentForSender?: string;
    encryptedSessionKeyForSender?: string;
    ivForSender?: string;
    type?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    replyToId?: number;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    user: User;
}

export interface LoginRequest {
    login: string;
    password: string;
}

export interface RegisterRequest {
    username: string;
    phone: string;
    password: string;
    email?: string;
    fullName?: string;
    publicKey: string;
    encryptedPrivateKey: string;
}

export interface ChatPreviewResponse {
    username: string;
    fullName: string;
    avatarUrl?: string;
    online: boolean;
    lastSeen: string;
    lastMessageEncrypted: string;
    lastMessageIv: string;
    lastMessageEncryptedSessionKey: string;
    lastMessageTime: string;
    unreadCount: number;
}

export interface PageResponse<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    last: boolean;
    first: boolean;
    size: number;
    number: number;
}