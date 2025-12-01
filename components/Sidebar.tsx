import React from 'react';
import { ViewMode } from '../types';

interface SidebarProps {
  currentView: ViewMode;
  onChangeView: (view: ViewMode) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, onLogout }) => {
  return (
    <aside className="w-16 md:w-64 bg-slate-900 text-slate-300 flex flex-col h-full transition-all duration-300 shadow-xl z-30">
      <div className="h-14 flex items-center justify-center md:justify-start md:px-6 border-b border-slate-700 bg-slate-950">
        <div className="bg-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-indigo-900/50">
          <span className="text-white font-bold text-lg">S</span>
        </div>
        <span className="ml-3 font-bold text-white hidden md:block tracking-tight">SalesGrid</span>
      </div>

      <nav className="flex-1 py-6 space-y-1">
        <button
          onClick={() => onChangeView(ViewMode.GRID)}
          className={`w-full flex items-center px-4 md:px-6 py-3 transition-all duration-200 ${
            currentView === ViewMode.GRID 
              ? 'bg-slate-800 text-white border-r-4 border-indigo-500' 
              : 'hover:bg-slate-800/50 hover:text-white'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          <span className="ml-3 hidden md:block text-sm font-medium">리스트 보기</span>
        </button>

        <button
          onClick={() => onChangeView(ViewMode.DASHBOARD)}
          className={`w-full flex items-center px-4 md:px-6 py-3 transition-all duration-200 ${
            currentView === ViewMode.DASHBOARD 
              ? 'bg-slate-800 text-white border-r-4 border-indigo-500' 
              : 'hover:bg-slate-800/50 hover:text-white'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
          <span className="ml-3 hidden md:block text-sm font-medium">대시보드</span>
        </button>

        <button
          onClick={() => onChangeView(ViewMode.CONTACTS)}
          className={`w-full flex items-center px-4 md:px-6 py-3 transition-all duration-200 ${
            currentView === ViewMode.CONTACTS 
              ? 'bg-slate-800 text-white border-r-4 border-indigo-500' 
              : 'hover:bg-slate-800/50 hover:text-white'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          <span className="ml-3 hidden md:block text-sm font-medium">연락처 관리</span>
        </button>

        <button
          onClick={() => onChangeView(ViewMode.PIPELINE)}
          className={`w-full flex items-center px-4 md:px-6 py-3 transition-all duration-200 ${
            currentView === ViewMode.PIPELINE 
              ? 'bg-slate-800 text-white border-r-4 border-indigo-500' 
              : 'hover:bg-slate-800/50 hover:text-white'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9h4l2 6 2-12 2 18 2-12 2 6h4"></path></svg>
          <span className="ml-3 hidden md:block text-sm font-medium">Deal 파이프라인</span>
        </button>
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center md:justify-start px-2 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          <span className="ml-3 hidden md:block text-sm">로그아웃</span>
        </button>
      </div>
    </aside>
  );
};
