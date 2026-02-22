import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import Modal from './Modal';

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'http_request' | 'http_response' | 'error' | 'action';
  message: string;
  method?: string;
  url?: string;
  status?: number;
  data?: any;
}

type FilterType = 'all' | 'error' | 'http' | 'action';

function LogsModal({ isOpen, onClose }: LogsModalProps) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  
  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    } else {
      // Reset state on close
      setSearchTerm('');
      setFilterType('all');
      setExpandedLog(null);
    }
  }, [isOpen]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/logs');
      setLogs(response.data || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async () => {
    try {
      if (window.electronLogs) {
        await window.electronLogs.openLogsFolder();
      } else {
        const response = await api.get('/logs/export', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'storytel-logs.json');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  };

  const clearLogs = async () => {
    if (window.confirm(t('logs.confirmClear', 'Are you sure you want to clear all logs? This cannot be undone.'))) {
      try {
        await api.delete('/logs');
        setLogs([]);
        setExpandedLog(null);
      } catch (error) {
        console.error('Failed to clear logs:', error);
      }
    }
  };

  const getLogStyles = (type: string, status?: number) => {
    if (type === 'error' || (status && status >= 400)) {
      return { text: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-900/50', badge: 'bg-red-900/50 text-red-200' };
    }
    if (type === 'http_response') {
      return { text: 'text-green-400', bg: 'bg-green-900/10', border: 'border-gray-700', badge: 'bg-green-900/50 text-green-200' };
    }
    if (type === 'http_request') {
      return { text: 'text-blue-400', bg: 'bg-blue-900/10', border: 'border-gray-700', badge: 'bg-blue-900/50 text-blue-200' };
    }
    if (type === 'action') {
      return { text: 'text-purple-400', bg: 'bg-purple-900/10', border: 'border-gray-700', badge: 'bg-purple-900/50 text-purple-200' };
    }
    return { text: 'text-gray-300', bg: 'bg-gray-800', border: 'border-gray-700', badge: 'bg-gray-700 text-gray-300' };
  };

  const toggleExpand = (id: string) => {
    setExpandedLog(prev => prev === id ? null : id);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Type filter
      if (filterType === 'error' && log.type !== 'error' && !(log.status && log.status >= 400)) return false;
      if (filterType === 'http' && log.type !== 'http_request' && log.type !== 'http_response') return false;
      if (filterType === 'action' && log.type !== 'action') return false;
      
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const searchString = `${log.message} ${log.url || ''} ${log.method || ''} ${log.status || ''}`.toLowerCase();
        if (!searchString.includes(term)) return false;
      }
      
      return true;
    });
  }, [logs, filterType, searchTerm]);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'http_request': return 'REQ';
      case 'http_response': return 'RES';
      case 'error': return 'ERR';
      case 'action': return 'ACT';
      default: return 'LOG';
    }
  };

  if (!isOpen) return null;

  const headerActions = (
    <div className="flex gap-2 shrink-0">
      <button onClick={fetchLogs} className="flex items-center gap-2 p-2 sm:px-3 sm:py-1.5 text-sm font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-md transition-colors" title={t('logs.refresh', 'Refresh')}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        <span className="hidden sm:inline">{t('logs.refresh', 'Refresh')}</span>
      </button>
      <button onClick={exportLogs} className="flex items-center gap-2 p-2 sm:px-3 sm:py-1.5 text-sm font-medium text-blue-300 hover:text-white bg-blue-900/30 hover:bg-blue-800/50 border border-blue-800/50 rounded-md transition-colors" title={t('logs.export', 'Export')}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        <span className="hidden sm:inline">{t('logs.export', 'Export')}</span>
      </button>
      <button onClick={clearLogs} className="flex items-center gap-2 p-2 sm:px-3 sm:py-1.5 text-sm font-medium text-red-300 hover:text-white bg-red-900/30 hover:bg-red-800/50 border border-red-800/50 rounded-md transition-colors" title={t('logs.clear', 'Clear')}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        <span className="hidden sm:inline">{t('logs.clear', 'Clear')}</span>
      </button>
    </div>
  );

  const titleNode = (
    <div className="flex items-center gap-2 overflow-hidden">
      <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span className="truncate">{t('logs.title', 'Application Logs')}</span>
      <span className="text-xs font-normal text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full ml-1 whitespace-nowrap shrink-0">
        {filteredLogs.length} / {logs.length}
      </span>
    </div>
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={titleNode}
      headerActions={headerActions}
      maxWidth="max-w-5xl"
      zIndex={60}
    >
      <div className="flex flex-col h-full gap-4 mt-[-8px]">
        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <div className="relative flex-1">
            <svg className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input 
              type="text" 
              placeholder={t('logs.search', 'Search logs...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 pl-10 pr-4 text-sm text-gray-200 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          <div className="flex bg-gray-800 rounded-md p-1 border border-gray-700 shrink-0 overflow-x-auto custom-scrollbar">
            {(['all', 'action', 'http', 'error'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  filterType === type 
                    ? 'bg-gray-700 text-white shadow-sm' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                }`}
              >
                {type === 'all' && t('logs.typeAll', 'All Events')}
                {type === 'error' && t('logs.typeError', 'Errors')}
                {type === 'http' && t('logs.typeHttp', 'HTTP Traffic')}
                {type === 'action' && t('logs.typeAction', 'Actions')}
              </button>
            ))}
          </div>
        </div>

        {/* Log List */}
        <div className="flex-1 bg-gray-900">
          {loading && logs.length === 0 ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-400"></div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-gray-500 text-center py-12 flex flex-col items-center">
              <svg className="w-12 h-12 mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p>{t('logs.empty', 'No logs found.')}</p>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {filteredLogs.map((log) => {
                const styles = getLogStyles(log.type, log.status);
                const isExpanded = expandedLog === log.id;
                const time = new Date(log.timestamp);
                
                return (
                  <div key={log.id} className={`rounded-lg border transition-colors ${styles.bg} ${styles.border}`}>
                    <div 
                      className="flex items-center p-3 cursor-pointer hover:bg-white/5 select-none"
                      onClick={() => toggleExpand(log.id)}
                    >
                      <div className="w-20 shrink-0 text-xs text-gray-400 font-mono" title={time.toLocaleString()}>
                        {time.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                      </div>
                      
                      <div className="w-14 shrink-0 flex justify-center mr-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${styles.badge}`}>
                          {getTypeLabel(log.type)}
                        </span>
                      </div>

                      {log.status && (
                        <div className="w-12 shrink-0 flex items-center">
                          <span className={`text-[11px] font-mono font-bold ${log.status >= 400 ? 'text-red-400' : 'text-green-400'}`}>
                            {log.status}
                          </span>
                        </div>
                      )}

                      <div className={`flex-1 text-sm font-mono truncate mr-4 ${styles.text}`} title={log.message}>
                        {log.message}
                      </div>

                      {log.data && (
                        <div className="text-gray-500 shrink-0 flex items-center gap-1">
                          <svg className={`w-4 h-4 transform transition-transform duration-200 ${isExpanded ? 'rotate-180 text-gray-300' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    {isExpanded && log.data && (
                      <div className="p-4 bg-black/40 border-t border-gray-800/50 rounded-b-lg overflow-x-auto custom-scrollbar">
                        <pre className="text-[11px] leading-relaxed text-gray-300 font-mono whitespace-pre-wrap break-words">
                          {typeof log.data === 'object' ? JSON.stringify(log.data, null, 2) : log.data}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default LogsModal;
