import React, { useState, useEffect, useMemo } from 'react';
import { SalesGrid } from './components/SalesGrid';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { AuthScreen } from './components/AuthScreen';
import { Activity, ApprovalRequest, AuthUser, ChangeLogEntry, ChangeType, Company, CompanyStatus, Contact, Deal, DealStage, SignupRequest, UserRole, ViewMode } from './types';
import { MOCK_ACTIVITIES, MOCK_CHANGE_LOGS, MOCK_COMPANIES, MOCK_CONTACTS, MOCK_DEALS } from './constants';
import { isApiEnabled, fetchSnapshot, upsertContact, deleteContactRemote, upsertDeal, deleteDealRemote, upsertActivity, deleteActivityRemote, recordChange, upsertCompany, deleteCompanyRemote, upsertApprovalRequestRemote, resolveApprovalRemote } from './services/dataService';
import { SmartReportModal } from './components/SmartReportModal';
import { CompanyDetailDrawer } from './components/CompanyDetailDrawer';
import { Toast, ToastStack } from './components/ToastStack';
import { login as loginUser, signup as signupUser, loadSession, logout as logoutUser, listPendingSignups, approveSignup, rejectSignup, bootstrapAuthState } from './services/authService';
import { UserApprovalModal } from './components/UserApprovalModal';
import { AdminAuditPanel } from './components/AdminAuditPanel';
import { ContactBoard } from './components/ContactBoard';
import { DealPipeline } from './components/DealPipeline';
import { ImportModal } from './components/ImportModal';

const App: React.FC = () => {
  const CHANGE_LOG_RETENTION_DAYS = 365;
  const ACTIVITY_RETENTION_DAYS = 365;

  type FilterState = {
    search: string;
    statuses: CompanyStatus[];
    energies: string[];
    tags: string[];
    companyTypes: string[];
  };

  const defaultFilters: FilterState = {
    search: '',
    statuses: [],
    energies: [],
    tags: [],
    companyTypes: [],
  };

  const defaultViews: { id: string; name: string; filters: FilterState }[] = [
    {
      id: 'view-1',
      name: '핵심 + 에너지 A',
      filters: { ...defaultFilters, energies: ['A'], tags: ['핵심계정'] },
    }
  ];

  const UI_STORAGE_KEY = 'salesgrid-ui';

  const loadUiState = () => {
    if (typeof localStorage === 'undefined') return { filters: defaultFilters, savedViews: defaultViews, selectedCompanyIds: [] as string[] };
    try {
      const raw = localStorage.getItem(UI_STORAGE_KEY);
      if (!raw) return { filters: defaultFilters, savedViews: defaultViews, selectedCompanyIds: [] as string[] };
      const parsed = JSON.parse(raw) as { filters?: any; savedViews?: { id: string; name: string; filters: any }[]; selectedCompanyIds?: string[] };
      const migrateFilter = (f: any): FilterState => {
        if (!f) return defaultFilters;
        return {
          search: f.search || '',
          statuses: Array.isArray(f.statuses) ? f.statuses : (f.status && f.status !== 'ALL' ? [f.status] : []),
          energies: Array.isArray(f.energies) ? f.energies : (f.energy && f.energy !== 'ALL' ? [f.energy] : []),
          tags: Array.isArray(f.tags) ? f.tags : (f.tag && f.tag !== 'ALL' ? [f.tag] : []),
          companyTypes: Array.isArray(f.companyTypes) ? f.companyTypes : (f.companyType && f.companyType !== 'ALL' ? [f.companyType] : []),
        };
      };
      const migratedFilters = migrateFilter(parsed.filters);
      const migratedSavedViews = (parsed.savedViews && parsed.savedViews.length > 0)
        ? parsed.savedViews.map(v => ({ ...v, filters: migrateFilter(v.filters) }))
        : defaultViews;
      return {
        filters: migratedFilters,
        savedViews: migratedSavedViews,
        selectedCompanyIds: parsed.selectedCompanyIds || [],
      };
    } catch (err) {
      console.warn('UI 상태 로드 실패, 기본값 사용', err);
      return { filters: defaultFilters, savedViews: defaultViews, selectedCompanyIds: [] as string[] };
    }
  };

  const uiState = loadUiState();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<ViewMode>(ViewMode.GRID);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [changeLogs, setChangeLogs] = useState<ChangeLogEntry[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>(uiState.selectedCompanyIds);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | undefined>();
  const [authError, setAuthError] = useState<string | null>(null);
  const [pendingSignups, setPendingSignups] = useState<SignupRequest[]>([]);
  const [isUserApprovalOpen, setIsUserApprovalOpen] = useState(false);
  const [isAuditPanelOpen, setIsAuditPanelOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [xlsxModule, setXlsxModule] = useState<any>(null);
  const [filters, setFilters] = useState<FilterState>(uiState.filters);
  const [savedViews, setSavedViews] = useState<{ id: string; name: string; filters: FilterState }[]>(uiState.savedViews);

  useEffect(() => {
    bootstrapAuthState();
    const session = loadSession();
    if (session) {
      setCurrentUser(session);
      setIsAuthenticated(true);
    }
  }, []);

  const showToast = (message: string, type: Toast['type'] = 'info') => {
    setToasts(prev => [...prev, { id: crypto.randomUUID(), message, type }]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(UI_STORAGE_KEY, JSON.stringify({
        filters,
        savedViews,
        selectedCompanyIds,
      }));
    }
  }, [filters, savedViews, selectedCompanyIds]);

  useEffect(() => {
    if (currentUser && currentUser.role !== UserRole.SALES_REP) {
      listPendingSignups()
        .then(setPendingSignups)
        .catch(err => console.warn('승인 대기 목록 불러오기 실패', err));
    } else {
      setPendingSignups([]);
    }
  }, [currentUser]);

  const effectiveRole = currentUser?.role || UserRole.SALES_REP;
  const currentUserName = currentUser?.name || '사용자';
  const isSalesRep = effectiveRole === UserRole.SALES_REP;
  const canApprove = !isSalesRep;
  const canManage = !isSalesRep;
  const canViewSensitiveAudit = !isSalesRep;

  useEffect(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - CHANGE_LOG_RETENTION_DAYS);
    setChangeLogs(prev => {
      const filtered = prev.filter(log => new Date(log.changedAt) >= cutoff);
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [CHANGE_LOG_RETENTION_DAYS]);

  useEffect(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ACTIVITY_RETENTION_DAYS);
    setActivities(prev => {
      const filtered = prev.filter(a => new Date(a.occurredAt) >= cutoff);
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [ACTIVITY_RETENTION_DAYS]);

  const scopedCompanies = useMemo(() => {
    if (!isSalesRep) return companies;
    return companies.filter(c => c.owner === currentUserName || c.repName === currentUserName);
  }, [companies, currentUserName, isSalesRep]);

  const canViewSensitive = !isSalesRep || scopedCompanies.every(c => c.owner === currentUserName || c.repName === currentUserName);

  const maskSensitiveValue = (field: string, value?: string) => {
    if (!value) return value;
    const lower = field.toLowerCase();
    if (lower.includes('phone') || lower.includes('전화')) return '***-****';
    if (lower.includes('email') || lower.includes('이메일')) return '***@***';
    if (lower.includes('금액') || lower.includes('amount')) return '***';
    return value;
  };

  const normalizedChangeLogs = canViewSensitiveAudit
    ? changeLogs
    : changeLogs.map(log => ({
        ...log,
        oldValue: maskSensitiveValue(log.fieldName, log.oldValue),
        newValue: maskSensitiveValue(log.fieldName, log.newValue),
      }));

  const filterCompanies = (list: Company[]) => {
    const searchLower = filters.search.toLowerCase();
    return list.filter(c => {
      const matchesSearch = filters.search
        ? (
            c.name.toLowerCase().includes(searchLower) ||
            c.repName.toLowerCase().includes(searchLower) ||
            (c.notes || '').toLowerCase().includes(searchLower) ||
            (c.tags || []).some(tag => tag.toLowerCase().includes(searchLower)) ||
            contacts.some(ct => ct.companyId === c.id && (
              ct.name.toLowerCase().includes(searchLower) ||
              (ct.email || '').toLowerCase().includes(searchLower) ||
              (ct.phone || '').toLowerCase().includes(searchLower)
            ))
          )
        : true;
      const matchesStatus = filters.statuses.length === 0 || filters.statuses.includes(c.status);
      const matchesEnergy = filters.energies.length === 0 || (c.energyGrade && filters.energies.includes(c.energyGrade));
      const matchesCompanyType = filters.companyTypes.length === 0 || (c.companyType && filters.companyTypes.includes(c.companyType));
      const matchesTag = filters.tags.length === 0 || (c.tags || []).some(t => filters.tags.includes(t));
      return matchesSearch && matchesStatus && matchesEnergy && matchesCompanyType && matchesTag;
    });
  };

  const filteredCompanies = filterCompanies(scopedCompanies);
  const filteredDeals = deals.filter(d => {
    const companyOk = filteredCompanies.some(c => c.id === d.companyId);
    const stageOk = filters.statuses.length === 0 || filters.statuses.includes(d.stage as CompanyStatus);
    return companyOk && stageOk;
  });
  const filteredActivities = activities.filter(a => filteredCompanies.some(c => c.id === a.companyId));
  const filteredContacts = contacts.filter(ct => filteredCompanies.some(c => c.id === ct.companyId));

  const filteredChangeLogs = normalizedChangeLogs.filter(cl => {
    if (cl.entityType === 'Company') return filteredCompanies.some(c => c.id === cl.entityId);
    if (cl.entityType === 'Deal') {
      const targetDeal = filteredDeals.find(d => d.id === cl.entityId);
      return !!targetDeal;
    }
    if (cl.entityType === 'Contact') {
      const targetContact = contacts.find(ct => ct.id === cl.entityId);
      return targetContact ? filteredCompanies.some(c => c.id === targetContact.companyId) : false;
    }
    return false;
  });

  const pushChangeLog = (entry: Omit<ChangeLogEntry, 'id' | 'changedAt'> & { changedAt?: string }) => {
    const log: ChangeLogEntry = {
      id: crypto.randomUUID(),
      changedAt: entry.changedAt || new Date().toISOString(),
      ...entry,
    };
    setTimeout(() => {
      setChangeLogs(prev => [log, ...prev]);
      if (isApiEnabled) {
        recordChange(log).catch(err => console.warn('change-log 기록 실패', err));
      }
    }, 0); // mimic async ingestion to reduce UI blocking
    return log;
  };

  const revertChangeLogs = (logIds: string[]) => {
    if (logIds.length === 0) return;
    setChangeLogs(prev => prev.filter(log => !logIds.includes(log.id)));
  };

  const requestApproval = async (payload: Omit<ApprovalRequest, 'id' | 'requestedAt' | 'status'>) => {
    const req: ApprovalRequest = {
      id: crypto.randomUUID(),
      requestedAt: new Date().toISOString(),
      status: 'PENDING',
      ...payload,
    };
    setApprovals(prev => [req, ...prev]);
    const log = pushChangeLog({
      entityType: payload.entityType,
      entityId: payload.entityId,
      fieldName: payload.fieldName,
      oldValue: payload.oldValue,
      newValue: payload.newValue,
      changedBy: payload.requestedBy,
      changeType: ChangeType.APPROVAL,
      tracked: false,
      reason: '승인 요청',
    });
    showToast('승인 요청이 생성되었습니다.', 'info');
    if (isApiEnabled) {
      try {
        await upsertApprovalRequestRemote(req);
      } catch (err) {
        setApprovals(prev => prev.filter(a => a.id !== req.id));
        revertChangeLogs([log.id]);
        showToast(err instanceof Error ? err.message : '승인 요청 생성에 실패했습니다.', 'error');
      }
    }
  };

  // Simulate loading data or initializing demo mode
  useEffect(() => {
    const bootstrap = async () => {
    if (!isAuthenticated || companies.length > 0) return;
      if (isApiEnabled) {
        try {
          const snapshot = await fetchSnapshot();
          setCompanies(snapshot.companies);
          setContacts(snapshot.contacts);
          setDeals(snapshot.deals);
          setActivities(snapshot.activities);
          setChangeLogs(snapshot.changeLogs);
          return;
        } catch (err) {
          console.warn('API snapshot 실패, 모의 데이터로 초기화합니다.', err);
          showToast('서버 데이터를 불러오지 못해 모의 데이터를 사용합니다.', 'info');
        }
      }
      setCompanies(MOCK_COMPANIES);
      setContacts(MOCK_CONTACTS);
      setDeals(MOCK_DEALS);
      setActivities(MOCK_ACTIVITIES);
      setChangeLogs(MOCK_CHANGE_LOGS);
      setFilters(defaultFilters);
    };
    bootstrap();
  }, [isAuthenticated, companies.length]);

  const refreshPendingSignups = async () => {
    try {
      if (currentUser && currentUser.role !== UserRole.SALES_REP) {
        const list = await listPendingSignups();
        setPendingSignups(list);
      }
    } catch (err) {
      console.warn('승인 대기 목록 새로고침 실패', err);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      const user = await loginUser(email, password);
      setCurrentUser(user);
      setIsAuthenticated(true);
      setAuthError(null);
      setPendingEmail(undefined);
      showToast('로그인되었습니다.', 'success');
      refreshPendingSignups();
    } catch (err) {
      const message = err instanceof Error ? err.message : '로그인에 실패했습니다.';
      setAuthError(message);
      if (message.includes('승인')) {
        setPendingEmail(email);
      }
    }
  };

  const handleSignup = async (payload: { email: string; name: string; password: string; desiredRole: UserRole; reason?: string; }) => {
    try {
      const req = await signupUser(payload);
      setPendingEmail(req.email);
      setAuthError(null);
      showToast('가입 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.', 'info');
    } catch (err) {
      const message = err instanceof Error ? err.message : '가입 신청에 실패했습니다.';
      setAuthError(message);
    }
  };

  const handleDemoMode = () => {
    setCompanies(MOCK_COMPANIES);
    setContacts(MOCK_CONTACTS);
    setDeals(MOCK_DEALS);
    setActivities(MOCK_ACTIVITIES);
    setChangeLogs(MOCK_CHANGE_LOGS);
    setFilters(defaultFilters);
    setCurrentUser({
      id: 'demo-user',
      email: 'demo@salesgrid.com',
      name: '데모 사용자',
      role: UserRole.SALES_MANAGER,
      status: 'ACTIVE',
    });
    setPendingEmail(undefined);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    logoutUser().catch(err => console.warn('로그아웃 실패', err));
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCompanies([]);
    setContacts([]);
    setDeals([]);
    setActivities([]);
    setChangeLogs([]);
    setActiveCompanyId(null);
    setPendingSignups([]);
    setPendingEmail(undefined);
    setAuthError(null);
    setIsUserApprovalOpen(false);
  };

  const handleUpdateCompany = async (updatedCompany: Company) => {
    if (isSalesRep && updatedCompany.owner !== currentUserName && updatedCompany.repName !== currentUserName) {
      showToast('소유하지 않은 회사는 수정할 수 없습니다.', 'error');
      return;
    }
    const prevCompanies = companies;
    const old = companies.find(c => c.id === updatedCompany.id);
    const pushedLogIds: string[] = [];

    if (old) {
      const trackedFields: (keyof Company)[] = ['name', 'businessNumber', 'status', 'energyGrade', 'owner', 'repPhone', 'email', 'notes', 'lastContact'];
      trackedFields.forEach(field => {
        if (old[field] !== updatedCompany[field]) {
          const log = pushChangeLog({
            entityType: 'Company',
            entityId: updatedCompany.id,
            fieldName: field,
            oldValue: String(old[field] ?? ''),
            newValue: String(updatedCompany[field] ?? ''),
            changedBy: currentUserName,
            changeType: ChangeType.UPDATE,
            tracked: true,
          });
          pushedLogIds.push(log.id);
        }
      });
    }

    setCompanies(prev => prev.map(c => c.id === updatedCompany.id ? updatedCompany : c));
    if (isApiEnabled) {
      try {
        await upsertCompany(updatedCompany);
        showToast('회사가 저장되었습니다.', 'success');
      } catch (err) {
        setCompanies(prevCompanies);
        revertChangeLogs(pushedLogIds);
        showToast(err instanceof Error ? err.message : '회사 저장에 실패했습니다.', 'error');
      }
    }
  };

  const handleAddCompany = async () => {
    const newCompany: Company = {
      id: crypto.randomUUID(),
      name: '',
      repName: '',
      repPosition: '',
      repPhone: '',
      email: '',
      status: CompanyStatus.LEAD,
      lastContact: new Date().toISOString().split('T')[0],
      notes: '',
      owner: currentUserName,
    };
    const prevCompanies = companies;
    setCompanies([newCompany, ...companies]);
    const log = pushChangeLog({
      entityType: 'Company',
      entityId: newCompany.id,
      fieldName: '회사 생성',
      oldValue: '',
      newValue: newCompany.name || '(신규)',
      changedBy: currentUserName,
      changeType: ChangeType.CREATE,
      tracked: true,
    });
    if (isApiEnabled) {
      try {
        await upsertCompany(newCompany);
        showToast('회사가 추가되었습니다.', 'success');
      } catch (err) {
        setCompanies(prevCompanies);
        revertChangeLogs([log.id]);
        showToast(err instanceof Error ? err.message : '회사 추가에 실패했습니다.', 'error');
      }
    }
  };

  const handleDeleteCompany = async (id: string) => {
    const target = companies.find(c => c.id === id);
    if (isSalesRep && target && target.owner !== currentUserName && target.repName !== currentUserName) {
      showToast('소유하지 않은 회사는 삭제할 수 없습니다.', 'error');
      return;
    }
    if (!canManage && !isSalesRep) {
      showToast('삭제 권한이 없습니다. 관리자에게 문의하세요.', 'error');
      return;
    }
    if (!confirm('정말로 이 항목을 삭제하시겠습니까?')) return;
    const prevCompanies = companies;
    const removed = companies.find(c => c.id === id);
    setCompanies(prev => prev.filter(c => c.id !== id));
    setSelectedCompanyIds(prev => prev.filter(sid => sid !== id));
    if (activeCompanyId === id) {
      setActiveCompanyId(null);
    }
    const log = pushChangeLog({
      entityType: 'Company',
      entityId: id,
      fieldName: '회사 삭제',
      oldValue: removed?.name || '',
      newValue: '',
      changedBy: currentUserName,
      changeType: ChangeType.DELETE,
      tracked: true,
    });
    showToast('회사가 삭제되었습니다.', 'info');
    if (isApiEnabled) {
      try {
        await deleteCompanyRemote(id);
      } catch (err) {
        setCompanies(prevCompanies);
        revertChangeLogs([log.id]);
        showToast(err instanceof Error ? err.message : '회사 삭제에 실패했습니다.', 'error');
      }
    }
  };

  const handleCreateContact = async (companyId: string, payload: Omit<Contact, 'id' | 'companyId'>) => {
    const parent = companies.find(c => c.id === companyId);
    if (isSalesRep && parent && parent.owner !== currentUserName && parent.repName !== currentUserName) {
      showToast('소유하지 않은 회사의 연락처는 추가할 수 없습니다.', 'error');
      return;
    }
    const newContact: Contact = {
      id: crypto.randomUUID(),
      companyId,
      ...payload,
    };
    const prevContacts = contacts;
    setContacts(prev => [newContact, ...prev]);
    const log = pushChangeLog({
      entityType: 'Contact',
      entityId: newContact.id,
      fieldName: '연락처 생성',
      oldValue: '',
      newValue: newContact.name,
      changedBy: newContact.name || '시스템',
      changeType: ChangeType.CREATE,
      tracked: true,
    });
    showToast('연락처가 추가되었습니다.', 'success');
    if (isApiEnabled) {
      try {
        await upsertContact(newContact);
      } catch (err) {
        setContacts(prevContacts);
        revertChangeLogs([log.id]);
        showToast(err instanceof Error ? err.message : '연락처 추가에 실패했습니다.', 'error');
      }
    }
  };

  const handleUpdateContact = async (companyId: string, contactId: string, payload: Omit<Contact, 'id' | 'companyId'>) => {
    const parent = companies.find(c => c.id === companyId);
    if (isSalesRep && parent && parent.owner !== currentUserName && parent.repName !== currentUserName) {
      showToast('소유하지 않은 회사의 연락처는 수정할 수 없습니다.', 'error');
      return;
    }
    const prevContacts = contacts;
    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, ...payload } : c));
    const old = contacts.find(c => c.id === contactId);
    const log = pushChangeLog({
      entityType: 'Contact',
      entityId: contactId,
      fieldName: '연락처 수정',
      oldValue: old?.name || '',
      newValue: payload.name || old?.name || '',
      changedBy: payload.name || old?.name || '사용자',
      changeType: ChangeType.UPDATE,
      tracked: true,
    });
    showToast('연락처가 수정되었습니다.', 'success');
    if (isApiEnabled) {
      try {
        await upsertContact({ id: contactId, companyId, ...payload });
      } catch (err) {
        setContacts(prevContacts);
        revertChangeLogs([log.id]);
        showToast(err instanceof Error ? err.message : '연락처 수정에 실패했습니다.', 'error');
      }
    }
  };

  const handleDeleteContact = async (companyId: string, contactId: string) => {
    const parent = companies.find(c => c.id === companyId);
    if (isSalesRep && parent && parent.owner !== currentUserName && parent.repName !== currentUserName) {
      showToast('소유하지 않은 회사의 연락처는 삭제할 수 없습니다.', 'error');
      return;
    }
    if (!canManage && !isSalesRep) {
      showToast('삭제 권한이 없습니다. 관리자에게 문의하세요.', 'error');
      return;
    }
    const removed = contacts.find(c => c.id === contactId);
    const prevContacts = contacts;
    setContacts(prev => prev.filter(c => c.id !== contactId));
    const log = pushChangeLog({
      entityType: 'Contact',
      entityId: contactId,
      fieldName: '연락처 삭제',
      oldValue: removed?.name || '',
      newValue: '',
      changedBy: removed?.name || '사용자',
      changeType: ChangeType.DELETE,
      tracked: true,
    });
    showToast('연락처가 삭제되었습니다.', 'info');
    if (isApiEnabled) {
      try {
        await deleteContactRemote(contactId);
      } catch (err) {
        setContacts(prevContacts);
        revertChangeLogs([log.id]);
        showToast(err instanceof Error ? err.message : '연락처 삭제에 실패했습니다.', 'error');
      }
    }
  };

  const handleCreateDeal = async (companyId: string, payload: Omit<Deal, 'id' | 'companyId' | 'lastUpdated'>) => {
    const parent = companies.find(c => c.id === companyId);
    if (isSalesRep && parent && parent.owner !== currentUserName && parent.repName !== currentUserName) {
      showToast('소유하지 않은 회사의 Deal은 추가할 수 없습니다.', 'error');
      return;
    }
    const newDeal: Deal = {
      id: crypto.randomUUID(),
      companyId,
      lastUpdated: new Date().toISOString(),
      ...payload,
    };
    const prevDeals = deals;
    setDeals(prev => [newDeal, ...prev]);
    const log = pushChangeLog({
      entityType: 'Deal',
      entityId: newDeal.id,
      fieldName: '거래 생성',
      oldValue: '',
      newValue: newDeal.name,
      changedBy: newDeal.owner,
      changeType: ChangeType.CREATE,
      tracked: true,
    });
    showToast('거래가 추가되었습니다.', 'success');
    if (isApiEnabled) {
      try {
        await upsertDeal(newDeal);
      } catch (err) {
        setDeals(prevDeals);
        revertChangeLogs([log.id]);
        showToast(err instanceof Error ? err.message : '거래 추가에 실패했습니다.', 'error');
      }
    }
  };

  const handleUpdateDeal = async (companyId: string, dealId: string, payload: Partial<Omit<Deal, 'id' | 'companyId'>>) => {
    const old = deals.find(d => d.id === dealId);
    const updatedAt = new Date().toISOString();
    if (isSalesRep && old && old.owner !== currentUserName) {
      showToast('소유하지 않은 Deal은 수정할 수 없습니다.', 'error');
      return;
    }

    if (old && effectiveRole === UserRole.SALES_REP) {
      if (payload.stage && payload.stage !== old.stage) {
        await requestApproval({
          entityType: 'Deal',
          entityId: dealId,
          fieldName: '단계',
          oldValue: old.stage,
          newValue: payload.stage,
          requestedBy: currentUserName,
        });
      }
      if (payload.amount !== undefined && payload.amount !== old.amount) {
        await requestApproval({
          entityType: 'Deal',
          entityId: dealId,
          fieldName: '금액',
          oldValue: `${old.amount}`,
          newValue: `${payload.amount}`,
          requestedBy: currentUserName,
        });
      }
      return;
    }

    const prevDeals = deals;
    const pushedLogIds: string[] = [];

    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, ...payload, lastUpdated: updatedAt } : d));

    if (old) {
      if (payload.stage && payload.stage !== old.stage) {
        const log = pushChangeLog({
          entityType: 'Deal',
          entityId: dealId,
          fieldName: '단계',
          oldValue: old.stage,
          newValue: payload.stage,
          changedBy: payload.owner || old.owner,
          changeType: ChangeType.APPROVAL,
          tracked: true,
        });
        pushedLogIds.push(log.id);
      }
      if (payload.amount !== undefined && payload.amount !== old.amount) {
        const log = pushChangeLog({
          entityType: 'Deal',
          entityId: dealId,
          fieldName: '금액',
          oldValue: `${old.amount}`,
          newValue: `${payload.amount}`,
          changedBy: payload.owner || old.owner,
          changeType: ChangeType.UPDATE,
          tracked: true,
        });
        pushedLogIds.push(log.id);
      }
    }
    showToast('거래가 수정되었습니다.', 'success');
    if (isApiEnabled) {
      try {
        await upsertDeal({ ...(old || {}), ...payload, id: dealId, companyId, lastUpdated: updatedAt } as Deal);
      } catch (err) {
        setDeals(prevDeals);
        revertChangeLogs(pushedLogIds);
        showToast(err instanceof Error ? err.message : '거래 수정에 실패했습니다.', 'error');
      }
    }
  };

  const handleDeleteDeal = async (companyId: string, dealId: string) => {
    const old = deals.find(d => d.id === dealId);
    if (isSalesRep && old && old.owner !== currentUserName) {
      showToast('소유하지 않은 Deal은 삭제할 수 없습니다.', 'error');
      return;
    }
    if (!canManage && !isSalesRep) {
      showToast('삭제 권한이 없습니다. 관리자에게 문의하세요.', 'error');
      return;
    }
    const prevDeals = deals;
    setDeals(prev => prev.filter(d => d.id !== dealId));
    const log = pushChangeLog({
      entityType: 'Deal',
      entityId: dealId,
      fieldName: '거래 삭제',
      oldValue: old?.name || '',
      newValue: '',
      changedBy: old?.owner || '사용자',
      changeType: ChangeType.DELETE,
      tracked: true,
    });
    showToast('거래가 삭제되었습니다.', 'info');
    if (isApiEnabled) {
      try {
        await deleteDealRemote(dealId);
      } catch (err) {
        setDeals(prevDeals);
        revertChangeLogs([log.id]);
        showToast(err instanceof Error ? err.message : '거래 삭제에 실패했습니다.', 'error');
      }
    }
  };

  const handleCreateActivity = async (companyId: string, payload: Omit<Activity, 'id' | 'companyId'>) => {
    const parent = companies.find(c => c.id === companyId);
    if (isSalesRep && parent && parent.owner !== currentUserName && parent.repName !== currentUserName) {
      showToast('소유하지 않은 회사의 활동은 추가할 수 없습니다.', 'error');
      return;
    }
    const newActivity: Activity = {
      id: crypto.randomUUID(),
      companyId,
      ...payload,
    };
    const prevActivities = activities;
    setActivities(prev => [newActivity, ...prev]);
    const log = pushChangeLog({
      entityType: 'Company',
      entityId: companyId,
      fieldName: '활동 생성',
      oldValue: '',
      newValue: newActivity.summary,
      changedBy: newActivity.actor,
      changeType: ChangeType.CREATE,
      tracked: false,
    });
    showToast('활동이 추가되었습니다.', 'success');
    if (isApiEnabled) {
      try {
        await upsertActivity(newActivity);
      } catch (err) {
        setActivities(prevActivities);
        revertChangeLogs([log.id]);
        showToast(err instanceof Error ? err.message : '활동 추가에 실패했습니다.', 'error');
      }
    }
  };

  const handleUpdateActivity = async (companyId: string, activityId: string, payload: Partial<Omit<Activity, 'id' | 'companyId'>>) => {
    const parent = companies.find(c => c.id === companyId);
    if (isSalesRep && parent && parent.owner !== currentUserName && parent.repName !== currentUserName) {
      showToast('소유하지 않은 회사의 활동은 수정할 수 없습니다.', 'error');
      return;
    }
    const old = activities.find(a => a.id === activityId);
    const prevActivities = activities;
    setActivities(prev => prev.map(a => a.id === activityId ? { ...a, ...payload } : a));
    const log = pushChangeLog({
      entityType: 'Company',
      entityId: companyId,
      fieldName: '활동 수정',
      oldValue: old?.summary || '',
      newValue: payload.summary || old?.summary || '',
      changedBy: payload.actor || old?.actor || '사용자',
      changeType: ChangeType.UPDATE,
      tracked: false,
    });
    showToast('활동이 수정되었습니다.', 'success');
    if (isApiEnabled) {
      try {
        await upsertActivity({ ...(old || {}), ...payload, id: activityId, companyId } as Activity);
      } catch (err) {
        setActivities(prevActivities);
        revertChangeLogs([log.id]);
        showToast(err instanceof Error ? err.message : '활동 수정에 실패했습니다.', 'error');
      }
    }
  };

  const handleDeleteActivity = async (companyId: string, activityId: string) => {
    const parent = companies.find(c => c.id === companyId);
    if (isSalesRep && parent && parent.owner !== currentUserName && parent.repName !== currentUserName) {
      showToast('소유하지 않은 회사의 활동은 삭제할 수 없습니다.', 'error');
      return;
    }
    if (!canManage && !isSalesRep) {
      showToast('삭제 권한이 없습니다. 관리자에게 문의하세요.', 'error');
      return;
    }
    const old = activities.find(a => a.id === activityId);
    const prevActivities = activities;
    setActivities(prev => prev.filter(a => a.id !== activityId));
    const log = pushChangeLog({
      entityType: 'Company',
      entityId: companyId,
      fieldName: '활동 삭제',
      oldValue: old?.summary || '',
      newValue: '',
      changedBy: old?.actor || '사용자',
      changeType: ChangeType.DELETE,
      tracked: false,
    });
    showToast('활동이 삭제되었습니다.', 'info');
    if (isApiEnabled) {
      try {
        await deleteActivityRemote(activityId);
      } catch (err) {
        setActivities(prevActivities);
        revertChangeLogs([log.id]);
        showToast(err instanceof Error ? err.message : '활동 삭제에 실패했습니다.', 'error');
      }
    }
  };

  const handleRollbackChange = (log: ChangeLogEntry) => {
    if (isSalesRep) {
      showToast('롤백 권한이 없습니다.', 'error');
      return;
    }
    const normalize = (name: string) => name.toLowerCase().replace(/\s/g, '');
    const companyMap: Record<string, keyof Company> = {
      energygrade: 'energyGrade',
      '에너지등급': 'energyGrade',
      status: 'status',
      '상태': 'status',
      notes: 'notes',
      '메모': 'notes',
      owner: 'owner',
      '담당자': 'owner',
      repphone: 'repPhone',
      '전화번호': 'repPhone',
      email: 'email',
      '이메일': 'email',
      lastcontact: 'lastContact',
      '최근접촉일': 'lastContact',
    };
    const contactMap: Record<string, keyof Contact> = {
      phone: 'phone',
      '전화번호': 'phone',
      email: 'email',
      '이메일': 'email',
      name: 'name',
      '이름': 'name',
      title: 'title',
      '직함': 'title',
      department: 'department',
      '부서': 'department',
      role: 'role',
      '역할': 'role',
      lastinteraction: 'lastInteraction',
      '마지막상호작용': 'lastInteraction',
    };
    const dealMap: Record<string, keyof Deal> = {
      stage: 'stage',
      '단계': 'stage',
      amount: 'amount',
      '금액': 'amount',
      status: 'status',
      '상태': 'status',
      expectedclosedate: 'expectedCloseDate',
      '예상마감일': 'expectedCloseDate',
    };

    const keyFromLog = (entityType: ChangeLogEntry['entityType'], fieldName: string) => {
      const normalized = normalize(fieldName);
      if (entityType === 'Company') return companyMap[normalized];
      if (entityType === 'Contact') return contactMap[normalized];
      if (entityType === 'Deal') return dealMap[normalized];
      return undefined;
    };

    const fieldKey = keyFromLog(log.entityType, log.fieldName);
    if (!fieldKey) {
      showToast('롤백할 수 없는 필드입니다.', 'error');
      return;
    }

    const oldValue = log.oldValue ?? '';
    const rollbackedAt = new Date().toISOString();

    if (log.entityType === 'Company') {
      setCompanies(prev => prev.map(c => c.id === log.entityId ? { ...c, [fieldKey]: oldValue } : c));
    } else if (log.entityType === 'Contact') {
      setContacts(prev => prev.map(ct => ct.id === log.entityId ? { ...ct, [fieldKey]: oldValue } : ct));
    } else if (log.entityType === 'Deal') {
      setDeals(prev => prev.map(d => d.id === log.entityId ? { ...d, [fieldKey]: fieldKey === 'amount' ? Number(oldValue) || 0 : oldValue, lastUpdated: rollbackedAt } : d));
    }

    pushChangeLog({
      entityType: log.entityType,
      entityId: log.entityId,
      fieldName: `${log.fieldName} 롤백`,
      oldValue: log.newValue,
      newValue: log.oldValue,
      changedBy: currentUserName,
      changedAt: rollbackedAt,
      changeType: ChangeType.UPDATE,
      tracked: true,
      reason: '롤백',
    });
    showToast('필드 값이 롤백되었습니다.', 'success');
  };

  const handleResolveApproval = async (approvalId: string, approve: boolean) => {
    const target = approvals.find(a => a.id === approvalId);
    if (!target) return;

    const prevApprovals = approvals;
    const updated: ApprovalRequest = {
      ...target,
      status: approve ? 'APPROVED' : 'REJECTED',
      approvedBy: currentUserName,
      resolvedAt: new Date().toISOString(),
    };
    setApprovals(prev => prev.map(a => a.id === approvalId ? updated : a));

    if (isApiEnabled) {
      try {
        await resolveApprovalRemote(approvalId, updated.status, updated.approvedBy);
      } catch (err) {
        setApprovals(prevApprovals);
        showToast(err instanceof Error ? err.message : '승인 처리에 실패했습니다.', 'error');
        return;
      }
    }

    pushChangeLog({
      entityType: target.entityType,
      entityId: target.entityId,
      fieldName: target.fieldName,
      oldValue: target.oldValue,
      newValue: target.newValue,
      changedBy: currentUserName,
      changeType: ChangeType.APPROVAL,
      tracked: true,
      reason: approve ? '승인' : '반려',
    });

    if (approve && target.entityType === 'Deal') {
      const deal = deals.find(d => d.id === target.entityId);
      if (deal) {
        if (target.fieldName === '단계') {
          await handleUpdateDeal(deal.companyId, deal.id, { stage: target.newValue as DealStage });
        }
        if (target.fieldName === '금액') {
          const amount = parseInt(target.newValue, 10);
          if (!Number.isNaN(amount)) {
            await handleUpdateDeal(deal.companyId, deal.id, { amount });
          }
        }
      }
    }

    showToast(approve ? '승인되었습니다.' : '반려되었습니다.', approve ? 'success' : 'info');
  };

  const handleApproveSignup = async (id: string, role: UserRole) => {
    try {
      const user = await approveSignup(id, role);
      showToast(`${user.name}님이 승인되었습니다. 로그인 안내를 전달하세요.`, 'success');
      refreshPendingSignups();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '승인 처리에 실패했습니다.', 'error');
    }
  };

  const handleRejectSignup = async (id: string) => {
    try {
      await rejectSignup(id);
      showToast('가입 신청이 반려되었습니다.', 'info');
      refreshPendingSignups();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '반려 처리에 실패했습니다.', 'error');
    }
  };

  const handleGenerateReport = () => {
    if (selectedCompanyIds.length === 0) {
        alert("보고서를 생성할 회사를 최소 하나 이상 선택해주세요.");
        return;
    }
    setIsReportModalOpen(true);
  };

  const handleExportSelected = () => {
    const exportTargets = companies.filter(c => selectedCompanyIds.includes(c.id));
    if (exportTargets.length === 0) {
      alert('엑셀로 내보낼 회사를 선택하세요.');
      return;
    }

    const exportNow = async () => {
      let xlsx = xlsxModule;
      if (!xlsx) {
        try {
          xlsx = await import('https://cdn.sheetjs.com/xlsx-latest/package/xlsx.mjs');
          setXlsxModule(xlsx);
        } catch (err) {
          console.warn('xlsx 모듈 로드 실패', err);
          showToast('엑셀 모듈을 불러오지 못했습니다. 네트워크를 확인하거나 npm install xlsx 후 다시 시도하세요.', 'error');
          return;
        }
      }

      const rows = exportTargets.map(c => ({
        고객사명: c.name,
        기업유형: c.companyType || '',
        에너지등급: c.energyGrade || '',
        상태: c.status,
        담당자: c.owner || c.repName,
        담당자연락처: c.repPhone,
        담당자이메일: c.email,
        최근접촉일: c.lastContact,
        리드소스: c.leadSource || '',
        태그: (c.tags || []).join(', '),
        메모: c.notes,
      }));

      const ws = xlsx.utils.json_to_sheet(rows);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Companies');
      const filename = `salesgrid_companies_${new Date().toISOString().slice(0,10)}.xlsx`;
      xlsx.writeFile(wb, filename);
      showToast(`${exportTargets.length}개 회사를 엑셀로 저장했습니다.`, 'success');
    };

    exportNow();
  };

  const handleOpenImport = () => {
    if (!canManage) {
      showToast('업로드 권한이 없습니다. 관리자에게 문의하세요.', 'error');
      return;
    }
    setIsImportModalOpen(true);
  };

  const normalizeStatus = (value?: string): CompanyStatus => {
    const normalizedValue = value?.toString().trim() || '';
    const key = normalizedValue.toLowerCase();
    const map: Record<string, CompanyStatus> = {
      '잠재고객': CompanyStatus.LEAD,
      'lead': CompanyStatus.LEAD,
      '리드': CompanyStatus.LEAD,
      '접촉/발굴': CompanyStatus.EVALUATION,
      'contact': CompanyStatus.EVALUATION,
      '평가': CompanyStatus.EVALUATION,
      'evaluation': CompanyStatus.EVALUATION,
      '미팅': CompanyStatus.EVALUATION,
      'meeting': CompanyStatus.EVALUATION,
      '제안': CompanyStatus.PROPOSAL,
      'proposal': CompanyStatus.PROPOSAL,
      '협상': CompanyStatus.NEGOTIATION,
      'negotiation': CompanyStatus.NEGOTIATION,
      '계약': CompanyStatus.CONTRACT,
      'contract': CompanyStatus.CONTRACT,
      '계약 체결': CompanyStatus.CONTRACT,
      '실주/종료': CompanyStatus.LOST,
      '실주·종료': CompanyStatus.LOST,
      'drop': CompanyStatus.LOST,
      'lost': CompanyStatus.LOST,
    };
    if (!normalizedValue) return CompanyStatus.LEAD;
    return map[normalizedValue] || map[key] || CompanyStatus.LEAD;
  };

  const applyImportedCompanies = (items: { targetId?: string; data: Partial<Company> & { name: string } }[]) => {
    const created: Company[] = [];
    const mergedIds: string[] = [];
    const now = new Date().toISOString();
    setCompanies(prev => {
      let next = [...prev];
      items.forEach(item => {
        const base: Company = {
          id: crypto.randomUUID(),
          name: item.data.name,
          businessNumber: item.data.businessNumber,
          repName: item.data.repName || '',
          repPosition: item.data.repPosition || '',
          repPhone: item.data.repPhone || '',
          email: item.data.email || '',
          status: normalizeStatus(item.data.status as string),
          lastContact: item.data.lastContact || new Date().toISOString().split('T')[0],
          notes: item.data.notes || '',
          owner: item.data.owner || currentUserName,
        };
        if (item.targetId) {
          const old = next.find(c => c.id === item.targetId);
          if (!old) return;
          const updated = { ...old, ...item.data, status: normalizeStatus(item.data.status as string) };
          next = next.map(c => c.id === item.targetId ? updated : c);
          mergedIds.push(item.targetId);
          Object.keys(item.data).forEach(field => {
            const key = field as keyof Company;
            if (old[key] !== updated[key]) {
              pushChangeLog({
                entityType: 'Company',
                entityId: updated.id,
                fieldName: `업로드:${field}`,
                oldValue: String(old[key] ?? ''),
                newValue: String(updated[key] ?? ''),
                changedBy: currentUserName,
                changeType: ChangeType.UPDATE,
                changedAt: now,
                reason: '일괄 업로드 병합',
              });
            }
          });
        } else {
          created.push(base);
          next = [base, ...next];
          pushChangeLog({
            entityType: 'Company',
            entityId: base.id,
            fieldName: '일괄 업로드',
            oldValue: '',
            newValue: base.name,
            changedBy: currentUserName,
            changeType: ChangeType.CREATE,
            changedAt: now,
            reason: '일괄 업로드 생성',
          });
        }
      });
      return next;
    });
    if (items.length > 0) {
      showToast(`${created.length}건 추가, ${mergedIds.length}건 병합 완료`, 'success');
    }
  };

  const applyImportedContacts = (items: { targetId?: string; data: Partial<Contact> & { name: string; companyName?: string } }[]) => {
    const created: Contact[] = [];
    const mergedIds: string[] = [];
    const now = new Date().toISOString();
    setContacts(prev => {
      let next = [...prev];
      items.forEach(item => {
        const company = companies.find(c => c.name === item.data.companyName);
        if (!company) {
          showToast?.(`회사 매칭 실패: ${item.data.name}`, 'error');
          return;
        }
        const base: Contact = {
          id: crypto.randomUUID(),
          companyId: company.id,
          name: item.data.name,
          email: item.data.email || '',
          phone: item.data.phone || '',
          title: item.data.title || '',
          department: item.data.department || '',
          role: item.data.role || 'Champion',
          lastInteraction: item.data.lastInteraction || new Date().toISOString().split('T')[0],
          type: item.data.type,
        };
        if (item.targetId) {
          const old = next.find(c => c.id === item.targetId);
          if (!old) return;
          const updated = { ...old, ...base, id: old.id, companyId: company.id };
          next = next.map(c => c.id === item.targetId ? updated : c);
          mergedIds.push(item.targetId);
          Object.keys(base).forEach(field => {
            const key = field as keyof Contact;
            if (old[key] !== updated[key]) {
              pushChangeLog({
                entityType: 'Contact',
                entityId: updated.id,
                fieldName: `업로드:${field}`,
                oldValue: String(old[key] ?? ''),
                newValue: String(updated[key] ?? ''),
                changedBy: currentUserName,
                changeType: ChangeType.UPDATE,
                changedAt: now,
                reason: '일괄 업로드 병합',
              });
            }
          });
        } else {
          created.push(base);
          next = [base, ...next];
          pushChangeLog({
            entityType: 'Contact',
            entityId: base.id,
            fieldName: '일괄 업로드',
            oldValue: '',
            newValue: base.name,
            changedBy: currentUserName,
            changeType: ChangeType.CREATE,
            changedAt: now,
            reason: '일괄 업로드 생성',
          });
        }
      });
      return next;
    });
    if (items.length > 0) {
      showToast(`${created.length}건 추가, ${mergedIds.length}건 병합 완료`, 'success');
    }
  };

  if (!isAuthenticated) {
    return (
      <AuthScreen 
        onLogin={handleLogin} 
        onSignup={handleSignup} 
        onDemo={handleDemoMode} 
        pendingEmail={pendingEmail} 
        errorMessage={authError}
      />
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans">
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        onLogout={handleLogout} 
      />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 z-20">
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">
            {currentView === ViewMode.GRID && '영업 DB 관리'}
            {currentView === ViewMode.DASHBOARD && '대시보드'}
            {currentView === ViewMode.CONTACTS && '연락처 관리'}
            {currentView === ViewMode.PIPELINE && 'Deal 파이프라인'}
          </h1>
          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-600">
              <span className="font-semibold">{currentUserName}</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">{effectiveRole}</span>
            </div>
            {canApprove && (
              <button
                onClick={() => setIsUserApprovalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors border border-emerald-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                가입 승인
                {pendingSignups.length > 0 && <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-xs">{pendingSignups.length}</span>}
              </button>
            )}
            {canApprove && (
              <button
                onClick={() => setIsAuditPanelOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors border border-slate-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4h18"></path><path d="M3 12h18"></path><path d="M3 20h18"></path></svg>
                감사 로그
              </button>
            )}
             <button 
                onClick={handleGenerateReport}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors border border-indigo-100"
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                AI 주간 업무 보고
             </button>
            <div className="text-xs text-slate-400">Powered by SalesGrid</div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative">
          {currentView === ViewMode.GRID ? (
            <SalesGrid
              data={filteredCompanies}
              onUpdate={handleUpdateCompany}
              onAdd={handleAddCompany}
              onDelete={handleDeleteCompany}
              onOpenDetail={setActiveCompanyId}
              showToast={showToast}
              canViewSensitive={canViewSensitive}
              selectedIds={selectedCompanyIds}
              setSelectedIds={setSelectedCompanyIds}
              filters={filters}
              onFiltersChange={setFilters}
              filterOptions={{
                companyTypes: Array.from(new Set(companies.map(c => c.companyType).filter(Boolean))) as string[],
                tags: Array.from(new Set(companies.flatMap(c => c.tags || []))),
                statuses: Object.values(CompanyStatus),
              }}
              savedViews={savedViews}
              onSaveView={(name) => setSavedViews(prev => [...prev, { id: crypto.randomUUID(), name, filters }])}
              onApplyView={(id) => {
                const view = savedViews.find(v => v.id === id);
                if (view) setFilters(view.filters);
              }}
              onDeleteView={(id) => setSavedViews(prev => prev.filter(v => v.id !== id))}
              onExportSelected={handleExportSelected}
              onImport={handleOpenImport}
              canManage={canManage}
            />
          ) : currentView === ViewMode.DASHBOARD ? (
            <Dashboard 
              companies={filteredCompanies} 
              deals={filteredDeals} 
              activities={filteredActivities} 
              changeLogs={filteredChangeLogs} 
            />
          ) : currentView === ViewMode.CONTACTS ? (
            <ContactBoard 
              contacts={filteredContacts}
              companies={filteredCompanies}
              onOpenCompany={setActiveCompanyId}
              canViewSensitive={canViewSensitive}
            />
          ) : (
            <DealPipeline 
              deals={filteredDeals}
              companies={filteredCompanies}
              contacts={filteredContacts}
              onUpdateStage={(dealId, stage) => {
                const target = deals.find(d => d.id === dealId);
                if (target) {
                  handleUpdateDeal(target.companyId, dealId, { stage });
                }
              }}
              onOpenCompany={setActiveCompanyId}
              canViewSensitive={canViewSensitive}
            />
          )}
        </div>
      </main>

      {isReportModalOpen && (
        <SmartReportModal 
            isOpen={isReportModalOpen} 
            onClose={() => setIsReportModalOpen(false)}
            companies={companies.filter(c => selectedCompanyIds.includes(c.id))}
            deals={deals.filter(d => selectedCompanyIds.includes(d.companyId))}
            activities={activities.filter(a => selectedCompanyIds.includes(a.companyId))}
            changeLogs={changeLogs.filter(cl => selectedCompanyIds.includes(cl.entityId))}
        />
      )}

      {isUserApprovalOpen && canApprove && (
        <UserApprovalModal
          open={isUserApprovalOpen}
          onClose={() => setIsUserApprovalOpen(false)}
          pending={pendingSignups}
          onApprove={handleApproveSignup}
          onReject={handleRejectSignup}
        />
      )}

      {isAuditPanelOpen && canApprove && (
        <AdminAuditPanel
          open={isAuditPanelOpen}
          onClose={() => setIsAuditPanelOpen(false)}
          changeLogs={normalizedChangeLogs}
          approvals={approvals}
          canApprove={canApprove}
          onResolveApproval={handleResolveApproval}
        />
      )}

      {isImportModalOpen && (
        <ImportModal
          open={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          companies={companies}
          contacts={contacts}
          canManage={canManage}
          onImportCompanies={applyImportedCompanies}
          onImportContacts={applyImportedContacts}
          showToast={showToast}
        />
      )}

      {activeCompanyId && (
        <CompanyDetailDrawer 
          company={companies.find(c => c.id === activeCompanyId)}
          contacts={contacts}
          deals={deals}
          activities={activities}
          changeLogs={changeLogs}
          approvals={approvals}
          onCreateContact={handleCreateContact}
          onUpdateContact={handleUpdateContact}
          onDeleteContact={handleDeleteContact}
          onCreateDeal={handleCreateDeal}
          onUpdateDeal={handleUpdateDeal}
          onDeleteDeal={handleDeleteDeal}
          onCreateActivity={handleCreateActivity}
          onUpdateActivity={handleUpdateActivity}
          onDeleteActivity={handleDeleteActivity}
          onRollbackChange={handleRollbackChange}
          canViewSensitive={canViewSensitive}
          canApprove={canApprove}
          onResolveApproval={handleResolveApproval}
          showToast={showToast}
          canManage={canManage}
          onClose={() => setActiveCompanyId(null)}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default App;
