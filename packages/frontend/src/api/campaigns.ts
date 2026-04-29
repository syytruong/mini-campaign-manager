import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiRequest } from './client';
import type {
  Campaign,
  CampaignDetail,
  CampaignStats,
  CampaignStatus,
  Paginated,
} from '../types';

export interface ListCampaignsParams {
  limit: number;
  offset: number;
  status?: CampaignStatus;
}

export interface AddRecipientsResult {
  added: number;
  skipped: number;
  total: number;
}

export const campaignsApi = {
  list: (params: ListCampaignsParams) =>
    apiRequest<Paginated<Campaign>>('/campaigns', {
      query: {
        limit: params.limit,
        offset: params.offset,
        status: params.status,
      },
    }),

  get: (id: string) => apiRequest<CampaignDetail>(`/campaigns/${id}`),

  stats: (id: string) => apiRequest<CampaignStats>(`/campaigns/${id}/stats`),

  create: (payload: {
    name: string;
    subject: string;
    body: string;
    recipientEmails?: string[];
  }) =>
    apiRequest<Campaign>('/campaigns', {
      method: 'POST',
      body: payload,
    }),

  update: (
    id: string,
    payload: { name?: string; subject?: string; body?: string },
  ) =>
    apiRequest<Campaign>(`/campaigns/${id}`, {
      method: 'PATCH',
      body: payload,
    }),

  remove: (id: string) =>
    apiRequest<void>(`/campaigns/${id}`, {
      method: 'DELETE',
    }),

  schedule: (id: string, scheduledAt: string) =>
    apiRequest<Campaign>(`/campaigns/${id}/schedule`, {
      method: 'POST',
      body: { scheduledAt },
    }),

  send: (id: string) =>
    apiRequest<Campaign>(`/campaigns/${id}/send`, {
      method: 'POST',
    }),

  addRecipients: (id: string, emails: string[]) =>
    apiRequest<AddRecipientsResult>(`/campaigns/${id}/recipients`, {
      method: 'POST',
      body: { emails },
    }),

  removeRecipient: (id: string, recipientId: string) =>
    apiRequest<void>(`/campaigns/${id}/recipients/${recipientId}`, {
      method: 'DELETE',
    }),
};

/** Cache keys, kept in one place so invalidations stay consistent. */
export const campaignKeys = {
  all: ['campaigns'] as const,
  list: (params: ListCampaignsParams) => ['campaigns', 'list', params] as const,
  detail: (id: string) => ['campaigns', 'detail', id] as const,
  stats: (id: string) => ['campaigns', 'stats', id] as const,
};

export function useCampaignsList(params: ListCampaignsParams) {
  return useQuery({
    queryKey: campaignKeys.list(params),
    queryFn: () => campaignsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useCampaign(id: string | undefined) {
  return useQuery({
    queryKey: campaignKeys.detail(id ?? ''),
    queryFn: () => campaignsApi.get(id!),
    enabled: Boolean(id),
    // Refetch every 2s while the send simulation is running so the body
    // (and especially the status) stays live; off otherwise.
    refetchInterval: (q) => (q.state.data?.status === 'sending' ? 2000 : false),
  });
}

export function useCampaignStats(id: string | undefined, currentStatus?: CampaignStatus) {
  return useQuery({
    queryKey: campaignKeys.stats(id ?? ''),
    queryFn: () => campaignsApi.stats(id!),
    enabled: Boolean(id),
    refetchInterval: currentStatus === 'sending' ? 2000 : false,
  });
}
