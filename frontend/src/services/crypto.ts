export interface StoredKeys {
    privateKey: string;
    publicKey: string;
}

export interface EncryptedPackage {
    encryptedContent: string;
    encryptedSessionKey: string;
    iv: string;
}

class CryptoService {
    private static instance: CryptoService;
    private currentPrivateKey: CryptoKey | null = null;
    private currentPublicKey: CryptoKey | null = null;

    private constructor() {}

    static getInstance(): CryptoService {
        if (!CryptoService.instance) {
            CryptoService.instance = new CryptoService();
        }
        return CryptoService.instance;
    }

    // ========== KEY MANAGEMENT ==========
    async generateKeyPair(): Promise<StoredKeys> {
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256"
            },
            true,
            ["encrypt", "decrypt"]
        );

        const publicKeyRaw = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
        const publicKey = this.arrayBufferToBase64(publicKeyRaw);
        const privateKeyRaw = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
        const privateKey = this.arrayBufferToBase64(privateKeyRaw);

        this.currentPrivateKey = keyPair.privateKey;
        this.currentPublicKey = keyPair.publicKey;
        return { privateKey, publicKey };
    }

    async loadPrivateKey(encryptedPrivateKey: string, password: string): Promise<boolean> {
        try {
            const decryptedKeyData = await this.decryptWithPassword(encryptedPrivateKey, password);
            const privateKey = await window.crypto.subtle.importKey(
                "pkcs8",
                this.base64ToArrayBuffer(decryptedKeyData),
                { name: "RSA-OAEP", hash: "SHA-256" },
                true,
                ["decrypt"]
            );
            this.currentPrivateKey = privateKey;
            return true;
        } catch (error) {
            console.error("Failed to load private key:", error);
            return false;
        }
    }

    async exportPrivateKey(): Promise<string | null> {
        if (!this.currentPrivateKey) return null;
        const exported = await window.crypto.subtle.exportKey("pkcs8", this.currentPrivateKey);
        return this.arrayBufferToBase64(exported);
    }

    async importPrivateKey(privateKeyBase64: string): Promise<boolean> {
        try {
            const privateKeyData = this.base64ToArrayBuffer(privateKeyBase64);
            const privateKey = await window.crypto.subtle.importKey(
                "pkcs8",
                privateKeyData,
                { name: "RSA-OAEP", hash: "SHA-256" },
                true,
                ["decrypt"]
            );
            this.currentPrivateKey = privateKey;
            return true;
        } catch (error) {
            console.error("Failed to import private key:", error);
            return false;
        }
    }

    async encryptPrivateKeyWithPassword(privateKeyBase64: string, password: string): Promise<string> {
        return this.encryptWithPassword(privateKeyBase64, password);
    }

    // ========== TEXT ENCRYPTION ==========
    async encryptForUser(plainText: string, recipientPublicKeyBase64: string): Promise<EncryptedPackage> {
        const recipientPublicKey = await window.crypto.subtle.importKey(
            "spki",
            this.base64ToArrayBuffer(recipientPublicKeyBase64),
            { name: "RSA-OAEP", hash: "SHA-256" },
            false,
            ["encrypt"]
        );

        const sessionKey = await window.crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );

        const sessionKeyRaw = await window.crypto.subtle.exportKey("raw", sessionKey);
        const encryptedSessionKey = await window.crypto.subtle.encrypt(
            { name: "RSA-OAEP" },
            recipientPublicKey,
            sessionKeyRaw
        );

        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encoder = new TextEncoder();
        const plainTextData = encoder.encode(plainText);
        const encryptedContent = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            sessionKey,
            plainTextData
        );

        return {
            encryptedContent: this.arrayBufferToBase64(encryptedContent),
            encryptedSessionKey: this.arrayBufferToBase64(encryptedSessionKey),
            iv: this.arrayBufferToBase64(iv.buffer)
        };
    }

    async decryptFromUser(encryptedPackage: EncryptedPackage): Promise<string> {
        if (!this.currentPrivateKey) throw new Error("Private key not loaded");

        const encryptedSessionKey = this.base64ToArrayBuffer(encryptedPackage.encryptedSessionKey);
        const sessionKeyRaw = await window.crypto.subtle.decrypt(
            { name: "RSA-OAEP" },
            this.currentPrivateKey,
            encryptedSessionKey
        );

        const sessionKey = await window.crypto.subtle.importKey(
            "raw",
            sessionKeyRaw,
            { name: "AES-GCM", length: 256 },
            false,
            ["decrypt"]
        );

        const encryptedContent = this.base64ToArrayBuffer(encryptedPackage.encryptedContent);
        const iv = this.base64ToArrayBuffer(encryptedPackage.iv);
        const decryptedData = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            sessionKey,
            encryptedContent
        );

        return new TextDecoder().decode(decryptedData);
    }

    // ========== FILE ENCRYPTION (added) ==========
    async generateFileKey(): Promise<CryptoKey> {
        return await window.crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
    }

    async encryptSessionKey(fileKey: CryptoKey, recipientPublicKeyBase64: string): Promise<{ encryptedSessionKey: string; iv: string }> {
        const recipientPublicKey = await window.crypto.subtle.importKey(
            "spki",
            this.base64ToArrayBuffer(recipientPublicKeyBase64),
            { name: "RSA-OAEP", hash: "SHA-256" },
            false,
            ["encrypt"]
        );
        const rawKey = await window.crypto.subtle.exportKey("raw", fileKey);
        const encrypted = await window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, recipientPublicKey, rawKey);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        return {
            encryptedSessionKey: this.arrayBufferToBase64(encrypted),
            iv: this.arrayBufferToBase64(iv.buffer),
        };
    }

    async encryptBlob(blob: Blob, key: CryptoKey): Promise<Blob> {
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const data = await blob.arrayBuffer();
        const encrypted = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(encrypted), iv.length);
        return new Blob([combined], { type: blob.type });
    }

    async decryptBlob(encryptedBlob: Blob, key: CryptoKey): Promise<Blob> {
        const buffer = await encryptedBlob.arrayBuffer();
        const iv = new Uint8Array(buffer.slice(0, 12));
        const data = buffer.slice(12);
        const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
        return new Blob([decrypted], { type: "audio/webm" });
    }

    async decryptSessionKey(encryptedSessionKeyBase64: string, ivBase64: string): Promise<CryptoKey> {
        const encrypted = this.base64ToArrayBuffer(encryptedSessionKeyBase64);
        const iv = this.base64ToArrayBuffer(ivBase64);
        const rawKey = await window.crypto.subtle.decrypt({ name: 'RSA-OAEP' }, this.currentPrivateKey!, encrypted);
        return await window.crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    }

    // ========== PASSWORD-BASED ENCRYPTION ==========
    private async encryptWithPassword(data: string, password: string): Promise<string> {
        const encoder = new TextEncoder();
        const passwordData = encoder.encode(password);
        const salt = window.crypto.getRandomValues(new Uint8Array(16));

        const baseKey = await window.crypto.subtle.importKey(
            "raw",
            passwordData,
            "PBKDF2",
            false,
            ["deriveKey"]
        );

        const key = await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt,
                iterations: 100000,
                hash: "SHA-256"
            },
            baseKey,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt"]
        );

        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const dataRaw = encoder.encode(data);
        const encrypted = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            key,
            dataRaw
        );

        const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
        result.set(salt, 0);
        result.set(iv, salt.length);
        result.set(new Uint8Array(encrypted), salt.length + iv.length);
        return this.arrayBufferToBase64(result.buffer);
    }

    private async decryptWithPassword(encryptedBase64: string, password: string): Promise<string> {
        const encrypted = this.base64ToArrayBuffer(encryptedBase64);
        const encryptedBytes = new Uint8Array(encrypted);
        const salt = encryptedBytes.slice(0, 16);
        const iv = encryptedBytes.slice(16, 28);
        const data = encryptedBytes.slice(28);

        const encoder = new TextEncoder();
        const passwordData = encoder.encode(password);

        const baseKey = await window.crypto.subtle.importKey(
            "raw",
            passwordData,
            "PBKDF2",
            false,
            ["deriveKey"]
        );

        const key = await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt,
                iterations: 100000,
                hash: "SHA-256"
            },
            baseKey,
            { name: "AES-GCM", length: 256 },
            false,
            ["decrypt"]
        );

        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            data.buffer
        );

        return new TextDecoder().decode(decrypted);
    }

    isReady(): boolean {
        return this.currentPrivateKey !== null;
    }

    // ========== UTILITIES ==========
    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    private base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
}

export const cryptoService = CryptoService.getInstance();

const STORAGE_KEYS = {
    ENCRYPTED_PRIVATE_KEY: "encrypted_private_key",
    PUBLIC_KEY: "public_key"
};

export class KeyStorage {
    static saveEncryptedPrivateKey(encryptedKey: string): void {
        localStorage.setItem(STORAGE_KEYS.ENCRYPTED_PRIVATE_KEY, encryptedKey);
    }
    static getEncryptedPrivateKey(): string | null {
        return localStorage.getItem(STORAGE_KEYS.ENCRYPTED_PRIVATE_KEY);
    }
    static savePublicKey(publicKey: string): void {
        localStorage.setItem(STORAGE_KEYS.PUBLIC_KEY, publicKey);
    }
    static getPublicKey(): string | null {
        return localStorage.getItem(STORAGE_KEYS.PUBLIC_KEY);
    }
    static clearKeys(): void {
        localStorage.removeItem(STORAGE_KEYS.ENCRYPTED_PRIVATE_KEY);
        localStorage.removeItem(STORAGE_KEYS.PUBLIC_KEY);
    }
}