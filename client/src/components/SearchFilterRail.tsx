import React from 'react';
import { useTranslation } from 'react-i18next';

export interface LanguageStat {
  iso: string;
  name: string;
  count: number;
}

export type DurationFilter = 'all' | 'under5' | '5to15' | 'over15';

interface SearchFilterRailProps {
  languageStats: LanguageStat[];
  selectedLanguages: string[]; // empty array means all
  onToggleLanguage: (iso: string) => void;
  onSelectAllLanguages: () => void;
  selectedDuration: DurationFilter;
  onChangeDuration: (duration: DurationFilter) => void;
  totalHits: number;
}

export function SearchFilterRail({
  languageStats,
  selectedLanguages,
  onToggleLanguage,
  onSelectAllLanguages,
  selectedDuration,
  onChangeDuration,
  totalHits,
}: SearchFilterRailProps) {
  const { t } = useTranslation();

  const isAllLanguagesSelected = selectedLanguages.length === 0;

  return (
    <aside className="w-[248px] p-5 gap-6 border-r border-white/[0.05] bg-[#0A0A0A] flex flex-col flex-shrink-0 select-none overflow-y-auto custom-scrollbar">
      {/* 1. Language Section */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#6b7280]">
            {t('search.filterByLanguage', 'Language')}
          </span>
          {!isAllLanguagesSelected && (
            <button
              type="button"
              onClick={onSelectAllLanguages}
              className="text-[11px] font-semibold text-[#FF5100] hover:text-[#ff6b2b] transition-colors"
            >
              {t('search.showAllLanguages', { total: totalHits })}
            </button>
          )}
        </div>

        <div className="space-y-1">
          {/* 'All' Row */}
          <button
            type="button"
            onClick={onSelectAllLanguages}
            className={`w-full h-9 px-2.5 rounded-[10px] flex items-center justify-between text-xs font-medium transition-all ${
              isAllLanguagesSelected
                ? 'bg-[#FF5100]/10 border border-[#FF5100]/40 text-white'
                : 'text-gray-300 hover:bg-white/5 hover:text-white border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center flex-shrink-0 transition-colors ${
                  isAllLanguagesSelected
                    ? 'bg-[#FF5100] text-white'
                    : 'border-[1.5px] border-white/20'
                }`}
              >
                {isAllLanguagesSelected && (
                  <svg className="w-3.5 h-3.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="truncate">{t('search.allLanguages', 'All')}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#222225] text-gray-400">
              {totalHits}
            </span>
          </button>

          {/* Individual Language Rows */}
          {languageStats.map((stat) => {
            const isSelected = selectedLanguages.includes(stat.iso.toLowerCase());
            return (
              <button
                key={stat.iso}
                type="button"
                onClick={() => onToggleLanguage(stat.iso)}
                className={`w-full h-9 px-2.5 rounded-[10px] flex items-center justify-between text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-[#FF5100]/10 border border-[#FF5100]/40 text-white'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-[#FF5100] text-white'
                        : 'border-[1.5px] border-white/20'
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-3.5 h-3.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="truncate">{stat.name}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#222225] text-gray-400">
                  {stat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Length Section */}
      <div>
        <div className="mb-2.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#6b7280]">
            {t('search.filterByLength', 'Length')}
          </span>
        </div>
        <div className="space-y-1">
          {[
            { id: 'all' as DurationFilter, label: t('search.allLengths', 'All lengths') },
            { id: 'under5' as DurationFilter, label: '< 5 h' },
            { id: '5to15' as DurationFilter, label: '5–15 h' },
            { id: 'over15' as DurationFilter, label: '> 15 h' },
          ].map((dur) => {
            const isSelected = selectedDuration === dur.id;
            return (
              <button
                key={dur.id}
                type="button"
                onClick={() => onChangeDuration(dur.id)}
                className={`w-full h-9 px-2.5 rounded-[10px] flex items-center gap-2.5 text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-[#FF5100]/10 border border-[#FF5100]/40 text-white'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <div
                  className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-[#FF5100] text-white'
                      : 'border-[1.5px] border-white/20'
                  }`}
                >
                  {isSelected && (
                    <svg className="w-3.5 h-3.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="truncate">{dur.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

export default SearchFilterRail;
