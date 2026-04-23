import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/api';
import toast from 'react-hot-toast';

interface User {
    username: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (login: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (username: string, phone: string, password: string, email?: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = api.getToken();
        const savedUser = localStorage.getItem('user');
        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (e) {
                console.error('Failed to parse user data', e);
                localStorage.removeItem('user');
            }
        }
        setIsLoading(false);
    }, []);

    const register = async (username: string, phone: string, password: string, email?: string): Promise<{ success: boolean; error?: string }> => {
        // Фронтенд валидация
        if (!username || username.trim().length < 3) {
            const error = 'Имя пользователя должно содержать минимум 3 символа';
            toast.error(error);
            return { success: false, error };
        }
        if (!phone || !phone.match(/^\+?[0-9]{10,15}$/)) {
            const error = 'Введите корректный номер телефона (например, +79991234567)';
            toast.error(error);
            return { success: false, error };
        }
        if (!password || password.length < 6) {
            const error = 'Пароль должен содержать минимум 6 символов';
            toast.error(error);
            return { success: false, error };
        }

        try {
            const response = await api.register({ username, phone, password, email });
            toast.success(response.message || 'Регистрация успешна! Теперь войдите в систему.');
            return { success: true };
        } catch (error: any) {
            let errorMessage = 'Ошибка регистрации';
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            toast.error(errorMessage);
            return { success: false, error: errorMessage };
        }
    };

    const login = async (login: string, password: string): Promise<{ success: boolean; error?: string }> => {
        if (!login || !password) {
            const error = 'Заполните все поля';
            toast.error(error);
            return { success: false, error };
        }

        try {
            const response = await api.login(login, password);

            if (!response.token) {
                const error = 'Не получен токен авторизации';
                toast.error(error);
                return { success: false, error };
            }

            api.setToken(response.token);
            const userData = { username: login };
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            toast.success(response.message || 'Добро пожаловать!');
            return { success: true };
        } catch (error: any) {
            let errorMessage = 'Неверный логин или пароль';
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            toast.error(errorMessage);
            return { success: false, error: errorMessage };
        }
    };

    const logout = () => {
        api.clearToken();
        localStorage.removeItem('user');
        setUser(null);
        toast.success('Вы вышли из системы');
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, register, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};