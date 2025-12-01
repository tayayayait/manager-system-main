import { apiRequest, isApiEnabled } from './apiClient';
import { AuthUser, SignupRequest, UserRole } from '../types';

type StoredUser = AuthUser & { password: string };

interface AuthState {
  users: StoredUser[];
  pending: SignupRequest[];
  sessionUserId?: string;
}

const STORAGE_KEY = 'salesgrid-auth-state';

const defaultState: AuthState = {
  users: [
    {
      id: 'user-admin',
      email: 'admin@salesgrid.com',
      name: '시스템 관리자',
      role: UserRole.SYSTEM_ADMIN,
      status: 'ACTIVE',
      password: 'admin123',
    },
    {
      id: 'user-manager',
      email: 'manager@salesgrid.com',
      name: '영업 관리자',
      role: UserRole.SALES_MANAGER,
      status: 'ACTIVE',
      password: 'manager123',
    },
  ],
  pending: [],
};

const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const readState = (): AuthState => {
  if (!isBrowser) return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
      return defaultState;
    }
    const parsed = JSON.parse(raw) as AuthState;
    // Ensure at least the default admin exists
    if (!parsed.users?.length) {
      parsed.users = defaultState.users;
    }
    return parsed;
  } catch (err) {
    console.warn('auth state 파싱 실패, 기본값으로 초기화합니다.', err);
    if (isBrowser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
    }
    return defaultState;
  }
};

const writeState = (state: AuthState) => {
  if (!isBrowser) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const bootstrapAuthState = () => {
  if (!isBrowser) return;
  if (!localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
  }
};

export const loadSession = (): AuthUser | null => {
  const state = readState();
  const user = state.users.find(u => u.id === state.sessionUserId);
  return user ? stripPassword(user) : null;
};

export const logout = async () => {
  if (isApiEnabled) {
    try {
      await apiRequest<void>('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn('원격 로그아웃 실패', err);
    }
  }
  const state = readState();
  delete state.sessionUserId;
  writeState(state);
};

export const login = async (email: string, password: string): Promise<AuthUser> => {
  if (isApiEnabled) {
    return apiRequest<AuthUser>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  }
  const state = readState();
  const user = state.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    throw new Error('존재하지 않는 사용자입니다.');
  }
  if (user.password !== password) {
    throw new Error('비밀번호가 올바르지 않습니다.');
  }
  if (user.status !== 'ACTIVE') {
    throw new Error('관리자 승인이 필요합니다.');
  }
  state.sessionUserId = user.id;
  writeState(state);
  return stripPassword(user);
};

export const signup = async (payload: { email: string; name: string; password: string; desiredRole?: UserRole; reason?: string; }): Promise<SignupRequest> => {
  const desiredRole = payload.desiredRole || UserRole.SALES_REP;
  if (isApiEnabled) {
    return apiRequest<SignupRequest>('/auth/signup', { method: 'POST', body: JSON.stringify({ ...payload, desiredRole }) });
  }
  const state = readState();
  const exists = state.users.find(u => u.email.toLowerCase() === payload.email.toLowerCase()) ||
    state.pending.find(p => p.email.toLowerCase() === payload.email.toLowerCase());
  if (exists) {
    throw new Error('이미 등록된 이메일입니다.');
  }
  const request: SignupRequest = {
    id: crypto.randomUUID(),
    email: payload.email,
    name: payload.name,
    desiredRole,
    reason: payload.reason,
    requestedAt: new Date().toISOString(),
    status: 'PENDING',
    password: payload.password,
  };
  state.pending = [request, ...state.pending];
  writeState(state);
  return sanitizeSignup(request);
};

export const listPendingSignups = async (): Promise<SignupRequest[]> => {
  if (isApiEnabled) {
    return apiRequest<SignupRequest[]>('/auth/pending', { method: 'GET' });
  }
  const state = readState();
  return state.pending.filter(p => p.status === 'PENDING').map(sanitizeSignup);
};

export const approveSignup = async (id: string, role: UserRole): Promise<AuthUser> => {
  if (isApiEnabled) {
    return apiRequest<AuthUser>(`/auth/pending/${id}/approve`, { method: 'POST', body: JSON.stringify({ role }) });
  }
  const state = readState();
  const requestIndex = state.pending.findIndex(p => p.id === id);
  if (requestIndex === -1) {
    throw new Error('요청을 찾을 수 없습니다.');
  }
  const req = state.pending[requestIndex];
  const password = req.password || generateTempPassword();
  const newUser: StoredUser = {
    id: crypto.randomUUID(),
    email: req.email,
    name: req.name,
    role,
    status: 'ACTIVE',
    password,
  };
  state.pending.splice(requestIndex, 1);
  state.users.push(newUser);
  writeState(state);
  return stripPassword(newUser);
};

export const rejectSignup = async (id: string): Promise<void> => {
  if (isApiEnabled) {
    await apiRequest<void>(`/auth/pending/${id}/reject`, { method: 'POST' });
    return;
  }
  const state = readState();
  state.pending = state.pending.map(p => p.id === id ? { ...p, status: 'REJECTED' } : p);
  writeState(state);
};

const sanitizeSignup = (request: SignupRequest): SignupRequest => {
  const { password, ...rest } = request as SignupRequest & { password?: string };
  return rest;
};

const stripPassword = (user: StoredUser): AuthUser => {
  const { password, ...rest } = user;
  return rest;
};

const generateTempPassword = () => {
  return Math.random().toString(36).slice(2, 8);
};
