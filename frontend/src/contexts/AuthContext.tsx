import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/api';
import toast from 'react-hot-toast';

interface User {
    username: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (login: string, password: string) => Promise<void>;
    register: (username: string, phone: string, password: string, email?: string) => Promise<void>;
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
            setUser(JSON.parse(savedUser));
        }
        setIsLoading(false);
    }, []);

    const login = async (login: string, password: string) => {
        const { token } = await api.login(login, password);
        api.setToken(token);
        const userData = { username: login }; // username будет извлечён из токена? упростим: можно декодировать, но для простоты сохраним login
        localStorage.setItem('user', JSON.stringify({ username: login }));
        setUser({ username: login });
        toast.success('Welcome back!');
    };

    const register = async (username: string, phone: string, password: string, email?: string) => {
        await api.register({ username, phone, password, email });
        toast.success('Registration successful! Please login.');
    };

    const logout = () => {
        api.clearToken();
        localStorage.removeItem('user');
        setUser(null);
        toast.success('Logged out');
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, register, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};