import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { User, Mail, Phone, ArrowLeft, Key } from 'lucide-react';

export const Profile: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    if (!user) return null;

    const publicKeyPreview = user.publicKey ? user.publicKey.substring(0, 50) + '...' : '';

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center space-x-4">
                    <button onClick={() => navigate('/chat')} className="p-2 hover:bg-gray-100 rounded-lg">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900">Профиль</h1>
                </div>
            </div>
            <div className="max-w-2xl mx-auto px-4 py-6">
                <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
                    <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                        <User className="w-5 h-5 text-gray-400" />
                        <div><p className="text-sm text-gray-500">Имя пользователя</p><p className="font-medium">{user.username}</p></div>
                    </div>
                    <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <div><p className="text-sm text-gray-500">Телефон</p><p className="font-medium">{user.phone}</p></div>
                    </div>
                    {user.email && (
                        <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                            <Mail className="w-5 h-5 text-gray-400" />
                            <div><p className="text-sm text-gray-500">Email</p><p className="font-medium">{user.email}</p></div>
                        </div>
                    )}
                    <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                        <Key className="w-5 h-5 text-gray-400" />
                        <div><p className="text-sm text-gray-500">Публичный ключ (E2EE)</p><p className="font-mono text-xs break-all">{publicKeyPreview}</p></div>
                    </div>
                </div>
            </div>
        </div>
    );
};