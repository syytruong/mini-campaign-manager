import { Router } from 'express';
import { z } from 'zod';
import { paginationMeta, paginationSchema } from '../middleware/pagination';
import { requireAuth } from '../middleware/requireAuth';
import { recipientService } from '../services/recipientService';

const router = Router();

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).max(120).optional().nullable(),
});

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { limit, offset } = paginationSchema.parse(req.query);
    const { data, total } = await recipientService.list({ limit, offset });
    res.setHeader('X-Total-Count', String(total));
    res.json({ data, pagination: paginationMeta(total, limit, offset) });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const input = createSchema.parse(req.body);
    const { recipient, created } = await recipientService.findOrCreate(input);
    res.status(created ? 201 : 200).json(recipient);
  } catch (err) {
    next(err);
  }
});

export { router as recipientsRouter };
