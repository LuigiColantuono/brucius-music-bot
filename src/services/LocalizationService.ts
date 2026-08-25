import en from "../locales/en.json";
import it from "../locales/it.json";

export class LocalizationService {
    private static instance: LocalizationService;
    private locales: Record<string, any> = { it, en };
    private defaultLang = "it";

    private constructor() {}

    public static getInstance(): LocalizationService {
        if (!LocalizationService.instance) {
            LocalizationService.instance = new LocalizationService();
        }
        return LocalizationService.instance;
    }

    /**
     * Get a localized string
     * @param key Dot-notation key (e.g., 'player.title')
     * @param lang Language code ('it' or 'en')
     * @param args Optional arguments for interpolation (e.g., { name: 'User' })
     */
    public get(
        key: string,
        lang: string = "it",
        args?: Record<string, any>,
    ): string {
        // Fallback to default language if requested lang doesn't exist
        const locale = this.locales[lang] || this.locales[this.defaultLang];

        const value = this.resolveKey(locale, key);

        if (!value) {
            console.warn(`⚠️ Missing translation key: ${key} for lang: ${lang}`);
            // Fallback to default language
            if (lang !== this.defaultLang) {
                return this.get(key, this.defaultLang, args);
            }
            return key;
        }

        return this.interpolate(value, args);
    }

    private resolveKey(obj: any, key: string): string | undefined {
        return key.split(".").reduce((o, i) => o?.[i], obj);
    }

    private interpolate(text: string, args?: Record<string, any>): string {
        if (!args) return text;
        return text.replace(/\{\{(\w+)\}\}/g, (_, k) => {
            return args[k] !== undefined ? args[k] : `{{${k}}}`;
        });
    }
}
