import React, { useState, useEffect } from 'react';
import { Activity, ChangeLogEntry, Company, Deal } from '../types';
import { generateWeeklyReport } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface SmartReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  deals: Deal[];
  activities: Activity[];
  changeLogs: ChangeLogEntry[];
}

export const SmartReportModal: React.FC<SmartReportModalProps> = ({ isOpen, onClose, companies, deals, activities, changeLogs }) => {
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOwner, setSelectedOwner] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setReport('');
      setError(null);
      setSelectedOwner('');
    }
  }, [isOpen]);

  const owners = Array.from(new Set(companies.map(c => c.owner || c.repName).filter(Boolean))) as string[];

  const handleGenerate = async () => {
    if (companies.length === 0) {
      setError('보고서를 생성할 회사를 최소 1개 이상 선택해주세요.');
      return;
    }
    if (!selectedOwner) {
      setError('담당자를 선택해주세요.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const text = await generateWeeklyReport(companies, deals, activities, changeLogs, selectedOwner);
      setReport(text);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '보고서 생성에 실패했습니다.';
      setError(msg);
      setReport('');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-800 tracking-tight">AI 주간 업무 보고</h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="px-6 pt-4 pb-6 space-y-4 overflow-y-auto flex-1 text-sm text-slate-700 leading-relaxed bg-white">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="text-sm text-slate-600">선택된 회사: <span className="font-semibold text-slate-900">{companies.length}</span>개</div>
            <select
              className="border border-slate-300 rounded px-3 py-2 text-sm"
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
            >
              <option value="">담당자 선택</option>
              {owners.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <button
              onClick={handleGenerate}
              disabled={loading || companies.length === 0}
              className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              생성
            </button>
            {error && <span className="text-xs text-red-600">{error}</span>}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-6">
              <div className="relative">
                  <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
              <div className="text-center">
                  <p className="text-slate-700 font-semibold text-lg">데이터 분석 중...</p>
                  <p className="text-slate-500 text-sm mt-1">{companies.length}개 회사의 영업 기록을 정리하고 있습니다.</p>
              </div>
            </div>
          ) : report ? (
            <div className="prose prose-sm prose-indigo max-w-none prose-headings:font-bold prose-headings:text-slate-800 prose-p:text-slate-600 prose-li:text-slate-600">
              <ReactMarkdown>{report}</ReactMarkdown>
            </div>
          ) : (
            <div className="text-sm text-slate-500">보고서를 생성하려면 담당자를 선택하고 "생성"을 눌러주세요.</div>
          )}
        </div>

        <div className="p-5 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors text-sm"
          >
            닫기
          </button>
          {report && (
            <button 
              onClick={() => {navigator.clipboard.writeText(report); alert('클립보드에 복사되었습니다.')}}
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              클립보드 복사
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
