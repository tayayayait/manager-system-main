import React, { useState } from 'react';
import { UserRole } from '../types';

interface AuthScreenProps {
  onLogin: (email: string, password: string) => void;
  onSignup: (payload: { email: string; name: string; password: string; desiredRole: UserRole; reason?: string; }) => void;
  onDemo: () => void;
  pendingEmail?: string;
  errorMessage?: string | null;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onSignup, onDemo, pendingEmail, errorMessage }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [desiredRole, setDesiredRole] = useState<UserRole>(UserRole.SALES_REP);
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      onLogin(email, password);
    } else {
      onSignup({ email, name, password, desiredRole, reason });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
        <div className="bg-slate-900 p-10 text-center relative overflow-hidden">
             {/* Decorative pattern */}
             <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <svg width="100%" height="100%">
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                    </pattern>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
             </div>

            <div className="w-16 h-16 bg-indigo-600 rounded-xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-indigo-900/50 relative z-10">
                <span className="text-white text-3xl font-bold">S</span>
            </div>
          <h1 className="text-2xl font-bold text-white tracking-tight relative z-10">SalesGrid</h1>
          <p className="text-indigo-200 mt-2 text-sm font-medium relative z-10">B2B 영업 관리의 새로운 기준</p>
        </div>
        
        <div className="p-10">
          <div className="flex items-center gap-2 mb-6">
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${mode === 'login' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}
              onClick={() => setMode('login')}
              type="button"
            >
              로그인
            </button>
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${mode === 'signup' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-700 border-slate-200'}`}
              onClick={() => setMode('signup')}
              type="button"
            >
              회원가입
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">이메일 주소</label>
              <input 
                type="email" 
                required 
                placeholder="you@company.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all bg-slate-50 focus:bg-white"
              />
            </div>
            
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">이름</label>
                <input 
                  type="text" 
                  required 
                  placeholder="홍길동" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all bg-slate-50 focus:bg-white"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">비밀번호</label>
              <input 
                type="password" 
                required 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all bg-slate-50 focus:bg-white"
              />
            </div>

            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">희망 역할</label>
                  <select
                    value={desiredRole}
                    onChange={(e) => setDesiredRole(e.target.value as UserRole)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all bg-slate-50 focus:bg-white"
                  >
                    <option value={UserRole.SALES_REP}>영업대표</option>
                    <option value={UserRole.SALES_MANAGER}>영업관리자</option>
                    <option value={UserRole.SYSTEM_ADMIN}>시스템관리자</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">신청 사유 (선택)</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="어떤 권한이 필요한지 간단히 적어주세요."
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all bg-slate-50 focus:bg-white min-h-[80px]"
                  />
                </div>
              </>
            )}

            {pendingEmail && mode === 'login' && (
              <div className="p-3 rounded-lg bg-amber-50 text-amber-700 text-sm">
                {pendingEmail} 가입 신청이 승인 대기 중입니다. 관리자가 승인하면 안내해드릴게요.
              </div>
            )}
            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                {errorMessage}
              </div>
            )}

            <button 
              type="submit" 
              className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-lg hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200 active:scale-[0.98] transform duration-100"
            >
              {mode === 'login' ? '로그인' : '가입 신청'}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500 mb-4">서비스를 체험해보고 싶으신가요?</p>
            <button 
              onClick={onDemo}
              className="w-full bg-indigo-50 text-indigo-700 font-bold py-3.5 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-100 active:scale-[0.98] transform duration-100"
            >
              데모 모드 입장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
