// src/services/fileCache.ts
class FileCacheService {
    private cache = new Map<number, string>();

    get(id: number): string | undefined {
        return this.cache.get(id);
    }

    set(id: number, url: string): void {
        if (!this.cache.has(id)) {
            this.cache.set(id, url);
        }
    }

    has(id: number): boolean {
        return this.cache.has(id);
    }

    clear(): void {
        this.cache.forEach((url) => URL.revokeObjectURL(url));
        this.cache.clear();
    }
}

export const fileCache = new FileCacheService();