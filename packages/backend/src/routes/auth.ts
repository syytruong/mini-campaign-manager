import { Router } from 'express';
import { z } from 'zod';
import { authService } from '../services/authService';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/register', async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const result = await authService.register(input);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export { router as authRouter };
