import { z } from 'zod';

export const SKILL_RANKS = ['F', 'E', 'D', 'C', 'B', 'A', '9', '8', '7', '6', '5', '4', '3', '2', '1'] as const;
export const SkillRankSchema = z.enum(SKILL_RANKS);
