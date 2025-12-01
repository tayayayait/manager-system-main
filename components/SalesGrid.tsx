import React, { useState } from 'react';
import { Company, CompanyStatus } from '../types';
import { STATUS_COLORS } from '../constants';

interface SalesGridProps {
  data: Company[];
  onUpdate: (company: Company) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onOpenDetail: (id: string) => void;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  filters: {
    search: string;
    statuses: CompanyStatus[];
    energies: string[];
    tags: string[];
    companyTypes: string[];
  };
  onFiltersChange: (filters: SalesGridProps['filters']) => void;
  filterOptions: {
    companyTypes: string[];
    tags: string[];
    statuses: CompanyStatus[];
  };
  savedViews: { id: string; name: string; filters: SalesGridProps['filters'] }[];
  onSaveView: (name: string) => void;
  onApplyView: (id: string) => void;
  onDeleteView: (id: string) => void;
  onExportSelected?: () => void;
  onImport?: () => void;
  canManage: boolean;
  canViewSensitive: boolean;
}

type ChipFilterKey = 'statuses' | 'companyTypes' | 'tags';

export const SalesGrid: React.FC<SalesGridProps> = ({ 
    data, 
    onUpdate, 
    onAdd, 
    onDelete,
    onOpenDetail,
    selectedIds,
    setSelectedIds,
    showToast,
    canViewSensitive,
    filters,
    onFiltersChange,
    filterOptions,
  savedViews,
  onSaveView,
  onApplyView,
  onDeleteView,
  onExportSelected,
  onImport,
  canManage,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<keyof Company | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [viewName, setViewName] = useState('');
  
  const filterChipGroups: { key: ChipFilterKey; label: string; options: string[] }[] = [
    { key: 'statuses', label: '상태', options: filterOptions.statuses },
    { key: 'companyTypes', label: '기업 유형', options: filterOptions.companyTypes },
    { key: 'tags', label: '태그', options: filterOptions.tags },
  ];

  const toggleChip = (key: ChipFilterKey, value: string) => {
    const current = filters[key] as string[];
    const next = current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value];
    onFiltersChange({ ...filters, [key]: next } as SalesGridProps['filters']);
  };

  const clearAppliedFilters = () => {
    onFiltersChange({
      ...filters,
      statuses: [],
      companyTypes: [],
      tags: [],
    });
  };

  const activeFiltersCount = filterChipGroups.reduce((sum, group) => sum + (filters[group.key] as string[]).length, 0);

  const filteredData = data;

  const handleStartEdit = (id: string, field: keyof Company, currentValue: string) => {
    if (!canViewSensitive && (field === 'repPhone' || field === 'email')) {
      showToast?.('민감 정보 편집 권한이 없습니다.', 'error');
      return;
    }
    setEditingId(id);
    setEditingField(field);
    setEditValue(currentValue);
  };

  const handleSave = () => {
    if (editingId && editingField) {
      const company = data.find(c => c.id === editingId);
      if (company) {
        if (editingField === 'email' && editValue && !/^[\w.-]+@([\w-]+\.)+[\w-]{2,4}$/.test(editValue)) {
          showToast?.('올바른 이메일 형식이 아닙니다.', 'error');
          return;
        }
        onUpdate({
          ...company,
          [editingField]: editValue
        });
        showToast?.('저장되었습니다.', 'success');
      }
    }
    setEditingId(null);
    setEditingField(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditingField(null);
    }
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length >= 11) {
       // Korean Mobile 010-XXXX-XXXX
       return numbers.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    } else if (numbers.length === 10) {
        // Korean Landline or old mobile 02-XXX-XXXX or 011-XXX-XXXX
        if (numbers.startsWith('02')) {
            return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
        }
        return numbers.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3');
    }
    return value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setEditValue(formatPhoneNumber(e.target.value));
  };

  const toggleSelection = (id: string) => {
      setSelectedIds(prev => 
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
  };

  const toggleAll = () => {
      if (selectedIds.length === filteredData.length) {
          setSelectedIds([]);
      } else {
          setSelectedIds(filteredData.map(c => c.id));
      }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="p-3 border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-3 flex-1 min-w-[240px]">
            <div className="relative flex-1 max-w-sm">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input 
                type="text" 
                placeholder="고객사 또는 담당자 검색..." 
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                value={filters.search}
                onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                list="search-suggestions"
              />
              <datalist id="search-suggestions">
                {data.slice(0, 10).map(c => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              className="text-sm border border-slate-300 rounded-md px-2 py-1.5 bg-white"
              onChange={(e) => e.target.value && onApplyView(e.target.value)}
              defaultValue=""
            >
              <option value="">저장된 뷰 적용</option>
              {savedViews.map(view => <option key={view.id} value={view.id}>{view.name}</option>)}
            </select>
            <input
              className="text-sm border border-slate-300 rounded-md px-2 py-1.5 bg-white"
              placeholder="현재 필터 저장 이름"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
            />
            <button
              onClick={() => {
                if (!viewName) {
                  showToast?.('뷰 이름을 입력하세요.', 'error');
                  return;
                }
                onSaveView(viewName);
                setViewName('');
                showToast?.('필터 뷰가 저장되었습니다.', 'success');
              }}
              className="text-sm px-3 py-1.5 rounded bg-slate-900 text-white"
            >
              저장
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap ml-auto">
            {onImport && (
              <button
                onClick={onImport}
                className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-colors shadow-sm active:transform active:scale-95"
              >
                <svg className="w-4 h-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16 12l-4 4m0 0l-4-4m4 4V4" /></svg>
                데이터 업로드
              </button>
            )}
            {onExportSelected && (
              <button
                onClick={onExportSelected}
                className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-colors shadow-sm active:transform active:scale-95"
              >
                <svg className="w-4 h-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v12"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11l4 4 4-4"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 21h14"></path></svg>
                엑셀 다운로드
              </button>
            )}
            <button 
              onClick={onAdd}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-md text-sm font-medium flex items-center transition-colors shadow-sm active:transform active:scale-95"
            >
              <svg className="w-4 h-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              행 추가
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2">
          <div className="flex flex-wrap gap-3 flex-1">
            {filterChipGroups.map((group) => (
              group.options.length === 0 ? null : (
                <div key={group.key} className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{group.label}</span>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map(option => {
                      const isActive = (filters[group.key] as string[]).includes(option);
                      const baseClass = 'text-xs font-medium px-3 py-1.5 rounded-full border transition whitespace-nowrap';
                      const activeClass = 'bg-indigo-600 text-white border-indigo-600 shadow-sm';
                      const inactiveClass = 'bg-white text-slate-500 border-slate-200 hover:border-slate-300';
                      return (
                        <button
                          key={`${group.key}-${option}`}
                          type="button"
                          className={`${baseClass} ${isActive ? activeClass : inactiveClass}`}
                          onClick={() => toggleChip(group.key, option)}
                          aria-pressed={isActive}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 flex-shrink-0">
            <span>{activeFiltersCount > 0 ? `${activeFiltersCount}개 필터 적용 중` : '전체 보기'}</span>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAppliedFilters}
                className="text-indigo-600 font-semibold hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-200 rounded"
              >
                초기화
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-auto bg-slate-50 relative">
        <table className="w-full text-sm border-collapse bg-white">
          <thead className="bg-slate-100/80 backdrop-blur text-slate-600 font-semibold sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="p-2 border-b border-r border-slate-200 w-10 text-center">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    checked={filteredData.length > 0 && selectedIds.length === filteredData.length}
                    onChange={toggleAll}
                  />
              </th>
              <th className="p-2 border-b border-r border-slate-200 text-left w-1/5 min-w-[150px]">고객사명</th>
              <th className="p-2 border-b border-r border-slate-200 text-left w-1/6 min-w-[100px]">담당자</th>
              <th className="p-2 border-b border-r border-slate-200 text-left w-1/6 min-w-[100px]">직책</th>
              <th className="p-2 border-b border-r border-slate-200 text-left w-36">연락처</th>
              <th className="p-2 border-b border-r border-slate-200 text-left w-32">상태</th>
              <th className="p-2 border-b border-r border-slate-200 text-left w-32">최근 활동일</th>
              <th className="p-2 border-b border-slate-200 text-left min-w-[200px]">비고</th>
              <th className="p-2 border-b border-slate-200 text-left w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((company) => (
              <tr key={company.id} className="group hover:bg-blue-50/50 transition-colors">
                <td className="p-1 border-b border-r border-slate-200 text-center bg-white group-hover:bg-blue-50/50">
                    <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        checked={selectedIds.includes(company.id)}
                        onChange={() => toggleSelection(company.id)}
                    />
                </td>
                
                {/* Company Name */}
                <td 
                  className="p-1 border-b border-r border-slate-200 cursor-text relative h-9"
                  onDoubleClick={() => handleStartEdit(company.id, 'name', company.name)}
                >
                  {editingId === company.id && editingField === 'name' ? (
                    <input
                      autoFocus
                      className="w-full h-full px-2 focus:outline-none focus:bg-white bg-blue-50 rounded-sm"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleSave}
                      onKeyDown={handleKeyDown}
                      placeholder="고객사명 입력"
                    />
                  ) : (
                    <div className="px-2 py-1 truncate text-slate-900 font-medium">{company.name || <span className="text-slate-300 italic">입력 필요</span>}</div>
                  )}
                </td>

                {/* Representative */}
                <td 
                  className="p-1 border-b border-r border-slate-200 cursor-text h-9"
                  onDoubleClick={() => handleStartEdit(company.id, 'repName', company.repName)}
                >
                  {editingId === company.id && editingField === 'repName' ? (
                    <input
                      autoFocus
                      className="w-full h-full px-2 focus:outline-none focus:bg-white bg-blue-50 rounded-sm"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleSave}
                      onKeyDown={handleKeyDown}
                    />
                  ) : (
                    <div className="px-2 py-1 truncate text-slate-700">{company.repName}</div>
                  )}
                </td>

                {/* Position */}
                <td 
                  className="p-1 border-b border-r border-slate-200 cursor-text h-9"
                  onDoubleClick={() => handleStartEdit(company.id, 'repPosition', company.repPosition)}
                >
                   {editingId === company.id && editingField === 'repPosition' ? (
                    <input
                      autoFocus
                      className="w-full h-full px-2 focus:outline-none focus:bg-white bg-blue-50 rounded-sm"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleSave}
                      onKeyDown={handleKeyDown}
                    />
                  ) : (
                    <div className="px-2 py-1 truncate text-slate-500">{company.repPosition}</div>
                  )}
                </td>

                 {/* Phone */}
                 <td 
                  className="p-1 border-b border-r border-slate-200 cursor-text h-9 font-mono text-xs"
                  onDoubleClick={() => handleStartEdit(company.id, 'repPhone', company.repPhone)}
                >
                   {editingId === company.id && editingField === 'repPhone' ? (
                    <input
                      autoFocus
                      className="w-full h-full px-2 focus:outline-none focus:bg-white bg-blue-50 rounded-sm"
                      value={editValue}
                      onChange={handlePhoneChange}
                      onBlur={handleSave}
                      onKeyDown={handleKeyDown}
                      maxLength={13}
                    />
                  ) : (
                    <div className="px-2 py-1 truncate text-slate-600">{canViewSensitive ? company.repPhone : company.repPhone.replace(/.(?=.{4})/g, '*')}</div>
                  )}
                </td>

                {/* Status */}
                <td className="p-1 border-b border-r border-slate-200 h-9">
                  <select 
                    className={`w-full h-full px-2 text-xs border-none focus:ring-0 bg-transparent cursor-pointer font-medium ${STATUS_COLORS[company.status] ? STATUS_COLORS[company.status].split(' ')[1] : ''}`}
                    value={company.status}
                    onChange={(e) => onUpdate({...company, status: e.target.value as CompanyStatus})}
                  >
                    {Object.values(CompanyStatus).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>

                 {/* Last Contact */}
                 <td 
                  className="p-1 border-b border-r border-slate-200 cursor-text h-9 font-mono text-xs"
                  onDoubleClick={() => handleStartEdit(company.id, 'lastContact', company.lastContact)}
                >
                   {editingId === company.id && editingField === 'lastContact' ? (
                    <input
                      type="date"
                      autoFocus
                      className="w-full h-full px-1 focus:outline-none focus:bg-white bg-blue-50 rounded-sm"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleSave}
                      onKeyDown={handleKeyDown}
                    />
                  ) : (
                    <div className="px-2 py-1 truncate text-slate-500">{company.lastContact}</div>
                  )}
                </td>

                 {/* Notes */}
                 <td 
                  className="p-1 border-b border-r border-slate-200 cursor-text h-9"
                  onDoubleClick={() => handleStartEdit(company.id, 'notes', company.notes)}
                >
                   {editingId === company.id && editingField === 'notes' ? (
                    <input
                      autoFocus
                      className="w-full h-full px-2 focus:outline-none focus:bg-white bg-blue-50 rounded-sm"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleSave}
                      onKeyDown={handleKeyDown}
                      placeholder="메모 입력..."
                    />
                  ) : (
                    <div className="px-2 py-1 truncate text-slate-400 max-w-xs" title={company.notes}>
                        {company.notes}
                    </div>
                  )}
                </td>

                {/* Actions */}
                <td className="p-1 border-b border-slate-200 text-center bg-white">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => onOpenDetail(company.id)}
                      className="text-slate-500 hover:text-indigo-600 transition-colors p-1.5 hover:bg-indigo-50 rounded"
                      title="상세 보기"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    </button>
                    {canManage && (
                      <button 
                        onClick={() => onDelete(company.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded"
                        title="삭제"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            
            {filteredData.length === 0 && (
                <tr>
                    <td colSpan={9} className="p-16 text-center text-slate-400 bg-slate-50">
                        <div className="flex flex-col items-center gap-3">
                            <svg className="w-10 h-10 text-slate-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            <span>검색 결과가 없습니다. 필터를 초기화하거나 새로운 행을 추가해보세요.</span>
                        </div>
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Footer / Status Bar */}
      <div className="h-9 bg-slate-100 border-t border-slate-200 flex items-center px-4 text-xs font-medium text-slate-500 justify-between shrink-0 select-none">
         <span>총 {filteredData.length}개 항목</span>
         <span className="flex items-center gap-2">
            {selectedIds.length > 0 && <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{selectedIds.length}개 선택됨</span>}
            <span>준비됨</span>
         </span>
      </div>
    </div>
  );
};
