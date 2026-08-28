import { z } from 'zod';

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const postSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .regex(SLUG_REGEX, 'lowercase letters, numbers, dashes only'),
  description: z.string().trim().min(1).max(500),
  body: z.string().min(1),
  published: z
    .union([
      z.literal('on'),
      z.literal('true'),
      z.literal('false'),
      z.literal(''),
      z.boolean(),
    ])
    .optional()
    .transform((v) => v === true || v === 'on' || v === 'true'),
});

export const postUpdateSchema = postSchema.partial();

export type PostInput = z.infer<typeof postSchema>;
