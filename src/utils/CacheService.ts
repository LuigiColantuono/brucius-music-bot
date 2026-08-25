export class CacheService {
    private static cache = new Map<string, { data: any; expiry: number }>();
    private static DEFAULT_TTL = 300000; // 5 minuti

    static set(
        key: string,
        data: any,
        ttl: number = CacheService.DEFAULT_TTL,
    ): void {
        CacheService.cache.set(key, {
            data,
            expiry: Date.now() + ttl,
        });
    }

    static get<T = any>(key: string): T | null {
        const cached = CacheService.cache.get(key);
        if (!cached) return null;

        if (cached.expiry < Date.now()) {
            CacheService.cache.delete(key);
            return null;
        }

        return cached.data as T;
    }

    static delete(key: string): boolean {
        return CacheService.cache.delete(key);
    }

    static clear(): void {
        CacheService.cache.clear();
    }

    static async getOrFetch<T = any>(
        key: string,
        fetcher: () => Promise<T>,
        ttl?: number,
    ): Promise<T> {
        const cached = CacheService.get<T>(key);
        if (cached) return cached;

        const fresh = await fetcher();
        CacheService.set(key, fresh, ttl);
        return fresh;
    }

    static size(): number {
        return CacheService.cache.size;
    }

    static cleanup(): void {
        const now = Date.now();
        for (const [key, value] of CacheService.cache.entries()) {
            if (value.expiry < now) {
                CacheService.cache.delete(key);
            }
        }
    }
}

// Cleanup automatico ogni minuto
setInterval(() => CacheService.cleanup(), 60000);
