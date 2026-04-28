import { QueryTypes, Transaction } from 'sequelize';
import { sequelize } from '../db';
import { Errors } from '../errors/AppError';
import {
  Campaign,
  CampaignRecipient,
  Recipient,
  type CampaignStatus,
} from '../models';
import { recipientService } from './recipientService';

export interface CreateCampaignInput {
  name: string;
  subject: string;
  body: string;
  recipientEmails?: string[];
}

export interface UpdateCampaignInput {
  name?: string;
  subject?: string;
  body?: string;
}

export interface ListCampaignsParams {
  userId: string;
  limit: number;
  offset: number;
  status?: CampaignStatus;
}

export interface ListCampaignsResult {
  data: Campaign[];
  total: number;
}

export interface CampaignStats {
  total: number;
  sent: number;
  failed: number;
  opened: number;
  open_rate: number;
  send_rate: number;
}

const TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ['scheduled', 'sending'],
  scheduled: ['sending'],
  sending: ['sent'],
  sent: [],
};

function assertCanTransition(from: CampaignStatus, to: CampaignStatus): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw Errors.forbidden(`Cannot transition campaign from '${from}' to '${to}'`);
  }
}

async function findCampaignForUser(
  id: string,
  userId: string,
  transaction?: Transaction,
): Promise<Campaign> {
  const campaign = await Campaign.findOne({
    where: { id, createdBy: userId },
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });
  if (!campaign) throw Errors.notFound('Campaign not found');
  return campaign;
}

function assertEditable(campaign: Campaign): void {
  if (campaign.status !== 'draft') {
    throw Errors.forbidden(
      `Cannot modify a campaign with status '${campaign.status}'. Only drafts are editable.`,
    );
  }
}

const FAILURE_RATE = 0.15;

function rollOutcome(): 'sent' | 'failed' {
  return Math.random() < FAILURE_RATE ? 'failed' : 'sent';
}

async function runSendSimulation(campaignId: string): Promise<void> {
  try {
    const deliveries = await CampaignRecipient.findAll({
      where: { campaignId, status: 'pending' },
    });

    for (const delivery of deliveries) {
      delivery.status = rollOutcome();
      delivery.sentAt = new Date();
      await delivery.save();
    }

    await Campaign.update({ status: 'sent' }, { where: { id: campaignId } });
  } catch (err) {
    console.error(`[send] simulation failed for campaign ${campaignId}:`, err);
  }
}

/**
 * Round to 4 decimal places (so 0.1234 not 0.12345678).
 * Returned as a number 0..1 — the frontend multiplies by 100 for display.
 */
function rate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 10000;
}

interface StatsRow {
  total: string;
  sent: string;
  failed: string;
  opened: string;
}

export const campaignService = {
  async create(userId: string, input: CreateCampaignInput): Promise<Campaign> {
    const trimmedEmails = Array.from(
      new Set((input.recipientEmails ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean)),
    );

    return sequelize.transaction(async (tx) => {
      const campaign = await Campaign.create(
        {
          name: input.name.trim(),
          subject: input.subject.trim(),
          body: input.body,
          createdBy: userId,
        },
        { transaction: tx },
      );

      if (trimmedEmails.length > 0) {
        const attachments: Array<{ campaignId: string; recipientId: string }> = [];
        for (const email of trimmedEmails) {
          const { recipient } = await recipientService.findOrCreate({ email });
          attachments.push({ campaignId: campaign.id, recipientId: recipient.id });
        }
        await CampaignRecipient.bulkCreate(attachments, {
          transaction: tx,
          ignoreDuplicates: true,
        });
      }

      return campaign;
    });
  },

  async list(params: ListCampaignsParams): Promise<ListCampaignsResult> {
    const where: Record<string, unknown> = { createdBy: params.userId };
    if (params.status) where.status = params.status;

    const { rows, count } = await Campaign.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: params.limit,
      offset: params.offset,
    });
    return { data: rows, total: count };
  },

  async getById(
    id: string,
    userId: string,
  ): Promise<{ campaign: Campaign; recipients: Recipient[] }> {
    const campaign = await findCampaignForUser(id, userId);
    const recipients = await Recipient.findAll({
      include: [
        {
          model: Campaign,
          as: 'campaigns',
          where: { id },
          attributes: [],
          through: { attributes: [] },
        },
      ],
      order: [['createdAt', 'ASC']],
    });
    return { campaign, recipients };
  },

  async update(id: string, userId: string, patch: UpdateCampaignInput): Promise<Campaign> {
    const campaign = await findCampaignForUser(id, userId);
    assertEditable(campaign);

    if (patch.name !== undefined) campaign.name = patch.name.trim();
    if (patch.subject !== undefined) campaign.subject = patch.subject.trim();
    if (patch.body !== undefined) campaign.body = patch.body;

    await campaign.save();
    return campaign;
  },

  async remove(id: string, userId: string): Promise<void> {
    const campaign = await findCampaignForUser(id, userId);
    assertEditable(campaign);
    await campaign.destroy();
  },

  async schedule(id: string, userId: string, scheduledAt: Date): Promise<Campaign> {
    if (scheduledAt.getTime() < Date.now() - 1000) {
      throw Errors.badRequest('Schedule must be in future');
    }

    return sequelize.transaction(async (tx) => {
      const campaign = await findCampaignForUser(id, userId, tx);
      assertCanTransition(campaign.status, 'scheduled');

      campaign.status = 'scheduled';
      campaign.scheduledAt = scheduledAt;
      await campaign.save({ transaction: tx });
      return campaign;
    });
  },

  async startSending(id: string, userId: string): Promise<Campaign> {
    const campaign = await sequelize.transaction(async (tx) => {
      const c = await findCampaignForUser(id, userId, tx);
      assertCanTransition(c.status, 'sending');
      c.status = 'sending';
      await c.save({ transaction: tx });
      return c;
    });

    setImmediate(() => {
      void runSendSimulation(campaign.id);
    });

    return campaign;
  },

  /**
   * Aggregated delivery stats for a campaign.
   * Single GROUP BY query, uses the composite index on (campaign_id, status).
   *
   * - open_rate uses sent as denominator (you can't open an email that wasn't sent)
   * - send_rate uses total as denominator (% of intended recipients who got it)
   * - rates are 0..1 numbers; frontend multiplies by 100 for display
   */
  async getStats(id: string, userId: string): Promise<CampaignStats> {
    // Ensure the campaign exists AND belongs to this user — 404 otherwise
    await findCampaignForUser(id, userId);

    const rows = await sequelize.query<StatsRow>(
      `
      SELECT
        COUNT(*)::text                                                AS total,
        COUNT(*) FILTER (WHERE status = 'sent')::text                 AS sent,
        COUNT(*) FILTER (WHERE status = 'failed')::text               AS failed,
        COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::text           AS opened
      FROM campaign_recipients
      WHERE campaign_id = :campaignId
      `,
      {
        type: QueryTypes.SELECT,
        replacements: { campaignId: id },
      },
    );

    const row = rows[0];
    const total = Number(row?.total ?? 0);
    const sent = Number(row?.sent ?? 0);
    const failed = Number(row?.failed ?? 0);
    const opened = Number(row?.opened ?? 0);

    return {
      total,
      sent,
      failed,
      opened,
      open_rate: rate(opened, sent),
      send_rate: rate(sent, total),
    };
  },
};
