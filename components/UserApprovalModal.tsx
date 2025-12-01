import React, { useState } from 'react';
import { SignupRequest, UserRole } from '../types';

interface UserApprovalModalProps {
  open: boolean;
  onClose: () => void;
  pending: SignupRequest[];
  onApprove: (id: string, role: UserRole) => void;
  onReject: (id: string) => void;
}

export const UserApprovalModal: React.FC<UserApprovalModalProps> = ({ open, onClose, pending, onApprove, onReject }) => {
  const [roleSelections, setRoleSelections] = useState<Record<string, UserRole>>({});

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">사용자 가입 승인</h3>
            <p className="text-xs text-slate-500 mt-1">대기 {pending.length}건</p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-3 bg-white">
          {pending.length === 0 && (
            <div className="text-sm text-slate-500 text-center py-8 border border-dashed border-slate-200 rounded-lg">
              승인 대기 중인 사용자가 없습니다.
            </div>
          )}
          {pending.map(req => {
            const selectedRole = roleSelections[req.id] || req.desiredRole || UserRole.SALES_REP;
            return (
              <div key={req.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{req.name}</div>
                    <div className="text-xs text-slate-500">{req.email}</div>
                  </div>
                  <span className="text-xs text-slate-500">{new Date(req.requestedAt).toLocaleString('ko-KR')}</span>
                </div>
                <div className="mt-2 text-sm text-slate-700 flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs">요청: {req.desiredRole}</span>
                  {req.reason && <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-xs">사유: {req.reason}</span>}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <select
                    value={selectedRole}
                    onChange={(e) => setRoleSelections(prev => ({ ...prev, [req.id]: e.target.value as UserRole }))}
                    className="text-sm border border-slate-300 rounded-md px-3 py-2 bg-white"
                  >
                    <option value={UserRole.SALES_REP}>영업대표</option>
                    <option value={UserRole.SALES_MANAGER}>영업관리자</option>
                    <option value={UserRole.SYSTEM_ADMIN}>시스템관리자</option>
                  </select>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => onReject(req.id)}
                      className="text-sm px-3 py-2 rounded border border-slate-200 text-slate-600 hover:bg-slate-100"
                    >
                      반려
                    </button>
                    <button
                      onClick={() => onApprove(req.id, selectedRole)}
                      className="text-sm px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      승인
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
