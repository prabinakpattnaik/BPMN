import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { CustomSelect } from './CustomSelect/CustomSelect';

export const LanguageSwitcher = () => {
    const { i18n } = useTranslation();

    const languages = [
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
        { code: 'fr', name: 'Français', flag: '🇫🇷' },
        { code: 'es', name: 'Español', flag: '🇪🇸' },
    ];

    return (
        <div className="flex items-center gap-2">
            <Globe size={18} className="text-gray-400 shrink-0" />
            <CustomSelect
                value={i18n.language}
                onChange={(val) => i18n.changeLanguage(val)}
                options={languages.map(lang => ({
                    value: lang.code,
                    label: `${lang.flag} ${lang.name}`
                }))}
                className="w-32"
            />
        </div>
    );
};
