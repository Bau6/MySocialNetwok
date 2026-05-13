// src/api/api.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { User, Message, SendMessageData, AuthResponse, RegisterRequest, ChatPreviewResponse, PageResponse } from '../types';

const API_URL = '/api';

class ApiClient {
    private api: AxiosInstance;
    private accessToken: string | null = null;

    constructor() {
        this.api = axios.create({
            baseURL: API_URL,
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000,
        });
        this.api.interceptors.request.use(this.handleRequest.bind(this));
        this.api.interceptors.response.use(
            (response) => response,
            this.handleError.bind(this)
        );
    }

    private handleRequest(config: InternalAxiosRequestConfig) {
        const token = this.getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    }

    private handleError(error: any) {
        const isLoginRequest = error.config?.url?.includes('/auth/login');
        const isRegisterRequest = error.config?.url?.includes('/auth/register');

        if (error.response?.status === 401 && !isLoginRequest && !isRegisterRequest) {
            this.clearTokens();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }

    setAccessToken(token: string) {
        this.accessToken = token;
        localStorage.setItem('access_token', token);
    }

    getAccessToken(): string | null {
        if (!this.accessToken) {
            this.accessToken = localStorage.getItem('access_token');
        }
        return this.accessToken;
    }

    setRefreshToken(token: string) {
        localStorage.setItem('refresh_token', token);
    }

    clearTokens() {
        this.accessToken = null;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }

    // ========== AUTH ==========
    async login(login: string, password: string): Promise<AuthResponse> {
        const res = await this.api.post<AuthResponse>('/auth/login', { login, password });
        this.setAccessToken(res.data.accessToken);
        this.setRefreshToken(res.data.refreshToken);
        return res.data;
    }

    async register(data: RegisterRequest): Promise<void> {
        await this.api.post('/auth/register', data);
    }

    async logout(): Promise<void> {
        await this.api.post('/auth/logout');
        this.clearTokens();
    }

    async getCurrentUser(): Promise<User> {
        const res = await this.api.get<User>('/users/profile');
        return res.data;
    }

    // ========== USERS ==========
    async getUsersWithPublicKeys(): Promise<User[]> {
        const res = await this.api.get<User[]>('/users/with-keys');
        return res.data;
    }

    async getUserPublicKey(username: string): Promise<string> {
        const res = await this.api.get<{ publicKey: string }>(`/users/${username}/public-key`);
        return res.data.publicKey;
    }

    async getUserProfile(username: string): Promise<User> {
        const res = await this.api.get<User>(`/users/${username}`);
        return res.data;
    }

    async getUserStatus(username: string): Promise<{ online: boolean; lastSeen: string }> {
        try {
            const res = await this.api.get<{ online: boolean; lastSeen: string }>(`/users/${username}/status`);
            return res.data;
        } catch {
            return { online: false, lastSeen: new Date().toISOString() };
        }
    }

    async searchUsers(query: string): Promise<User[]> {
        const res = await this.api.get<User[]>('/users/search', { params: { query } });
        return res.data;
    }

    // ========== MESSAGES ==========
    async sendEncryptedMessage(data: SendMessageData): Promise<Message> {
        const res = await this.api.post<Message>('/messages/send-encrypted', data);
        return res.data;
    }

    async getConversationPage(username: string, page: number = 0, size: number = 100): Promise<PageResponse<Message>> {
        const res = await this.api.get<PageResponse<Message>>(`/messages/conversation/page/${username}`, {
            params: { page, size }
        });
        return res.data;
    }

    async markMessagesAsRead(senderUsername: string): Promise<void> {
        await this.api.post(`/messages/mark-read/${senderUsername}`);
    }

    async getUnreadCount(): Promise<number> {
        const res = await this.api.get<{ count: number }>('/messages/unread-count');
        return res.data.count;
    }

    async getChats(): Promise<ChatPreviewResponse[]> {
        const res = await this.api.get<ChatPreviewResponse[]>('/messages/chats');
        return res.data;
    }

    // ========== FILES ==========
    async uploadFile(file: File, type: 'avatar' | 'message' | 'voice' = 'message'): Promise<{ fileUrl: string; fileName: string; fileSize: number; fileType: string }> {
        const formData = new FormData();
        formData.append('file', file);
        const res = await this.api.post(`/files/upload?type=${type}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
    }
}

export const api = new ApiClient();