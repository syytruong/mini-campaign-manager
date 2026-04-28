import { Recipient } from '../models';

export interface CreateRecipientInput {
  email: string;
  name?: string | null;
}

export interface ListRecipientsParams {
  limit: number;
  offset: number;
}

export interface ListRecipientsResult {
  data: Recipient[];
  total: number;
}

export const recipientService = {
  /**
   * Idempotent: if a recipient with this email exists, return it.
   * If the existing row had a null name and we're now given one, fill it in.
   */
  async findOrCreate(input: CreateRecipientInput): Promise<{ recipient: Recipient; created: boolean }> {
    const email = input.email.trim().toLowerCase();
    const name = input.name?.trim() || null;

    const [recipient, created] = await Recipient.findOrCreate({
      where: { email },
      defaults: { email, name },
    });

    if (!created && name && !recipient.name) {
      recipient.name = name;
      await recipient.save();
    }

    return { recipient, created };
  },

  async list(params: ListRecipientsParams): Promise<ListRecipientsResult> {
    const { rows, count } = await Recipient.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit: params.limit,
      offset: params.offset,
    });
    return { data: rows, total: count };
  },
};
