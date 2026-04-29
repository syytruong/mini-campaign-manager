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

/**
 * Async send simulation.
 *
 * Takes a campaignId (NOT a closure over the request), so swapping this
 * for a real queue handler (BullMQ, SQS) is a one-file change: replace
 * `setImmediate(() => runSendSimulation(id))` with `queue.add({ id })`.
 *
 * KNOWN LIMITATION — process crash mid-send:
 * If Node crashes between flipping the campaign to 'sending' and finishing
 * the loop below, the campaign is permanently stuck in 'sending' with no
 * recovery path. In production this is solved by a queue with at-least-once
 * delivery + a stuck-job watchdog. We deliberately do NOT add a startup
 * recovery routine here, because faking queue semantics would suggest the
 * system is more robust than it is. For this demo the gap is named, not
 * patched.
 */
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
      throw Errors.badRequest('scheduledAt must be a future timestamp');
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

  async getStats(id: string, userId: string): Promise<CampaignStats> {
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