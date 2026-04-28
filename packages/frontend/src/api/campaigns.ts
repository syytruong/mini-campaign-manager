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
