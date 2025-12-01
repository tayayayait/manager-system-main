import React, { useEffect, useMemo, useState } from 'react';
import { Company, Contact } from '../types';

type ImportMode = 'COMPANY' | 'CONTACT';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  companies: Company[];
  contacts: Contact[];
  onImportCompanies: (items: { targetId?: string; data: Partial<Company> & { name: string } }) => void;
  onImportContacts: (items: { targetId?: string; data: Partial<Contact> & { name: string; companyName?: string } }) => void;
  canManage: boolean;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type ParsedRow = Record<string, string | number | undefined>;

interface CompanyPreview {
  rowIndex: number;
  data: Partial<Company> & { name: string };
  duplicateWith?: Company;
  action: 'create' | 'merge' | 'skip';
  warnings: string[];
}

interface ContactPreview {
  rowIndex: number;
  data: Partial<Contact> & { name: string; companyName?: string };
  duplicateWith?: Contact;
  action: 'create' | 'merge' | 'skip';
  warnings: string[];
}

const guess = (columns: string[], candidates: string[]) => {
  const lowerCols = columns.map(c => c.toLowerCase());
  for (const cand of candidates) {
    const idx = lowerCols.findIndex(c => c.includes(cand));
    if (idx >= 0) return columns[idx];
  }
  return '';
};

export const ImportModal: React.FC<ImportModalProps> = ({
  open,
  onClose,
  companies,
  contacts,
  onImportCompanies,
  onImportContacts,
  canManage,
  showToast,
}) => {
  const [mode, setMode] = useState<ImportMode>('COMPANY');
  const [fileName, setFileName] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [companyActions, setCompanyActions] = useState<Record<number, CompanyPreview['action']>>({});
  const [contactActions, setContactActions] = useState<Record<number, ContactPreview['action']>>({});
  const [companyMap, setCompanyMap] = useState<{ name: string; businessNumber?: string }>({
    name: '',
    businessNumber: '',
  });
  const [contactMap, setContactMap] = useState<{
    name: string;
    email: string;
    phone: string;
    companyName: string;
    title: string;
    department: string;
  }>({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    title: '',
    department: '',
  });

  useEffect(() => {
    if (!open) {
      setFileName('');
      setColumns([]);
      setRows([]);
      setCompanyActions({});
      setContactActions({});
      return;
    }
    if (columns.length === 0 && rows.length === 0) {
      const defaultCols = ['회사명', '사업자번호', '담당자', '이메일', '전화'];
      setColumns(defaultCols);
      setCompanyMap({ name: defaultCols[0], businessNumber: defaultCols[1] });
      setContactMap(prev => ({ ...prev, name: '이름', email: '이메일', phone: '전화', companyName: '회사명' }));
    }
  }, [open, columns.length, rows.length]);

  const handleFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const xlsx = await import('https://cdn.sheetjs.com/xlsx-latest/package/xlsx.mjs');
      const wb = xlsx.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json: ParsedRow[] = xlsx.utils.sheet_to_json(sheet, { defval: '' });
      const cols = Object.keys(json[0] || {});
      setFileName(file.name);
      setColumns(cols);
      setRows(json);
      setCompanyActions({});
      setContactActions({});
      if (cols.length > 0) {
        setCompanyMap({
          name: guess(cols, ['name', '회사']),
          businessNumber: guess(cols, ['biz', '사업자', '등록번호']),
        });
        setContactMap({
          name: guess(cols, ['name', '이름']),
          email: guess(cols, ['email', '메일']),
          phone: guess(cols, ['phone', '전화', 'mobile']),
          companyName: guess(cols, ['company', '고객사', '회사']),
          title: guess(cols, ['title', '직함']),
          department: guess(cols, ['dept', '부서']),
        });
      }
    } catch (err) {
      console.error(err);
      showToast?.('파일을 읽는 중 오류가 발생했습니다. CSV/XLSX 형식을 확인해주세요.', 'error');
    }
  };

  const companyPreview: CompanyPreview[] = useMemo(() => {
    if (mode !== 'COMPANY') return [];
    return rows.map((row, idx) => {
      const name = String(row[companyMap.name] || '').trim();
      const businessNumber = String(row[companyMap.businessNumber] || '').trim();
      const duplicate = companies.find(c =>
        (businessNumber && c.businessNumber && c.businessNumber === businessNumber) ||
        (name && c.name === name)
      );
      const warnings: string[] = [];
      if (!name) warnings.push('회사명 필수');
      return {
        rowIndex: idx,
        data: {
          name,
          businessNumber,
          repName: String(row['담당자'] || row['대표'] || row['담당'] || ''),
          repPhone: String(row['전화'] || row['phone'] || ''),
          email: String(row['이메일'] || row['email'] || ''),
          owner: String(row['소유자'] || row['owner'] || ''),
          status: String(row['상태'] || row['status'] || ''),
          notes: String(row['메모'] || row['notes'] || ''),
        },
        duplicateWith: duplicate,
        action: companyActions[idx] || (duplicate ? 'merge' : 'create'),
        warnings,
      };
    });
  }, [rows, mode, companyMap, companies, companyActions]);

  const contactPreview: ContactPreview[] = useMemo(() => {
    if (mode !== 'CONTACT') return [];
    return rows.map((row, idx) => {
      const email = String(row[contactMap.email] || '').trim();
      const phone = String(row[contactMap.phone] || '').trim();
      const companyName = String(row[contactMap.companyName] || '').trim();
      const duplicate = contacts.find(c => (email && c.email === email) || (phone && c.phone === phone));
      const warnings: string[] = [];
      if (!row[contactMap.name]) warnings.push('이름 필수');
      if (!companyName) warnings.push('회사명 매핑 필요');
      return {
        rowIndex: idx,
        data: {
          name: String(row[contactMap.name] || '').trim(),
          email,
          phone,
          department: String(row[contactMap.department] || '').trim(),
          title: String(row[contactMap.title] || '').trim(),
          companyName,
        },
        duplicateWith: duplicate,
        action: contactActions[idx] || (duplicate ? 'merge' : 'create'),
        warnings,
      };
    });
  }, [rows, mode, contactMap, contacts, contactActions]);

  const handleConfirm = () => {
    if (!canManage) {
      showToast?.('업로드 권한이 없습니다. 관리자에게 문의하세요.', 'error');
      return;
    }
    if (mode === 'COMPANY') {
      const valid = companyPreview.filter(p => !p.warnings.includes('회사명 필수') && p.action !== 'skip');
      onImportCompanies(
        valid.map(p => ({
          targetId: p.action === 'merge' ? p.duplicateWith?.id : undefined,
          data: p.data,
        }))
      );
      onClose();
    } else {
      const valid = contactPreview.filter(p => !p.warnings.includes('이름 필수') && p.action !== 'skip');
      onImportContacts(
        valid.map(p => ({
          targetId: p.action === 'merge' ? p.duplicateWith?.id : undefined,
          data: p.data,
        }))
      );
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-5xl bg-white rounded-xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-slate-900">데이터 업로드 (CSV/XLSX)</h3>
            {fileName && <span className="text-xs text-slate-500">{fileName}</span>}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-700">업로드 유형</label>
            <select
              className="border border-slate-300 rounded px-3 py-2 text-sm"
              value={mode}
              onChange={(e) => setMode(e.target.value as ImportMode)}
            >
              <option value="COMPANY">회사</option>
              <option value="CONTACT">연락처</option>
            </select>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="text-sm"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>

          {rows.length > 0 && (
            <>
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <div className="text-sm font-semibold text-slate-800 mb-2">컬럼 매핑</div>
                {mode === 'COMPANY' ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <label className="text-xs text-slate-500">회사명*</label>
                      <select className="w-full border border-slate-200 rounded px-2 py-1.5" value={companyMap.name} onChange={(e) => setCompanyMap(prev => ({ ...prev, name: e.target.value }))}>
                        <option value="">선택</option>
                        {columns.map(col => <option key={col} value={col}>{col}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">사업자번호</label>
                      <select className="w-full border border-slate-200 rounded px-2 py-1.5" value={companyMap.businessNumber} onChange={(e) => setCompanyMap(prev => ({ ...prev, businessNumber: e.target.value }))}>
                        <option value="">선택</option>
                        {columns.map(col => <option key={col} value={col}>{col}</option>)}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <label className="text-xs text-slate-500">이름*</label>
                      <select className="w-full border border-slate-200 rounded px-2 py-1.5" value={contactMap.name} onChange={(e) => setContactMap(prev => ({ ...prev, name: e.target.value }))}>
                        <option value="">선택</option>
                        {columns.map(col => <option key={col} value={col}>{col}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">회사명*</label>
                      <select className="w-full border border-slate-200 rounded px-2 py-1.5" value={contactMap.companyName} onChange={(e) => setContactMap(prev => ({ ...prev, companyName: e.target.value }))}>
                        <option value="">선택</option>
                        {columns.map(col => <option key={col} value={col}>{col}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">이메일</label>
                      <select className="w-full border border-slate-200 rounded px-2 py-1.5" value={contactMap.email} onChange={(e) => setContactMap(prev => ({ ...prev, email: e.target.value }))}>
                        <option value="">선택</option>
                        {columns.map(col => <option key={col} value={col}>{col}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">전화</label>
                      <select className="w-full border border-slate-200 rounded px-2 py-1.5" value={contactMap.phone} onChange={(e) => setContactMap(prev => ({ ...prev, phone: e.target.value }))}>
                        <option value="">선택</option>
                        {columns.map(col => <option key={col} value={col}>{col}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">부서</label>
                      <select className="w-full border border-slate-200 rounded px-2 py-1.5" value={contactMap.department} onChange={(e) => setContactMap(prev => ({ ...prev, department: e.target.value }))}>
                        <option value="">선택</option>
                        {columns.map(col => <option key={col} value={col}>{col}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">직함</label>
                      <select className="w-full border border-slate-200 rounded px-2 py-1.5" value={contactMap.title} onChange={(e) => setContactMap(prev => ({ ...prev, title: e.target.value }))}>
                        <option value="">선택</option>
                        {columns.map(col => <option key={col} value={col}>{col}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="border border-slate-200 rounded-lg">
                <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                  <div className="text-sm font-semibold text-slate-800">중복 검사 & 매핑 결과</div>
                  <div className="text-xs text-slate-500">기존 데이터와 이름/사업자번호/이메일/전화 기준으로 비교</div>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {mode === 'COMPANY' && companyPreview.map(item => (
                    <div key={item.rowIndex} className="px-3 py-2 text-sm flex items-center gap-3">
                      <div className="w-10 text-xs text-slate-400">#{item.rowIndex + 1}</div>
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">{item.data.name || '(이름 없음)'}</div>
                        <div className="text-xs text-slate-500">사업자번호: {item.data.businessNumber || '-'}</div>
                        {item.duplicateWith && (
                          <div className="text-xs text-amber-700">중복: {item.duplicateWith.name} ({item.duplicateWith.businessNumber || '번호 없음'})</div>
                        )}
                        {item.warnings.length > 0 && (
                          <div className="text-xs text-red-600">{item.warnings.join(', ')}</div>
                        )}
                      </div>
                      <select
                        className="text-xs border border-slate-200 rounded px-2 py-1"
                        value={item.action}
                        onChange={(e) => {
                          const next = e.target.value as CompanyPreview['action'];
                          setCompanyActions(prev => ({ ...prev, [item.rowIndex]: next }));
                        }}
                      >
                        <option value="create">신규 생성</option>
                        {item.duplicateWith && <option value="merge">병합/갱신</option>}
                        <option value="skip">건너뛰기</option>
                      </select>
                    </div>
                  ))}
                  {mode === 'CONTACT' && contactPreview.map(item => (
                    <div key={item.rowIndex} className="px-3 py-2 text-sm flex items-center gap-3">
                      <div className="w-10 text-xs text-slate-400">#{item.rowIndex + 1}</div>
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">{item.data.name || '(이름 없음)'}</div>
                        <div className="text-xs text-slate-500">회사: {item.data.companyName || '-'}</div>
                        <div className="text-xs text-slate-500">이메일/전화: {item.data.email || '-'} / {item.data.phone || '-'}</div>
                        {item.duplicateWith && (
                          <div className="text-xs text-amber-700">중복: {item.duplicateWith.name} ({item.duplicateWith.email || item.duplicateWith.phone || '연락처 없음'})</div>
                        )}
                        {item.warnings.length > 0 && (
                          <div className="text-xs text-red-600">{item.warnings.join(', ')}</div>
                        )}
                      </div>
                      <select
                        className="text-xs border border-slate-200 rounded px-2 py-1"
                        value={item.action}
                        onChange={(e) => {
                          const next = e.target.value as ContactPreview['action'];
                          setContactActions(prev => ({ ...prev, [item.rowIndex]: next }));
                        }}
                      >
                        <option value="create">신규 생성</option>
                        {item.duplicateWith && <option value="merge">병합/갱신</option>}
                        <option value="skip">건너뛰기</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <span className="text-xs text-slate-500">CSV, XLSX 지원 · 첫 시트 기준으로 매핑합니다.</span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-sm px-3 py-2 rounded border border-slate-200 text-slate-600">취소</button>
            <button onClick={handleConfirm} className="text-sm px-3 py-2 rounded bg-indigo-600 text-white">적용</button>
          </div>
        </div>
      </div>
    </div>
  );
};
