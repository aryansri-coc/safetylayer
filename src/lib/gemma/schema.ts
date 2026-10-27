import { z } from "zod";

export const GemmaExtractionSchema = z.object({
  issue: z.enum([
    "lighting",
    "road_condition",
    "footpath_missing",
    "isolated_stretch",
    "obstruction",
    "other",
  ]),
  time_relevance: z.enum(["day", "night", "always"]),
  severity: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  confidence: z.number().min(0).max(1),
  language: z.enum(["en", "hi", "hinglish"]),
  summary: z.string().min(5).max(300),
  raw_claim_transcription: z.string().optional(),
  detected_elements: z.array(z.string()).default([]),
  reasoning_trace: z.string().optional(),
});

export type GemmaExtractionOutput = z.infer<typeof GemmaExtractionSchema>;
