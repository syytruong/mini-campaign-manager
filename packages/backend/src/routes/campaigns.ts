import { Router } from 'express';
import { z } from 'zod';
import { Errors } from '../errors/AppError';
import { CAMPAIGN_STATUSES } from '../models';
import { paginationMeta, paginationSchema } from '../middleware/pagination';
import { requireAuth } from '../middleware/requireAuth';
import { campaignService } from '../services/campaignService';

const router = Router();

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  subject: z.string().trim().min(1).max(255),
  body: z.string().min(1),
  recipientEmails: z.array(z.string().email()).max(10000).optional(),
});

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    subject: z.string().trim().min(1).max(255).optional(),
    body: z.string().min(1).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field is required',
  });

const listQuerySchema = paginationSchema.extend({
  status: z.enum(CAMPAIGN_STATUSES).optional(),
});

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { limit, offset, status } = listQuerySchema.parse(req.query);
    const { data, total } = await campaignService.list({ userId, limit, offset, status });
    res.setHeader('X-Total-Count', String(total));
    res.json({ data, pagination: paginationMeta(total, limit, offset) });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const input = createSchema.parse(req.body);
    const campaign = await campaignService.create(userId, input);
    res.status(201).json(campaign);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { campaign, recipients } = await campaignService.getById(req.params.id, userId);
    res.json({ ...campaign.toJSON(), recipients });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const patch = updateSchema.parse(req.body);
    const campaign = await campaignService.update(req.params.id, userId, patch);
    res.json(campaign);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    await campaignService.remove(req.params.id, userId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Reject other methods on /:id with a clean 405-style message via the global handler
router.all('/:id', (_req, _res, next) => {
  next(Errors.badRequest('Method not allowed for this resource'));
});

export { router as campaignsRouter };
