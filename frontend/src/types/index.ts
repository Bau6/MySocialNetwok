export interface User {
    id: number;
    username: string;
    phone: string;
    email?: string;
}

export interface Message {
    id: number;
    senderUsername: string;
    receiverUsername: string;
    encryptedContent: string;
    timestamp: string;
    read: boolean;
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
}

export interface MessageRequest {
    receiverUsername: string;
    encryptedContent: string;
}