import React, { useMemo, useState } from 'react';
import { ApprovalRequest, ChangeLogEntry, EntityType } from '../types';

interface AdminAuditPanelProps {
  open: boolean;
  onClose: () => void;
  changeLogs: ChangeLogEntry[];
  approvals: ApprovalRequest[];
  canApprove: boolean;
  onResolveApproval: (id: string, approve: boolean) => void;
}

export const AdminAuditPanel: React.FC<AdminAuditPanelProps> = ({
  open,
  onClose,
  changeLogs,
  approvals,
  canApprove,
  onResolveApproval,
}) => {
  const [entityFilter, setEntityFilter] = useState<EntityType | 'ALL'>('ALL');
  const [trackFilter, setTrackFilter] = useState<'ALL' | 'TRACKED' | 'UNTRACKED'>('ALL');
  const [approvalStatus, setApprovalStatus] = useState<'ALL' | ApprovalRequest['status']>('ALL');

  const filteredChanges = useMemo(() => {
    return changeLogs.filter(log => {
      const entityOk = entityFilter === 'ALL' || log.entityType === entityFilter;
      const trackOk =
        trackFilter === 'ALL'
          ? true
          : trackFilter === 'TRACKED'
            ? log.tracked !== false
            : log.tracked === false;
      return entityOk && trackOk;
    });
  }, [changeLogs, entityFilter, trackFilter]);

  const filteredApprovals = useMemo(() => {
    return approvals.filter(a => approvalStatus === 'ALL' || a.status === approvalStatus);
  }, [approvals, approvalStatus]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col">
        <div className="h-14 border-b border-slate-200 px-5 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">감사 로그 & 승인 관리</h3>
            <span className="text-xs text-slate-500">변경 {changeLogs.length}건 · 승인 {approvals.length}건</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full p-2 transition-colors"
            aria-label="닫기"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <section className="bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <div>
                <h4 className="text-sm font-bold text-slate-900">변경 이력</h4>
                <p className="text-xs text-slate-500">필터링된 {filteredChanges.length}건</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <select
                  className="border border-slate-200 rounded px-2 py-1 bg-white"
                  value={entityFilter}
                  onChange={(e) => setEntityFilter(e.target.value as EntityType | 'ALL')}
                >
                  <option value="ALL">전체 엔터티</option>
                  <option value="Company">Company</option>
                  <option value="Contact">Contact</option>
                  <option value="Deal">Deal</option>
                </select>
                <select
                  className="border border-slate-200 rounded px-2 py-1 bg-white"
                  value={trackFilter}
                  onChange={(e) => setTrackFilter(e.target.value as typeof trackFilter)}
                >
                  <option value="ALL">추적 전체</option>
                  <option value="TRACKED">추적됨</option>
                  <option value="UNTRACKED">미추적</option>
                </select>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {filteredChanges.map(log => (
                <div key={log.id} className="px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">{log.entityType}</span>
                      <span className="font-semibold text-slate-900">{log.fieldName}</span>
                    </div>
                    <span className="text-xs text-slate-500">{new Date(log.changedAt).toLocaleString('ko-KR')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 mt-1">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">{log.oldValue}</span>
                    <span className="text-slate-400">→</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">{log.newValue}</span>
                    {log.tracked === false && <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700">미추적</span>}
                    {log.reason && <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">사유: {log.reason}</span>}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3">
                    <span>변경자: {log.changedBy}</span>
                    <span>유형: {log.changeType}</span>
                    {typeof log.latencyMinutes === 'number' && <span>지연: {log.latencyMinutes}분</span>}
                  </div>
                </div>
              ))}
              {filteredChanges.length === 0 && (
                <div className="px-4 py-6 text-sm text-slate-500 text-center">표시할 변경 이력이 없습니다.</div>
              )}
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <div>
                <h4 className="text-sm font-bold text-slate-900">승인 요청</h4>
                <p className="text-xs text-slate-500">필터링된 {filteredApprovals.length}건</p>
              </div>
              <select
                className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                value={approvalStatus}
                onChange={(e) => setApprovalStatus(e.target.value as typeof approvalStatus)}
              >
                <option value="ALL">전체 상태</option>
                <option value="PENDING">대기</option>
                <option value="APPROVED">승인</option>
                <option value="REJECTED">반려</option>
              </select>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {filteredApprovals.map(req => (
                <div key={req.id} className="px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">{req.entityType}</span>
                      <span className="font-semibold text-slate-900">{req.fieldName}</span>
                    </div>
                    <span className="text-xs text-slate-500">{new Date(req.requestedAt).toLocaleString('ko-KR')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 mt-1">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">{req.oldValue}</span>
                    <span className="text-slate-400">→</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">{req.newValue}</span>
                    <span className="text-slate-500">요청자: {req.requestedBy}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${req.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {req.status}
                    </span>
                    {canApprove && req.status === 'PENDING' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onResolveApproval(req.id, false)}
                          className="text-xs px-3 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-100"
                        >
                          반려
                        </button>
                        <button
                          onClick={() => onResolveApproval(req.id, true)}
                          className="text-xs px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          승인
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {filteredApprovals.length === 0 && (
                <div className="px-4 py-6 text-sm text-slate-500 text-center">표시할 승인 요청이 없습니다.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
