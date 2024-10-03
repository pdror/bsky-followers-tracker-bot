import { en } from "./translations/en.js";
import { pt } from "./translations/pt.js";

const translations = { en, pt };
export const languages = {
    en: 'english',
    pt: 'português'
}

export const getTranslation = (key, lang, params = {}) => {
    const fallbackLang = 'en';
    const translation = (translations[lang] && translations[lang][key] || translations[fallbackLang][key]);
    return Object.entries(params).reduce(
        (str, [key, value]) => str.replace(`{${key}}`, value),
        translation
    );
}

export const getUserLanguade = (langs) => {
    if(langs && langs.length > 0) {
        for(const lang of langs) {
            if(translations[lang]) {
                return lang;
            }
        }
    }
    return 'en';
}

export const getUserLanguageByUser = (user, langs) => {
    if(user && user.configs && user.configs.language) {
        return user.configs.language;
    }

    if(langs && langs.length > 0) {
        for(const lang of langs) {
            if(translations[lang]) {
                return lang;
            }
        }
    }
    return 'en';
}