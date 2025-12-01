import { apiRequest, isApiEnabled } from './apiClient';

export type WebhookEvent =
  | 'company.created'
  | 'company.updated'
  | 'contact.created'
  | 'contact.updated'
  | 'deal.created'
  | 'deal.updated'
  | 'change.logged';

export interface WebhookConfig {
  id?: string;
  url: string;
  secret?: string;
  events: WebhookEvent[];
  active: boolean;
}

export interface ImportSyncPayload {
  source: 'upload' | 'webhook' | 'api';
  records: number;
  conflicts: number;
  processedAt: string;
}

export const upsertWebhook = async (config: WebhookConfig) => {
  if (!isApiEnabled) {
    console.info('[webhook] skipped (api disabled)', config);
    return config;
  }
  return apiRequest<WebhookConfig>('/integrations/webhooks', { method: 'POST', body: JSON.stringify(config) });
};

export const testWebhook = async (url: string, secret?: string) => {
  if (!isApiEnabled) {
    console.info('[webhook-test] skipped (api disabled)', url);
    return { ok: true };
  }
  return apiRequest<{ ok: boolean; status: number }>('/integrations/webhooks/test', {
    method: 'POST',
    body: JSON.stringify({ url, secret }),
  });
};

export const publishImportSummary = async (payload: ImportSyncPayload) => {
  if (!isApiEnabled) {
    console.info('[import-summary] skipped (api disabled)', payload);
    return;
  }
  return apiRequest<void>('/integrations/imports/summary', { method: 'POST', body: JSON.stringify(payload) });
};
