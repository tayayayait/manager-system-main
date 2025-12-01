import { apiRequest, isApiEnabled } from './apiClient';
import { Activity, ApprovalRequest, ChangeLogEntry, Company, Contact, Deal } from '../types';

export interface SnapshotResponse {
  companies: Company[];
  contacts: Contact[];
  deals: Deal[];
  activities: Activity[];
  changeLogs: ChangeLogEntry[];
}

export const fetchSnapshot = async (): Promise<SnapshotResponse> => {
  return apiRequest<SnapshotResponse>('/crm/snapshot', { method: 'GET' });
};

export const upsertCompany = async (company: Company) => {
  return apiRequest<Company>('/crm/companies', { method: 'POST', body: JSON.stringify(company) });
};

export const deleteCompanyRemote = async (companyId: string) => {
  return apiRequest<void>(`/crm/companies/${companyId}`, { method: 'DELETE' });
};

export const upsertContact = async (contact: Contact) => {
  return apiRequest<Contact>('/crm/contacts', { method: 'POST', body: JSON.stringify(contact) });
};

export const deleteContactRemote = async (contactId: string) => {
  return apiRequest<void>(`/crm/contacts/${contactId}`, { method: 'DELETE' });
};

export const upsertDeal = async (deal: Deal) => {
  return apiRequest<Deal>('/crm/deals', { method: 'POST', body: JSON.stringify(deal) });
};

export const deleteDealRemote = async (dealId: string) => {
  return apiRequest<void>(`/crm/deals/${dealId}`, { method: 'DELETE' });
};

export const upsertActivity = async (activity: Activity) => {
  return apiRequest<Activity>('/crm/activities', { method: 'POST', body: JSON.stringify(activity) });
};

export const deleteActivityRemote = async (activityId: string) => {
  return apiRequest<void>(`/crm/activities/${activityId}`, { method: 'DELETE' });
};

export const recordChange = async (log: ChangeLogEntry) => {
  return apiRequest<ChangeLogEntry>('/crm/change-logs', { method: 'POST', body: JSON.stringify(log) });
};

export const upsertApprovalRequestRemote = async (approval: ApprovalRequest) => {
  return apiRequest<ApprovalRequest>('/crm/approvals', { method: 'POST', body: JSON.stringify(approval) });
};

export const resolveApprovalRemote = async (id: string, status: ApprovalRequest['status'], approvedBy?: string, notes?: string) => {
  return apiRequest<ApprovalRequest>(`/crm/approvals/${id}/resolve`, { method: 'POST', body: JSON.stringify({ status, approvedBy, notes }) });
};

export { isApiEnabled };
