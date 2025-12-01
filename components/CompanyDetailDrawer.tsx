import React, { useEffect, useState } from 'react';
import { Activity, ActivityType, ApprovalRequest, ChangeLogEntry, Company, Contact, Deal, DealStage } from '../types';
import { StatusBadge } from './StatusBadge';
import { STAGE_COLORS } from '../constants';

interface CompanyDetailDrawerProps {
  company?: Company;
  contacts: Contact[];
  deals: Deal[];
  activities: Activity[];
  changeLogs: ChangeLogEntry[];
  approvals: ApprovalRequest[];
  onCreateContact: (companyId: string, payload: Omit<Contact, 'id' | 'companyId'>) => void;
  onUpdateContact: (companyId: string, contactId: string, payload: Omit<Contact, 'id' | 'companyId'>) => void;
  onDeleteContact: (companyId: string, contactId: string) => void;
  onCreateDeal: (companyId: string, payload: Omit<Deal, 'id' | 'companyId' | 'lastUpdated'>) => void;
  onUpdateDeal: (companyId: string, dealId: string, payload: Partial<Omit<Deal, 'id' | 'companyId'>>) => void;
  onDeleteDeal: (companyId: string, dealId: string) => void;
  onCreateActivity: (companyId: string, payload: Omit<Activity, 'id' | 'companyId'>) => void;
  onUpdateActivity: (companyId: string, activityId: string, payload: Partial<Omit<Activity, 'id' | 'companyId'>>) => void;
  onDeleteActivity: (companyId: string, activityId: string) => void;
  onRollbackChange: (log: ChangeLogEntry) => void;
  onClose: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  canViewSensitive: boolean;
  canApprove: boolean;
  onResolveApproval: (approvalId: string, approve: boolean) => void;
  canManage: boolean;
}

const stageOrder: Record<DealStage, number> = {
  [DealStage.LEAD]: 1,
  [DealStage.EVALUATION]: 2,
  [DealStage.PROPOSAL]: 3,
  [DealStage.NEGOTIATION]: 4,
  [DealStage.CONTRACT]: 5,
  [DealStage.LOST]: 6
};

const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString('ko-KR') : '-';
const formatDateTime = (value?: string) => value ? new Date(value).toLocaleString('ko-KR') : '-';
const formatAmount = (value?: number) => value !== undefined ? `${value.toLocaleString('ko-KR')} 원` : '-';
const maskPhone = (value?: string) => value ? value.replace(/.(?=.{4})/g, '*') : '-';
const maskEmail = (value?: string) => {
  if (!value) return '-';
  const [user, domain] = value.split('@');
  if (!domain) return '***';
  return `${user.slice(0, 1)}***@${domain}`;
};

export const CompanyDetailDrawer: React.FC<CompanyDetailDrawerProps> = ({
  company,
  contacts,
  deals,
  activities,
  changeLogs,
  approvals,
  onCreateContact,
  onUpdateContact,
  onDeleteContact,
  onCreateDeal,
  onUpdateDeal,
  onDeleteDeal,
  onCreateActivity,
  onUpdateActivity,
  onDeleteActivity,
  onClose,
  showToast,
  canViewSensitive,
  canApprove,
  onResolveApproval,
  canManage,
}) => {
  if (!company) return null;

  const companyContacts = contacts.filter(c => c.companyId === company.id);
  const companyDeals = deals
    .filter(d => d.companyId === company.id)
    .sort((a, b) => stageOrder[a.stage] - stageOrder[b.stage]);
  const companyActivities = activities
    .filter(a => a.companyId === company.id)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  const relatedIds = new Set<string>([
    company.id,
    ...companyDeals.map(d => d.id),
    ...companyContacts.map(c => c.id),
  ]);

  const companyChangeLogs = changeLogs
    .filter(c => relatedIds.has(c.entityId))
    .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());

  const companyApprovals = approvals
    .filter(a => relatedIds.has(a.entityId))
    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'activity' | 'history'>('activity');

  const [contactForm, setContactForm] = useState<Omit<Contact, 'id' | 'companyId'>>({
    name: '',
    title: '',
    department: '',
    email: '',
    phone: '',
    role: 'Champion',
    lastInteraction: new Date().toISOString().split('T')[0],
    type: '의사결정자',
  });

  const [dealForm, setDealForm] = useState<Omit<Deal, 'id' | 'companyId' | 'lastUpdated'>>({
    name: '',
    stage: DealStage.LEAD,
    amount: 0,
    expectedCloseDate: new Date().toISOString().split('T')[0],
    status: '진행',
    owner: company.owner || company.repName || '담당자',
    contactId: companyContacts[0]?.id,
  });

  const [activityForm, setActivityForm] = useState<Omit<Activity, 'id' | 'companyId'>>({
    contactId: companyContacts[0]?.id,
    dealId: companyDeals[0]?.id,
    type: ActivityType.CALL,
    summary: '',
    actor: company.owner || '미지정',
    occurredAt: new Date().toISOString(),
    nextStep: '',
  });

  useEffect(() => {
    if (companyContacts.length > 0 && !companyContacts.find(c => c.id === dealForm.contactId)) {
      setDealForm(prev => ({ ...prev, contactId: companyContacts[0]?.id }));
    }
    if (companyContacts.length > 0 && !companyContacts.find(c => c.id === activityForm.contactId)) {
      setActivityForm(prev => ({ ...prev, contactId: companyContacts[0]?.id }));
    }
    if (companyDeals.length > 0 && !companyDeals.find(d => d.id === activityForm.dealId)) {
      setActivityForm(prev => ({ ...prev, dealId: companyDeals[0]?.id }));
    }
  }, [companyContacts, companyDeals, dealForm.contactId, activityForm.contactId, activityForm.dealId]);

  const resetContactForm = () => {
    setContactForm({
      name: '',
      title: '',
      department: '',
      email: '',
      phone: '',
      role: 'Champion',
      lastInteraction: new Date().toISOString().split('T')[0],
      type: '의사결정자',
    });
    setEditingContactId(null);
  };

  const resetDealForm = () => {
    setDealForm({
      name: '',
      stage: DealStage.LEAD,
      amount: 0,
      expectedCloseDate: new Date().toISOString().split('T')[0],
      status: '진행',
      owner: company.owner || '담당자',
      contactId: companyContacts[0]?.id,
    });
    setEditingDealId(null);
  };

  const resetActivityForm = () => {
    setActivityForm({
      contactId: companyContacts[0]?.id,
      dealId: companyDeals[0]?.id,
      type: ActivityType.CALL,
      summary: '',
      actor: company.owner || '미지정',
      occurredAt: new Date().toISOString(),
      nextStep: '',
    });
    setEditingActivityId(null);
  };

  const handleSubmitContact = () => {
    if (!contactForm.name) {
      showToast?.('연락처 이름은 필수입니다.', 'error');
      return;
    }
    if (!contactForm.email || !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(contactForm.email)) {
      showToast?.('올바른 이메일 주소를 입력해주세요. 예) user@company.com', 'error');
      return;
    }
    if (contactForm.phone && !/^[0-9+\\-\\s]{8,16}$/.test(contactForm.phone)) {
      showToast?.('전화번호는 숫자와 - 만 사용해 8~16자리로 입력해주세요.', 'error');
      return;
    }
    if (editingContactId) {
      onUpdateContact(company.id, editingContactId, contactForm);
    } else {
      onCreateContact(company.id, contactForm);
    }
    resetContactForm();
  };

  const handleSubmitDeal = () => {
    if (!dealForm.name) {
      showToast?.('거래명은 필수입니다.', 'error');
      return;
    }
    if (!dealForm.amount || Number.isNaN(dealForm.amount) || dealForm.amount <= 0) {
      showToast?.('금액은 0보다 큰 숫자여야 합니다.', 'error');
      return;
    }
    if (!dealForm.expectedCloseDate) {
      showToast?.('예상 마감일을 입력해주세요.', 'error');
      return;
    }
    if (editingDealId) {
      onUpdateDeal(company.id, editingDealId, dealForm);
    } else {
      onCreateDeal(company.id, dealForm);
    }
    resetDealForm();
  };

  const handleSubmitActivity = () => {
    if (!activityForm.summary) {
      showToast?.('활동 요약은 필수입니다.', 'error');
      return;
    }
    if (editingActivityId) {
      onUpdateActivity(company.id, editingActivityId, activityForm);
    } else {
      onCreateActivity(company.id, activityForm);
    }
    resetActivityForm();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-end bg-black/30 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl h-full shadow-2xl overflow-hidden flex flex-col">
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900">{company.name}</h2>
              <StatusBadge status={company.status} />
              {company.energyGrade && (
                <span className="px-2 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700">
                  에너지 {company.energyGrade}
                </span>
              )}
            </div>
            <div className="text-sm text-slate-500 flex items-center gap-2">
              <span>담당: {company.owner || company.repName}</span>
              <span>·</span>
              <span>마지막 접촉: {company.lastContact}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full p-2 transition-colors"
            aria-label="닫기"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 bg-slate-50">
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">회사 정보</div>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <div className="flex justify-between"><span className="text-slate-500">산업</span><span>{company.industry || '-'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">규모</span><span>{company.revenueScale || '-'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">직원수</span><span>{company.employeeCount ? `${company.employeeCount.toLocaleString()}명` : '-'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">지역</span><span>{company.city || '-'} {company.country ? `(${company.country})` : ''}</span></div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">리드 정보</div>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <div className="flex justify-between"><span className="text-slate-500">리드 소스</span><span>{company.leadSource || '-'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">점수</span><span>{company.score ? `${company.score} 점` : '-'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">생성일</span><span>{formatDate(company.createdAt)}</span></div>
                <div className="flex justify-between">
                  <span className="text-slate-500">태그</span>
                  <span className="flex flex-wrap gap-1 justify-end">
                    {company.tags && company.tags.length > 0 ? (
                      company.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{tag}</span>
                      ))
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">연락 담당자</div>
              <div className="mt-3 text-sm text-slate-700 space-y-3">
                <div>
                  <div className="font-semibold text-slate-900">{company.repName}</div>
                  <div className="text-slate-500 text-xs">{company.repPosition}</div>
                  <div className="text-slate-500 text-xs">{canViewSensitive ? company.repPhone : maskPhone(company.repPhone)}</div>
                  <div className="text-slate-500 text-xs">{canViewSensitive ? company.email : maskEmail(company.email)}</div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900">연락처</h3>
              <span className="text-xs text-slate-500">총 {companyContacts.length}명</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {companyContacts.map(contact => (
                <div key={contact.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">{contact.name}</div>
                      <div className="text-xs text-slate-500">{contact.title}{contact.department ? ` · ${contact.department}` : ''}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setContactForm({
                            name: contact.name,
                            title: contact.title,
                            department: contact.department,
                            email: contact.email,
                            phone: contact.phone,
                            role: contact.role,
                            lastInteraction: contact.lastInteraction,
                            type: contact.type,
                          });
                          setEditingContactId(contact.id);
                        }}
                        className="p-1 text-slate-400 hover:text-indigo-600"
                        title="편집"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
                      </button>
                      {canManage && (
                        <button
                          onClick={() => {
                            if (confirm('이 연락처를 삭제하시겠습니까?')) {
                              onDeleteContact(company.id, contact.id);
                              if (editingContactId === contact.id) resetContactForm();
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-red-600"
                          title="삭제"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-2 space-y-1">
                    <div>{canViewSensitive ? contact.email : maskEmail(contact.email)}</div>
                    <div>{canViewSensitive ? contact.phone : maskPhone(contact.phone)}</div>
                    <div>최근 상호작용: {formatDate(contact.lastInteraction)}</div>
                  </div>
                </div>
              ))}
              {companyContacts.length === 0 && (
                <div className="text-sm text-slate-500">등록된 연락처가 없습니다.</div>
              )}
            </div>

            <div className="mt-4 border-t border-slate-200 pt-4">
              <h4 className="text-sm font-semibold text-slate-800 mb-2">연락처 추가</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <input className="border border-slate-200 rounded px-2 py-2" placeholder="이름" value={contactForm.name} onChange={(e) => setContactForm({...contactForm, name: e.target.value})} />
                <input className="border border-slate-200 rounded px-2 py-2" placeholder="직함" value={contactForm.title} onChange={(e) => setContactForm({...contactForm, title: e.target.value})} />
                <input className="border border-slate-200 rounded px-2 py-2" placeholder="이메일" value={contactForm.email} onChange={(e) => setContactForm({...contactForm, email: e.target.value})} />
                <input className="border border-slate-200 rounded px-2 py-2" placeholder="전화번호" value={contactForm.phone} onChange={(e) => setContactForm({...contactForm, phone: e.target.value.replace(/[^0-9+\\-\\s]/g, '')})} />
                <input className="border border-slate-200 rounded px-2 py-2" placeholder="부서" value={contactForm.department} onChange={(e) => setContactForm({...contactForm, department: e.target.value})} />
                <input className="border border-slate-200 rounded px-2 py-2" placeholder="역할 (Champion 등)" value={contactForm.role} onChange={(e) => setContactForm({...contactForm, role: e.target.value})} />
                <input className="border border-slate-200 rounded px-2 py-2" placeholder="유형 (의사결정자 등)" value={contactForm.type} onChange={(e) => setContactForm({...contactForm, type: e.target.value})} />
                <input className="border border-slate-200 rounded px-2 py-2" type="date" value={contactForm.lastInteraction} onChange={(e) => setContactForm({...contactForm, lastInteraction: e.target.value})} />
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button className="text-sm px-3 py-2 rounded border border-slate-200 text-slate-600" onClick={resetContactForm}>초기화</button>
                <button className="text-sm px-3 py-2 rounded bg-indigo-600 text-white" onClick={handleSubmitContact}>
                  {editingContactId ? '수정' : '추가'}
                </button>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900">거래/기회</h3>
              <span className="text-xs text-slate-500">총 {companyDeals.length}건</span>
            </div>
            <div className="space-y-3">
              {companyDeals.map(deal => (
                <div key={deal.id} className="border border-slate-200 rounded-lg p-3 bg-white flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">{deal.name}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${STAGE_COLORS[deal.stage]}`}>{deal.stage}</span>
                      <span>담당 {deal.owner}</span>
                      <span>예상 마감 {formatDate(deal.expectedCloseDate)}</span>
                    </div>
                    <div className="text-sm text-slate-700 mt-1">금액 {canViewSensitive ? formatAmount(deal.amount) : '***'}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-md ${deal.status === '성공' ? 'bg-green-50 text-green-700' : deal.status === '실패' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                      {deal.status}
                    </span>
                    <button
                      onClick={() => {
                        setDealForm({
                          name: deal.name,
                          stage: deal.stage,
                          amount: deal.amount,
                          expectedCloseDate: deal.expectedCloseDate,
                          status: deal.status,
                          owner: deal.owner,
                          contactId: deal.contactId,
                        });
                        setEditingDealId(deal.id);
                      }}
                      className="p-1 text-slate-400 hover:text-indigo-600"
                      title="편집"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
                    </button>
                    {canManage && (
                      <button
                        onClick={() => {
                          if (confirm('이 거래를 삭제하시겠습니까?')) {
                            onDeleteDeal(company.id, deal.id);
                            if (editingDealId === deal.id) resetDealForm();
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-red-600"
                        title="삭제"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {companyDeals.length === 0 && (
                <div className="text-sm text-slate-500">진행 중인 거래가 없습니다.</div>
              )}
            </div>

            <div className="mt-4 border-t border-slate-200 pt-4">
              <h4 className="text-sm font-semibold text-slate-800 mb-2">거래 추가</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <input className="border border-slate-200 rounded px-2 py-2" placeholder="거래명" value={dealForm.name} onChange={(e) => setDealForm({...dealForm, name: e.target.value})} />
                <select className="border border-slate-200 rounded px-2 py-2" value={dealForm.stage} onChange={(e) => setDealForm({...dealForm, stage: e.target.value as DealStage})}>
                  {Object.values(DealStage).map(stage => <option key={stage} value={stage}>{stage}</option>)}
                </select>
                <input className="border border-slate-200 rounded px-2 py-2" type="number" placeholder="금액" value={dealForm.amount} onChange={(e) => setDealForm({...dealForm, amount: Number(e.target.value)})} />
                <input className="border border-slate-200 rounded px-2 py-2" type="date" value={dealForm.expectedCloseDate} onChange={(e) => setDealForm({...dealForm, expectedCloseDate: e.target.value})} />
                <input className="border border-slate-200 rounded px-2 py-2" placeholder="담당자" value={dealForm.owner} onChange={(e) => setDealForm({...dealForm, owner: e.target.value})} />
                <select className="border border-slate-200 rounded px-2 py-2" value={dealForm.status} onChange={(e) => setDealForm({...dealForm, status: e.target.value as Deal['status']})}>
                  <option value="진행">진행</option>
                  <option value="성공">성공</option>
                  <option value="실패">실패</option>
                </select>
                <select className="border border-slate-200 rounded px-2 py-2" value={dealForm.contactId} onChange={(e) => setDealForm({...dealForm, contactId: e.target.value || undefined})}>
                  <option value="">관련 연락처 선택</option>
                  {companyContacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button className="text-sm px-3 py-2 rounded border border-slate-200 text-slate-600" onClick={resetDealForm}>초기화</button>
                <button className="text-sm px-3 py-2 rounded bg-indigo-600 text-white" onClick={handleSubmitDeal}>
                  {editingDealId ? '수정' : '추가'}
                </button>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <button
                className={`text-sm font-semibold px-3 py-2 rounded-md ${activeTab === 'activity' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                onClick={() => setActiveTab('activity')}
              >
                활동 & 노트
              </button>
              <button
                className={`text-sm font-semibold px-3 py-2 rounded-md ${activeTab === 'history' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                onClick={() => setActiveTab('history')}
              >
                필드 이력 / 승인
              </button>
            </div>

            {activeTab === 'activity' ? (
              <div className="space-y-5 pt-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="text-sm font-semibold text-slate-900 mb-1">회사 노트</div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap min-h-[60px]">{company.notes || '등록된 노트가 없습니다.'}</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold text-slate-900">활동 로그</h3>
                    <span className="text-xs text-slate-500">최근 {companyActivities.length}건</span>
                  </div>
                  <div className="space-y-3">
                    {companyActivities.map(activity => {
                      const relatedDeal = companyDeals.find(d => d.id === activity.dealId);
                      const relatedContact = companyContacts.find(c => c.id === activity.contactId);
                      return (
                        <div key={activity.id} className="flex gap-3 border border-slate-200 rounded-lg p-3 bg-slate-50">
                          <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-semibold text-xs shrink-0">
                            {activity.type}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="font-semibold text-slate-900">{activity.summary}</div>
                              <div className="flex items-center gap-2">
                                <div className="text-xs text-slate-500">{formatDateTime(activity.occurredAt)}</div>
                                <button
                                  onClick={() => {
                                    setActivityForm({
                                      contactId: activity.contactId,
                                      dealId: activity.dealId,
                                      type: activity.type,
                                      summary: activity.summary,
                                      actor: activity.actor,
                                      occurredAt: activity.occurredAt,
                                      nextStep: activity.nextStep,
                                    });
                                    setEditingActivityId(activity.id);
                                  }}
                                  className="p-1 text-slate-400 hover:text-indigo-600"
                                  title="편집"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
                                </button>
                                {canManage && (
                                  <button
                                    onClick={() => {
                                      if (confirm('이 활동을 삭제하시겠습니까?')) {
                                        onDeleteActivity(company.id, activity.id);
                                        if (editingActivityId === activity.id) resetActivityForm();
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:text-red-600"
                                    title="삭제"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                              <span>담당 {activity.actor}</span>
                              {relatedContact && <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">연락처: {relatedContact.name}</span>}
                              {relatedDeal && <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">Deal: {relatedDeal.name}</span>}
                              {activity.nextStep && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">다음 단계: {activity.nextStep}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {companyActivities.length === 0 && (
                      <div className="text-sm text-slate-500">기록된 활동이 없습니다.</div>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <h4 className="text-sm font-semibold text-slate-800 mb-2">활동 추가</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <select className="border border-slate-200 rounded px-2 py-2" value={activityForm.type} onChange={(e) => setActivityForm({...activityForm, type: e.target.value as ActivityType})}>
                      {Object.values(ActivityType).map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <input className="border border-slate-200 rounded px-2 py-2" placeholder="담당자" value={activityForm.actor} onChange={(e) => setActivityForm({...activityForm, actor: e.target.value})} />
                    <input className="border border-slate-200 rounded px-2 py-2" placeholder="요약" value={activityForm.summary} onChange={(e) => setActivityForm({...activityForm, summary: e.target.value})} />
                    <input className="border border-slate-200 rounded px-2 py-2" type="datetime-local" value={activityForm.occurredAt.slice(0,16)} onChange={(e) => setActivityForm({...activityForm, occurredAt: e.target.value})} />
                    <input className="border border-slate-200 rounded px-2 py-2" placeholder="다음 단계" value={activityForm.nextStep} onChange={(e) => setActivityForm({...activityForm, nextStep: e.target.value})} />
                    <select className="border border-slate-200 rounded px-2 py-2" value={activityForm.contactId} onChange={(e) => setActivityForm({...activityForm, contactId: e.target.value || undefined})}>
                      <option value="">관련 연락처 선택</option>
                      {companyContacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select className="border border-slate-200 rounded px-2 py-2" value={activityForm.dealId} onChange={(e) => setActivityForm({...activityForm, dealId: e.target.value || undefined})}>
                      <option value="">관련 Deal 선택</option>
                      {companyDeals.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <button className="text-sm px-3 py-2 rounded border border-slate-200 text-slate-600" onClick={resetActivityForm}>초기화</button>
                    <button className="text-sm px-3 py-2 rounded bg-indigo-600 text-white" onClick={handleSubmitActivity}>
                      {editingActivityId ? '수정' : '추가'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">필드 변경 이력</h3>
                  <span className="text-xs text-slate-500">총 {companyChangeLogs.length}건</span>
                </div>
                <div className="space-y-2">
                  {companyChangeLogs.map(log => (
                    <div key={log.id} className="border border-slate-200 rounded-lg p-3 bg-white flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">{log.entityType}</span>
                    <span className="text-sm font-semibold text-slate-900">{log.fieldName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-slate-500">{formatDateTime(log.changedAt)}</div>
                    {canManage && (
                      <button
                        onClick={() => onRollbackChange(log)}
                        className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 border border-red-100"
                      >
                        롤백
                      </button>
                    )}
                  </div>
                </div>
                      <div className="flex items-center gap-2 text-sm text-slate-700 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">{log.oldValue}</span>
                        <span className="text-slate-400">→</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">{log.newValue}</span>
                        {log.reason && <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">사유: {log.reason}</span>}
                        {log.oldValueTruncated && <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded">이전값 255자 초과</span>}
                        {log.newValueTruncated && <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded">신규값 255자 초과</span>}
                        {log.retentionUntil && <span className="text-xs text-slate-500">보존 만료: {formatDate(log.retentionUntil)}</span>}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                        <span>변경자: {log.changedBy}</span>
                        <span>유형: {log.changeType}</span>
                        {log.latencyMinutes !== undefined && <span>지연: {log.latencyMinutes}분</span>}
                        {log.tracked === false && <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded">미추적</span>}
                      </div>
                    </div>
                  ))}
                  {companyChangeLogs.length === 0 && (
                    <div className="text-sm text-slate-500">아직 변경 이력이 없습니다.</div>
                  )}
                </div>

                <div className="border-t border-slate-200 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-slate-900">승인 요청</h3>
                    <span className="text-xs text-slate-500">총 {companyApprovals.length}건</span>
                  </div>
                  <div className="space-y-2">
                    {companyApprovals.map(req => (
                      <div key={req.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50 flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs">{req.entityType}</span>
                            <span className="font-semibold text-slate-900">{req.fieldName}</span>
                            <span className="text-xs text-slate-500">{new Date(req.requestedAt).toLocaleString('ko-KR')}</span>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${req.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : req.status === 'APPROVED' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {req.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-700 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">{req.oldValue}</span>
                          <span className="text-slate-400">→</span>
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">{req.newValue}</span>
                          <span className="text-xs text-slate-500">요청자: {req.requestedBy}</span>
                        </div>
                        {canApprove && req.status === 'PENDING' && (
                          <div className="flex gap-2 justify-end mt-1">
                            <button className="text-xs px-3 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-100" onClick={() => onResolveApproval(req.id, false)}>반려</button>
                            <button className="text-xs px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => onResolveApproval(req.id, true)}>승인</button>
                          </div>
                        )}
                      </div>
                    ))}
                    {companyApprovals.length === 0 && (
                      <div className="text-sm text-slate-500">대기 중인 승인 요청이 없습니다.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
