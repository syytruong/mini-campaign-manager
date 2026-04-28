import { Transaction } from 'sequelize';
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

/**
 * Single source of truth for the state machine.
 *   from -> [allowed next states]
 *
 * Used by every status-changing operation.
 */
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

/**
 * Internal helper: fetch a campaign that belongs to userId.
 * Returns 404 (not 403) when the campaign exists but isn't theirs.
 */
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

// 15% failure rate: realistic enough to demo, low enough to avoid "everything failed"
const FAILURE_RATE = 0.15;

function rollOutcome(): 'sent' | 'failed' {
  return Math.random() < FAILURE_RATE ? 'failed' : 'sent';
}

/**
 * The actual async simulation. Detached from the request that triggered it.
 * Each recipient row is updated individually with a per-row outcome and timestamp.
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
    // Don't crash the process. In a real system this would log to an
    // error tracker and the campaign would be retried by a background worker.
    console.error(`[send] simulation failed for campaign ${campaignId}:`, err);
  }
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
    // 1-second grace window for in-flight requests
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

  /**
   * Mark the campaign as 'sending' and kick off the async simulation.
   * Returns immediately — caller responds with 202 Accepted.
   */
  async startSending(id: string, userId: string): Promise<Campaign> {
    const campaign = await sequelize.transaction(async (tx) => {
      const c = await findCampaignForUser(id, userId, tx);
      assertCanTransition(c.status, 'sending');
      c.status = 'sending';
      await c.save({ transaction: tx });
      return c;
    });

    // Kick off the simulation outside the transaction. setImmediate yields
    // control back to the event loop so the HTTP response goes out first.
    setImmediate(() => {
      void runSendSimulation(campaign.id);
    });

    return campaign;
  },
};
