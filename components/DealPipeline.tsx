import React from 'react';
import { Company, Contact, Deal, DealStage } from '../types';
import { STAGE_COLORS } from '../constants';

interface DealPipelineProps {
  deals: Deal[];
  companies: Company[];
  contacts: Contact[];
  onUpdateStage: (dealId: string, stage: DealStage) => void;
  onOpenCompany: (companyId: string) => void;
  canViewSensitive: boolean;
}

const stageOrder: DealStage[] = [
  DealStage.LEAD,
  DealStage.EVALUATION,
  DealStage.PROPOSAL,
  DealStage.NEGOTIATION,
  DealStage.CONTRACT,
  DealStage.LOST,
];

export const DealPipeline: React.FC<DealPipelineProps> = ({
  deals,
  companies,
  contacts,
  onUpdateStage,
  onOpenCompany,
  canViewSensitive,
}) => {
  const companyMap = companies.reduce<Record<string, Company>>((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {});
  const contactMap = contacts.reduce<Record<string, Contact>>((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {});

  return (
    <div className="h-full overflow-x-auto bg-slate-50">
      <div className="min-w-[900px] grid grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4 p-4">
        {stageOrder.map(stage => {
          const stageDeals = deals.filter(d => d.stage === stage);
          return (
            <div key={stage} className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-md text-xs font-semibold ${STAGE_COLORS[stage]}`}>{stage}</span>
                  <span className="text-xs text-slate-500">{stageDeals.length}건</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {stageDeals.map(deal => {
                  const company = companyMap[deal.companyId];
                  const contact = deal.contactId ? contactMap[deal.contactId] : undefined;
                  return (
                    <div key={deal.id} className="border border-slate-200 rounded-lg bg-white p-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-slate-900">{deal.name}</div>
                          <div className="text-xs text-slate-500">{company?.name || '미지정 회사'}</div>
                        </div>
                        <select
                          value={deal.stage}
                          onChange={(e) => onUpdateStage(deal.id, e.target.value as DealStage)}
                          className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                        >
                          {stageOrder.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="text-xs text-slate-600 mt-2 space-y-1">
                        <div>금액: {canViewSensitive ? `${deal.amount.toLocaleString('ko-KR')} 원` : '***'}</div>
                        <div>마감: {deal.expectedCloseDate}</div>
                        <div>담당: {deal.owner}</div>
                        {contact && <div>주 연락처: {contact.name}</div>}
                      </div>
                      <button
                        className="mt-2 text-xs text-indigo-700 hover:underline"
                        onClick={() => onOpenCompany(deal.companyId)}
                      >
                        상세 보기
                      </button>
                    </div>
                  );
                })}
                {stageDeals.length === 0 && (
                  <div className="text-xs text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-lg">
                    카드가 없습니다.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
