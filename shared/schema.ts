import { z } from "zod";

// Agent status enum
export const AgentStatus = {
  ONLINE: "online",
  AWAY: "away",
  BUSY: "busy",
  OFFLINE: "offline",
} as const;

export type AgentStatusType = typeof AgentStatus[keyof typeof AgentStatus];

// Accent preset definitions
export const AccentPreset = {
  NEUTRAL: "neutral",
  DEEPER: "deeper",
  HIGHER: "higher",
  WARM: "warm",
  CLEAR: "clear",
} as const;

export type AccentPresetType = typeof AccentPreset[keyof typeof AccentPreset];

// Audio settings schema
export const audioSettingsSchema = z.object({
  noiseReductionEnabled: z.boolean().default(true),
  noiseReductionLevel: z.number().min(0).max(100).default(50),
  accentModifierEnabled: z.boolean().default(false),
  accentPreset: z.enum(["neutral", "deeper", "higher", "warm", "clear"]).default("neutral"),
  pitchShift: z.number().min(-12).max(12).default(0),
  inputDeviceId: z.string().optional(),
  outputDeviceId: z.string().optional(),
  inputGain: z.number().min(0).max(200).default(100),
  outputGain: z.number().min(0).max(200).default(100),
});

export type AudioSettings = z.infer<typeof audioSettingsSchema>;

// Agent schema
export const agentSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  email: z.string().email().optional(),
  status: z.enum(["online", "away", "busy", "offline"]).default("offline"),
  isProcessingActive: z.boolean().default(false),
  callDuration: z.number().default(0),
  audioSettings: audioSettingsSchema,
  latency: z.number().default(0),
});

export type Agent = z.infer<typeof agentSchema>;

// Insert agent schema (for creating new agents)
export const insertAgentSchema = agentSchema.omit({ id: true, callDuration: true, latency: true });
export type InsertAgent = z.infer<typeof insertAgentSchema>;

// Update agent settings schema
export const updateAgentSettingsSchema = z.object({
  audioSettings: audioSettingsSchema.partial(),
  status: z.enum(["online", "away", "busy", "offline"]).optional(),
  isProcessingActive: z.boolean().optional(),
});

export type UpdateAgentSettings = z.infer<typeof updateAgentSettingsSchema>;

// Default audio settings
export const defaultAudioSettings: AudioSettings = {
  noiseReductionEnabled: true,
  noiseReductionLevel: 50,
  accentModifierEnabled: false,
  accentPreset: "neutral",
  pitchShift: 0,
  inputDeviceId: undefined,
  outputDeviceId: undefined,
  inputGain: 100,
  outputGain: 100,
};

// Accent preset configurations (pitch shift values in semitones)
export const accentPresetConfigs: Record<AccentPresetType, { pitchShift: number; description: string }> = {
  neutral: { pitchShift: 0, description: "Natural voice, no modification" },
  deeper: { pitchShift: -3, description: "Lower, more authoritative tone" },
  higher: { pitchShift: 3, description: "Higher, more energetic tone" },
  warm: { pitchShift: -1, description: "Slightly warmer, friendly tone" },
  clear: { pitchShift: 1, description: "Clearer, more articulate tone" },
};
