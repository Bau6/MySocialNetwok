import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, User, ArrowRight, Mail, Phone, UserPlus, AlertCircle } from 'lucide-react';

export const Register: React.FC = () => {
    const [username, setUsername] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        if (username.length < 3) { setError('Имя пользователя должно содержать минимум 3 символа'); setLoading(false); return; }
        if (password.length < 6) { setError('Пароль должен содержать минимум 6 символов'); setLoading(false); return; }
        if (password !== confirmPassword) { setError('Пароли не совпадают'); setLoading(false); return; }
        if (!phone.match(/^\+?[0-9]{10,15}$/)) { setError('Введите корректный номер телефона (например, +79991234567)'); setLoading(false); return; }
        if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) { setError('Введите корректный email адрес'); setLoading(false); return; }

        const result = await register(username, phone, password, email || undefined, fullName || undefined);
        if (result.success) navigate('/login');
        else if (result.error) setError(result.error);
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
                        <UserPlus className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Регистрация</h1>
                    <p className="text-gray-600 mt-2">Создайте новый аккаунт</p>
                </div>
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div><p className="text-sm font-medium text-red-600">Ошибка регистрации</p><p className="text-sm text-red-500">{error}</p></div>
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Имя пользователя *</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input type="text" value={username} onChange={(e) => { setUsername(e.target.value); setError(null); }} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Введите имя пользователя (мин. 3 символа)" disabled={loading} required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Полное имя (опционально)</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ваше полное имя" disabled={loading} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Номер телефона *</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setError(null); }} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="+7 (123) 456-78-90" disabled={loading} required />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">В формате +7XXXXXXXXXX</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email (опционально)</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="user@example.com" disabled={loading} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Пароль *</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Минимум 6 символов" disabled={loading} required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Подтверждение пароля *</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Повторите пароль" disabled={loading} required />
                        </div>
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center space-x-2 transition-colors mt-6">
                        <span>{loading ? 'Регистрация...' : 'Зарегистрироваться'}</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </form>
                <div className="mt-6 text-center"><p className="text-sm text-gray-600">Уже есть аккаунт? <Link to="/login" className="text-indigo-600 font-medium hover:text-indigo-700">Войти</Link></p></div>
            </div>
        </div>
    );
};