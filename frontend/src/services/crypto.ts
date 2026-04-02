import CryptoJS from 'crypto-js';

export class CryptoService {
    private static instance: CryptoService;
    private constructor() {}

    static getInstance(): CryptoService {
        if (!CryptoService.instance) {
            CryptoService.instance = new CryptoService();
        }
        return CryptoService.instance;
    }

    encryptMessage(message: string, key: string): string {
        return CryptoJS.AES.encrypt(message, key).toString();
    }

    decryptMessage(encryptedMessage: string, key: string): string {
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedMessage, key);
            return bytes.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            console.error('Decryption failed:', error);
            return '🔒 Unable to decrypt';
        }
    }

    setChatKey(username: string, key: string) {
        localStorage.setItem(`chat_key_${username}`, key);
    }

    getChatKey(username: string): string | null {
        return localStorage.getItem(`chat_key_${username}`);
    }
}

export const cryptoService = CryptoService.getInstance();