export enum DealStage {
  LEAD = '리드',
  EVALUATION = '평가',
  PROPOSAL = '제안',
  NEGOTIATION = '협상',
  CONTRACT = '계약 체결',
  LOST = '실주·종료'
}

export enum CompanyStatus {
  LEAD = DealStage.LEAD,
  EVALUATION = DealStage.EVALUATION,
  PROPOSAL = DealStage.PROPOSAL,
  NEGOTIATION = DealStage.NEGOTIATION,
  CONTRACT = DealStage.CONTRACT,
  LOST = DealStage.LOST
}

export interface Company {
  id: string;
  name: string;
  businessNumber?: string;
  industry?: string;
  companyType?: string;
  employeeCount?: number;
  revenueScale?: string;
  energyGrade?: string;
  city?: string;
  country?: string;
  createdAt?: string;
  owner?: string;
  leadSource?: string;
  tags?: string[];
  score?: number;
  repName: string;
  repPosition: string;
  repPhone: string;
  email: string;
  status: CompanyStatus;
  lastContact: string; // ISO Date string YYYY-MM-DD
  notes: string;
}

export enum ViewMode {
  GRID = 'GRID',
  DASHBOARD = 'DASHBOARD',
  CONTACTS = 'CONTACTS',
  PIPELINE = 'PIPELINE'
}

export interface Deal {
  id: string;
  companyId: string;
  contactId?: string;
  name: string;
  stage: DealStage;
  amount: number;
  expectedCloseDate: string;
  status: '진행' | '성공' | '실패';
  owner: string;
  lastUpdated: string;
}

export interface Contact {
  id: string;
  companyId: string;
  name: string;
  title: string;
  department?: string;
  email: string;
  phone: string;
  role: string;
  lastInteraction?: string;
  type?: string;
}

export enum ActivityType {
  CALL = '통화',
  EMAIL = '이메일',
  MEETING = '회의',
  VISIT = '방문',
  DEMO = '데모'
}

export interface Activity {
  id: string;
  companyId: string;
  contactId?: string;
  dealId?: string;
  type: ActivityType;
  summary: string;
  actor: string;
  occurredAt: string; // ISO
  nextStep?: string;
}

export type EntityType = 'Company' | 'Contact' | 'Deal';

export enum ChangeType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVAL = 'APPROVAL'
}

export interface FieldTrackingPolicy {
  id: string;
  entityType: EntityType;
  fieldName: string;
  isTracked: boolean;
  retentionDays: number;
  maxLength: number; // typically 255
  excludeLongText?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChangeLogEntry {
  id: string;
  entityType: EntityType;
  entityId: string;
  fieldName: string;
  oldValue?: string;
  newValue?: string;
  oldValueLength?: number;
  newValueLength?: number;
  oldValueTruncated?: boolean;
  newValueTruncated?: boolean;
  changedBy: string;
  changedAt: string; // ISO datetime
  changeType: ChangeType;
  reason?: string;
  tracked?: boolean;
  latencyMinutes?: number;
  retentionUntil?: string;
  policyId?: string;
}

export enum UserRole {
  SALES_REP = '영업대표',
  SALES_MANAGER = '영업관리자',
  SYSTEM_ADMIN = '시스템관리자'
}

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ApprovalRequest {
  id: string;
  entityType: EntityType;
  entityId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  requestedBy: string;
  requestedAt: string;
  status: ApprovalStatus;
  approvedBy?: string;
  resolvedAt?: string;
  notes?: string;
}

export type UserStatus = 'ACTIVE' | 'PENDING' | 'REJECTED';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: Extract<UserStatus, 'ACTIVE'>;
}

export interface SignupRequest {
  id: string;
  email: string;
  name: string;
  desiredRole: UserRole;
  reason?: string;
  requestedAt: string;
  status: Exclude<UserStatus, 'ACTIVE'>;
  password?: string;
}
