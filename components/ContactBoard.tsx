import React, { useMemo, useState } from 'react';
import { Company, Contact } from '../types';

interface ContactBoardProps {
  contacts: Contact[];
  companies: Company[];
  onOpenCompany: (companyId: string) => void;
  canViewSensitive: boolean;
}

export const ContactBoard: React.FC<ContactBoardProps> = ({ contacts, companies, onOpenCompany, canViewSensitive }) => {
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<'ALL' | string>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | string>('ALL');

  const companyMap = useMemo(() => {
    return companies.reduce<Record<string, Company>>((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});
  }, [companies]);

  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase();
    return contacts.filter(c => {
      const matchesCompany = companyFilter === 'ALL' || c.companyId === companyFilter;
      const matchesRole = roleFilter === 'ALL' || (c.role || '').toLowerCase() === roleFilter.toLowerCase();
      const matchesSearch = search
        ? (
            c.name.toLowerCase().includes(searchLower) ||
            (c.email || '').toLowerCase().includes(searchLower) ||
            (c.phone || '').toLowerCase().includes(searchLower) ||
            (c.department || '').toLowerCase().includes(searchLower)
          )
        : true;
      return matchesCompany && matchesRole && matchesSearch;
    });
  }, [contacts, search, companyFilter, roleFilter]);

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-slate-200 flex flex-wrap gap-3 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-slate-300 rounded-md px-3 py-2 text-sm flex-1 min-w-[220px]"
          placeholder="이름, 이메일, 전화, 부서 검색..."
        />
        <select
          className="border border-slate-300 rounded-md px-3 py-2 text-sm"
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value as typeof companyFilter)}
        >
          <option value="ALL">전체 회사</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          className="border border-slate-300 rounded-md px-3 py-2 text-sm"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
        >
          <option value="ALL">역할 전체</option>
          {Array.from(new Set(contacts.map(c => c.role).filter(Boolean))).map(role => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(contact => {
            const company = companyMap[contact.companyId];
            return (
              <div key={contact.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-base font-semibold text-slate-900">{contact.name}</div>
                    <div className="text-xs text-slate-500">{contact.title} {contact.department && `· ${contact.department}`}</div>
                  </div>
                  <button
                    onClick={() => onOpenCompany(contact.companyId)}
                    className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                  >
                    회사 보기
                  </button>
                </div>
                <div className="text-sm text-slate-700 mt-2 space-y-1">
                  <div className="text-xs text-slate-500">역할: {contact.role || '-'}</div>
                  <div className="text-xs text-slate-500">유형: {contact.type || '-'}</div>
                  <div className="text-xs text-slate-500">마지막 상호작용: {contact.lastInteraction || '-'}</div>
                  <div className="text-xs text-slate-500">{canViewSensitive ? contact.email : '***@***'}</div>
                  <div className="text-xs text-slate-500">{canViewSensitive ? contact.phone : '***-****'}</div>
                </div>
                {company && (
                  <div className="mt-3 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{company.name}</span> · {company.status} · {company.owner || company.repName}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-sm text-slate-500 col-span-full text-center py-10">조건에 맞는 연락처가 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
};
