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
 * Internal helper: fetch a campaign that belongs to userId.
 * Returns 404 (not 403) when the campaign exists but isn't theirs —
 * we don't want to leak the existence of other users' campaigns.
 */
async function findCampaignForUser(id: string, userId: string): Promise<Campaign> {
  const campaign = await Campaign.findOne({ where: { id, createdBy: userId } });
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
          // status, scheduledAt fall through to the model defaults
        },
        { transaction: tx },
      );

      if (trimmedEmails.length > 0) {
        // findOrCreate each — recipients are global, so duplicates are reused.
        // We can't easily run these inside the same tx because findOrCreate
        // takes its own transaction; do it sequentially after.
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

  async getById(id: string, userId: string): Promise<{ campaign: Campaign; recipients: Recipient[] }> {
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
};
