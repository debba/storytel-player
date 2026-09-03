import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import { getLanguageState, LanguageState, setLanguageMode } from '../i18n';
import { APP_LANGUAGES, AUTO_LANGUAGE, findLanguage } from '../config/languages';
import { localizedLanguageName } from '../utils/helpers';

interface LanguageModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CheckIcon = () => (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
);

/**
 * Language picker.
 *
 * Every option is labelled with the language's own name (Svenska, Suomi,
 * Deutsch...) so it stays usable when the app has come up in a language the
 * user cannot read - which is the whole point of a language switcher.
 */
export function LanguageModal({ isOpen, onClose }: LanguageModalProps) {
    const { t, i18n } = useTranslation();
    const [state, setState] = useState<LanguageState | null>(null);
    const [pending, setPending] = useState<string | null>(null);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        getLanguageState().then((next) => {
            if (!cancelled) setState(next);
        });
        return () => {
            cancelled = true;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Roving focus so the list is usable from the keyboard alone.
    const handleListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        const items = Array.from(
            listRef.current?.querySelectorAll<HTMLButtonElement>('button[data-language-option]') ?? [],
        );
        if (!items.length) return;
        const current = items.indexOf(document.activeElement as HTMLButtonElement);
        const step = e.key === 'ArrowDown' ? 1 : -1;
        const next = (current + step + items.length) % items.length;
        items[next].focus();
    };

    const select = useCallback(
        async (mode: string) => {
            setPending(mode);
            try {
                setState(await setLanguageMode(mode));
                onClose();
            } catch (error) {
                console.error('Failed to change language:', error);
            } finally {
                setPending(null);
            }
        },
        [onClose],
    );

    if (!isOpen) return null;

    const mode = state?.mode ?? AUTO_LANGUAGE;
    const systemResolved = state?.systemResolved;
    const systemLanguages = state?.systemLanguages ?? [];
    const autoName = findLanguage(systemResolved)?.nativeName ?? systemResolved ?? '';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('language.title')} maxWidth="max-w-lg" zIndex={60}>
            <div className="flex flex-col gap-3" ref={listRef} onKeyDown={handleListKeyDown}>
                <p className="text-sm text-gray-400 -mt-1">{t('language.subtitle')}</p>

                {/* Follow the operating system */}
                <button
                    type="button"
                    data-language-option
                    autoFocus
                    onClick={() => select(AUTO_LANGUAGE)}
                    disabled={pending !== null}
                    aria-pressed={mode === AUTO_LANGUAGE}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#FF5100] ${
                        mode === AUTO_LANGUAGE
                            ? 'bg-[#FF5100]/10 border-[#FF5100] text-white'
                            : 'bg-[#141414] border-white/10 text-gray-200 hover:bg-[#1F1F1F] hover:border-white/20'
                    }`}
                >
                    <svg className="w-5 h-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18 15 15 0 010-18z"
                        />
                    </svg>
                    <span className="flex-1 min-w-0">
                        <span className="block font-semibold">{t('language.auto')}</span>
                        <span className="block text-sm text-gray-400 truncate">
                            {autoName
                                ? t('language.autoResolved', { language: autoName })
                                : t('language.autoDescription')}
                        </span>
                    </span>
                    {mode === AUTO_LANGUAGE && <span className="text-[#FF5100]"><CheckIcon /></span>}
                </button>

                {systemLanguages.length > 0 && (
                    <p className="text-xs text-gray-500 px-1 -mt-1">
                        {t('language.systemPreference', { languages: systemLanguages.join(', ') })}
                    </p>
                )}

                <div className="border-t border-white/5 my-1" />

                {APP_LANGUAGES.map((language) => {
                    const isActive = mode === language.code;
                    const isAutoTarget = mode === AUTO_LANGUAGE && systemResolved === language.code;
                    // The same language written in the language currently on
                    // screen, e.g. "Svenska / Svedese" for an Italian UI.
                    const translatedName = localizedLanguageName(language.code, i18n.language);
                    const showTranslated =
                        translatedName && translatedName.toLowerCase() !== language.nativeName.toLowerCase();

                    return (
                        <button
                            key={language.code}
                            type="button"
                            data-language-option
                            lang={language.code}
                            onClick={() => select(language.code)}
                            disabled={pending !== null}
                            aria-pressed={isActive}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#FF5100] ${
                                isActive
                                    ? 'bg-[#FF5100]/10 border-[#FF5100] text-white'
                                    : 'bg-[#141414] border-white/10 text-gray-200 hover:bg-[#1F1F1F] hover:border-white/20'
                            }`}
                        >
                            <span className="w-9 shrink-0 text-center text-xs font-bold tracking-wider text-gray-400 bg-white/5 border border-white/10 rounded-lg py-1">
                                {language.code.toUpperCase()}
                            </span>
                            <span className="flex-1 min-w-0">
                                <span className="block font-semibold truncate">{language.nativeName}</span>
                                {showTranslated && (
                                    <span className="block text-sm text-gray-400 truncate">{translatedName}</span>
                                )}
                            </span>
                            {isAutoTarget && !isActive && (
                                <span className="text-[10px] uppercase tracking-wider text-gray-500 shrink-0">
                                    {t('language.auto')}
                                </span>
                            )}
                            {isActive && <span className="text-[#FF5100]"><CheckIcon /></span>}
                        </button>
                    );
                })}

                <p className="text-xs text-gray-500 px-1 pt-2">{t('language.catalogNote')}</p>
            </div>
        </Modal>
    );
}

export default LanguageModal;
