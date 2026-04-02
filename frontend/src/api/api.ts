import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import { User, Message, LoginRequest, RegisterRequest, MessageRequest } from '../types';

const API_URL = '/api'; // прокси на 8080

class ApiClient {
    private api: AxiosInstance;
    private token: string | null = null;

    constructor() {
        this.api = axios.create({
            baseURL: API_URL,
            headers: { 'Content-Type': 'application/json' },
        });
        this.api.interceptors.request.use(this.handleRequest.bind(this));
        this.api.interceptors.response.use(
            (response) => response,
            this.handleError.bind(this)
        );
    }

    private handleRequest(config: InternalAxiosRequestConfig) {
        const token = this.getToken();
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    }

    private handleError(error: any) {
        if (error.response?.status === 401 || error.response?.status === 403) {
            this.clearToken();
            window.location.href = '/login';
            toast.error('Session expired. Please login again.');
        } else if (error.response?.data?.message) {
            toast.error(error.response.data.message);
        } else {
            toast.error('Network error');
        }
        return Promise.reject(error);
    }

    setToken(token: string) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    getToken(): string | null {
        if (!this.token) this.token = localStorage.getItem('token');
        return this.token;
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }

    async login(login: string, password: string) {
        const res = await this.api.post('/auth/login', { login, password });
        return res.data;
    }

    async register(data: RegisterRequest) {
        const res = await this.api.post('/auth/register', data);
        return res.data;
    }

    async sendMessage(data: { encryptedContent: string; receiverUsername: string | undefined }) {
        const res = await this.api.post('/messages/send', data);
        return res.data;
    }

    async getConversation(username: string): Promise<Message[]> {
        const res = await this.api.get(`/messages/conversation/${username}`);
        return res.data;
    }

    async createChat(otherUsername: string): Promise<{ chatKey: string }> {
        const res = await this.api.post(`/messages/create-chat/${otherUsername}`);
        return res.data;
    }

    async getChatKey(otherUsername: string): Promise<string> {
        const res = await this.api.get(`/messages/chat-key/${otherUsername}`);
        return res.data.chatKey;
    }

    async getUsers(search?: string): Promise<User[]> {
        const params = search ? { search } : {};
        const res = await this.api.get('/messages/users', { params });
        return res.data;
    }
}

export const api = new ApiClient();