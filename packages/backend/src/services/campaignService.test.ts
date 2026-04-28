import { AppError } from '../errors/AppError';
import { Campaign } from '../models';
import { authService } from './authService';
import { campaignService } from './campaignService';
import { closeDatabase, resetDatabase } from '../test/helpers';

describe('campaignService', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  async function makeUser(email: string): Promise<string> {
    const { user } = await authService.register({
      email,
      name: email.split('@')[0],
      password: 'password123',
    });
    return user.id;
  }

  describe('status guard: only drafts can be edited or deleted', () => {
    it('allows update + delete on a draft', async () => {
      const userId = await makeUser('alice@example.com');
      const draft = await campaignService.create(userId, {
        name: 'Welcome',
        subject: 'Hi',
        body: 'Hello!',
      });

      const updated = await campaignService.update(draft.id, userId, { name: 'Welcome v2' });
      expect(updated.name).toBe('Welcome v2');

      await campaignService.remove(draft.id, userId);
      const after = await Campaign.findByPk(draft.id);
      expect(after).toBeNull();
    });

    it.each(['scheduled', 'sending', 'sent'] as const)(
      'rejects update on a campaign with status %s (403 Forbidden)',
      async (status) => {
        const userId = await makeUser(`u-${status}@example.com`);
        const c = await campaignService.create(userId, {
          name: 'X',
          subject: 'X',
          body: 'X',
        });
        // Force the status by direct save — bypassing the (future) state-machine endpoints.
        c.status = status;
        await c.save();

        const attempt = campaignService.update(c.id, userId, { name: 'mutated' });

        await expect(attempt).rejects.toBeInstanceOf(AppError);
        await expect(attempt).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
      },
    );

    it.each(['scheduled', 'sending', 'sent'] as const)(
      'rejects delete on a campaign with status %s (403 Forbidden)',
      async (status) => {
        const userId = await makeUser(`d-${status}@example.com`);
        const c = await campaignService.create(userId, {
          name: 'X',
          subject: 'X',
          body: 'X',
        });
        c.status = status;
        await c.save();

        const attempt = campaignService.remove(c.id, userId);

        await expect(attempt).rejects.toBeInstanceOf(AppError);
        await expect(attempt).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
      },
    );
  });

  describe('ownership: a user can only see and modify their own campaigns', () => {
    it('returns 404 (not 403) when a campaign exists but belongs to another user', async () => {
      const aliceId = await makeUser('alice@example.com');
      const bobId = await makeUser('bob@example.com');

      const aliceDraft = await campaignService.create(aliceId, {
        name: 'Alice only',
        subject: 'private',
        body: '...',
      });

      // Bob sees 404, not 403 — we don't leak existence of other users' campaigns.
      const get = campaignService.getById(aliceDraft.id, bobId);
      const update = campaignService.update(aliceDraft.id, bobId, { name: 'pwned' });
      const remove = campaignService.remove(aliceDraft.id, bobId);

      await expect(get).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
      await expect(update).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
      await expect(remove).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });

      // And the draft is unchanged.
      const fresh = await Campaign.findByPk(aliceDraft.id);
      expect(fresh?.name).toBe('Alice only');
    });
  });

  describe('create with recipientEmails', () => {
    it('attaches recipients via findOrCreate and dedupes case-insensitive duplicates', async () => {
      const userId = await makeUser('marketer@example.com');
      const campaign = await campaignService.create(userId, {
        name: 'Newsletter',
        subject: 'October',
        body: 'Monthly update',
        recipientEmails: ['Bob@Example.com', 'bob@example.com', 'carol@example.com'],
      });

      const { recipients } = await campaignService.getById(campaign.id, userId);
      expect(recipients.map((r) => r.email).sort()).toEqual([
        'bob@example.com',
        'carol@example.com',
      ]);
    });
  });
});
