import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/api';
import { cryptoService, KeyStorage } from '../services/crypto';
import { User } from '../types';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (login: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (username: string, phone: string, password: string, email?: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            const storedPrivateKey = sessionStorage.getItem('private_key');
            if (storedPrivateKey) {
                const success = await cryptoService.importPrivateKey(storedPrivateKey);
                if (success) {
                    try {
                        const userData = await api.getCurrentUser();
                        setUser(userData);
                        setLoading(false);
                        return;
                    } catch (err) {
                        console.error('Failed to load user', err);
                        sessionStorage.removeItem('private_key');
                    }
                }
            }
            // No valid key, clear tokens
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setLoading(false);
        };
        init();
    }, []);

    const login = async (login: string, password: string) => {
        try {
            const response = await api.login(login, password);
            const { encryptedPrivateKey } = response.user;
            if (!encryptedPrivateKey) {
                throw new Error('No encrypted private key for this user');
            }
            const success = await cryptoService.loadPrivateKey(encryptedPrivateKey, password);
            if (!success) {
                return { success: false, error: 'Не удалось расшифровать ключ. Неверный пароль.' };
            }
            const exportedKey = await cryptoService.exportPrivateKey();
            if (exportedKey) {
                sessionStorage.setItem('private_key', exportedKey);
            }
            setUser(response.user);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.response?.data?.message || 'Ошибка входа' };
        }
    };

    const register = async (username: string, phone: string, password: string, email?: string, fullName?: string) => {
        try {
            const { privateKey, publicKey } = await cryptoService.generateKeyPair();
            const encryptedPrivateKey = await cryptoService.encryptPrivateKeyWithPassword(privateKey, password);
            await api.register({ username, phone, password, email, fullName, publicKey, encryptedPrivateKey });
            return { success: true };
        } catch (error: any) {
            console.error('Registration error:', error);
            return { success: false, error: error.response?.data?.message || 'Ошибка регистрации' };
        }
    };

    const logout = async () => {
        try {
            await api.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            api.clearTokens();
            sessionStorage.removeItem('private_key');
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};