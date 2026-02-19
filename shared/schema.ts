import { z } from "zod";
import { pgTable, text, boolean, integer, jsonb, timestamp, uuid, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const SCHEMA_VERSION = 1;

export const schemaVersions = pgTable("schema_versions", {
  id: serial("id").primaryKey(),
  version: integer("version").notNull(),
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
  description: text("description"),
});

export const insertSchemaVersionSchema = createInsertSchema(schemaVersions).omit({ id: true, appliedAt: true });
export type InsertSchemaVersion = z.infer<typeof insertSchemaVersionSchema>;
export type SchemaVersion = typeof schemaVersions.$inferSelect;

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
  // Basic voice types
  NEUTRAL: "neutral",
  DEEPER: "deeper",
  HIGHER: "higher",
  WARM: "warm",
  CLEAR: "clear",
  // American regional accents
  SOUTHERN_US: "southern_us",
  MIDWEST_US: "midwest_us",
  NEW_YORK: "new_york",
  CALIFORNIA: "california",
  TEXAS: "texas",
  BOSTON: "boston",
  PACIFIC_NW: "pacific_nw",
  MID_ATLANTIC: "mid_atlantic",
  // International accents
  BRITISH: "british",
  AUSTRALIAN: "australian",
  // Voice character/persona presets
  AUTHORITATIVE: "authoritative",
  FRIENDLY: "friendly",
  CALM: "calm",
  ENERGETIC: "energetic",
  CONFIDENT: "confident",
  PROFESSIONAL: "professional",
} as const;

export type AccentPresetType = typeof AccentPreset[keyof typeof AccentPreset];

// Audio settings schema (Zod for validation)
export const audioSettingsSchema = z.object({
  noiseReductionEnabled: z.boolean().default(true),
  noiseReductionLevel: z.number().min(0).max(100).default(50),
  accentModifierEnabled: z.boolean().default(false),
  accentPreset: z.enum([
    // Basic
    "neutral", "deeper", "higher", "warm", "clear",
    // American regional
    "southern_us", "midwest_us", "new_york", "california", "texas", "boston", "pacific_nw", "mid_atlantic",
    // International
    "british", "australian",
    // Voice character
    "authoritative", "friendly", "calm", "energetic", "confident", "professional"
  ]).default("neutral"),
  // Pitch shifting can introduce metallic artifacts; keep it opt-in.
  pitchShiftEnabled: z.boolean().default(false),
  pitchShift: z.number().min(-12).max(12).default(0),
  formantShift: z.number().min(-50).max(50).default(0),
  inputDeviceId: z.string().optional(),
  outputDeviceId: z.string().optional(),
  inputGain: z.number().min(0).max(200).default(100),
  outputGain: z.number().min(0).max(200).default(100),
  clarityBoost: z.number().min(0).max(100).default(0),
  volumeNormalization: z.boolean().default(false),
});

export type AudioSettings = z.infer<typeof audioSettingsSchema>;

// Drizzle ORM table definitions
export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email"),
  status: text("status").$type<AgentStatusType>().notNull().default("offline"),
  isProcessingActive: boolean("is_processing_active").notNull().default(false),
  callDuration: integer("call_duration").notNull().default(0),
  latency: integer("latency").notNull().default(0),
  audioSettings: jsonb("audio_settings").$type<AudioSettings>().notNull(),
  totalCallsToday: integer("total_calls_today").notNull().default(0),
  totalProcessingTime: integer("total_processing_time").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Custom accent profiles table
export const customProfiles = pgTable("custom_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").references(() => agents.id).notNull(),
  name: text("name").notNull(),
  audioSettings: jsonb("audio_settings").$type<AudioSettings>().notNull(),
  isShared: boolean("is_shared").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Team presets managed by admins
export const teamPresets = pgTable("team_presets", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  audioSettings: jsonb("audio_settings").$type<AudioSettings>().notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Analytics/usage tracking table
export const usageStats = pgTable("usage_stats", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").references(() => agents.id).notNull(),
  date: timestamp("date").defaultNow().notNull(),
  noiseReductionMinutes: integer("noise_reduction_minutes").notNull().default(0),
  accentModifierMinutes: integer("accent_modifier_minutes").notNull().default(0),
  accentPresetUsed: text("accent_preset_used"),
  totalCalls: integer("total_calls").notNull().default(0),
  avgLatency: integer("avg_latency").notNull().default(0),
});

// Recording sessions table
export const recordings = pgTable("recordings", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").references(() => agents.id).notNull(),
  fileName: text("file_name").notNull(),
  duration: integer("duration").notNull().default(0),
  fileSize: integer("file_size").notNull().default(0),
  audioSettings: jsonb("audio_settings").$type<AudioSettings>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Agent type (select)
export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

// Insert schemas using drizzle-zod
export const insertAgentSchema = createInsertSchema(agents, {
  audioSettings: audioSettingsSchema,
  status: z.enum(["online", "away", "busy", "offline"]),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  callDuration: true,
  latency: true,
  totalCallsToday: true,
  totalProcessingTime: true,
});

export type InsertAgentInput = z.infer<typeof insertAgentSchema>;

// Custom profile types
export type CustomProfile = typeof customProfiles.$inferSelect;
export type InsertCustomProfile = typeof customProfiles.$inferInsert;

export const insertCustomProfileSchema = createInsertSchema(customProfiles, {
  audioSettings: audioSettingsSchema,
}).omit({
  id: true,
  createdAt: true,
});

// Team preset types
export type TeamPreset = typeof teamPresets.$inferSelect;
export type InsertTeamPreset = typeof teamPresets.$inferInsert;

export const insertTeamPresetSchema = createInsertSchema(teamPresets, {
  audioSettings: audioSettingsSchema,
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Usage stats types
export type UsageStats = typeof usageStats.$inferSelect;
export type InsertUsageStats = typeof usageStats.$inferInsert;

// Recording types
export type Recording = typeof recordings.$inferSelect;
export type InsertRecording = typeof recordings.$inferInsert;

// Update agent settings schema
export const updateAgentSettingsSchema = z.object({
  audioSettings: audioSettingsSchema.partial().optional(),
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
  pitchShiftEnabled: false,
  pitchShift: 0,
  formantShift: 0,
  inputDeviceId: undefined,
  outputDeviceId: undefined,
  inputGain: 100,
  outputGain: 100,
  clarityBoost: 0,
  volumeNormalization: false,
};

// Accent preset configurations with enhanced formant and frequency modulation
export const accentPresetConfigs: Record<AccentPresetType, { 
  pitchShift: number; 
  formantShift: number;
  description: string;
  highPassFreq: number;
  lowPassFreq: number;
  resonanceQ: number;
}> = {
  // === BASIC VOICE TYPES ===
  neutral: { 
    pitchShift: 0, 
    formantShift: 0, 
    description: "Natural voice, no modification",
    highPassFreq: 80,
    lowPassFreq: 8000,
    resonanceQ: 0.7,
  },
  deeper: { 
    pitchShift: -3, 
    formantShift: -15, 
    description: "Lower, more authoritative tone",
    highPassFreq: 60,
    lowPassFreq: 6000,
    resonanceQ: 0.8,
  },
  higher: { 
    pitchShift: 3, 
    formantShift: 15, 
    description: "Higher, more energetic tone",
    highPassFreq: 100,
    lowPassFreq: 10000,
    resonanceQ: 0.6,
  },
  warm: { 
    pitchShift: -1, 
    formantShift: -5, 
    description: "Slightly warmer, friendly tone",
    highPassFreq: 70,
    lowPassFreq: 7000,
    resonanceQ: 0.9,
  },
  clear: { 
    pitchShift: 1, 
    formantShift: 5, 
    description: "Clearer, more articulate tone",
    highPassFreq: 100,
    lowPassFreq: 9000,
    resonanceQ: 0.5,
  },
  
  // === AMERICAN REGIONAL ACCENTS ===
  southern_us: { 
    pitchShift: -2, 
    formantShift: -8, 
    description: "Warm Southern US drawl",
    highPassFreq: 65,
    lowPassFreq: 6500,
    resonanceQ: 0.85,
  },
  midwest_us: { 
    pitchShift: 0, 
    formantShift: 3, 
    description: "Neutral Midwest American accent",
    highPassFreq: 80,
    lowPassFreq: 8000,
    resonanceQ: 0.7,
  },
  new_york: { 
    pitchShift: 1, 
    formantShift: 12, 
    description: "Energetic New York accent",
    highPassFreq: 95,
    lowPassFreq: 8500,
    resonanceQ: 0.55,
  },
  california: { 
    pitchShift: 1, 
    formantShift: 6, 
    description: "Bright, relaxed California voice",
    highPassFreq: 90,
    lowPassFreq: 9500,
    resonanceQ: 0.6,
  },
  texas: { 
    pitchShift: -2, 
    formantShift: -10, 
    description: "Bold Texas twang",
    highPassFreq: 60,
    lowPassFreq: 6000,
    resonanceQ: 0.9,
  },
  boston: { 
    pitchShift: 0, 
    formantShift: 8, 
    description: "Classic Boston accent",
    highPassFreq: 85,
    lowPassFreq: 8000,
    resonanceQ: 0.65,
  },
  pacific_nw: { 
    pitchShift: 0, 
    formantShift: 4, 
    description: "Clean Pacific Northwest voice",
    highPassFreq: 85,
    lowPassFreq: 9000,
    resonanceQ: 0.6,
  },
  mid_atlantic: { 
    pitchShift: 0, 
    formantShift: 5, 
    description: "Polished Mid-Atlantic speech",
    highPassFreq: 80,
    lowPassFreq: 8500,
    resonanceQ: 0.65,
  },
  
  // === INTERNATIONAL ACCENTS ===
  british: { 
    pitchShift: 3,
    formantShift: 22,
    description: "Stronger British-style crispness (tone shaping)",
    highPassFreq: 120,
    lowPassFreq: 9500,
    resonanceQ: 1.2,
  },
  australian: { 
    pitchShift: 3,
    formantShift: 18,
    description: "Stronger Australian-style brightness (tone shaping)",
    highPassFreq: 110,
    lowPassFreq: 10000,
    resonanceQ: 1.0,
  },
  
  // === VOICE CHARACTER/PERSONA PRESETS ===
  authoritative: { 
    pitchShift: -2, 
    formantShift: -12, 
    description: "Commanding, leadership presence",
    highPassFreq: 55,
    lowPassFreq: 5500,
    resonanceQ: 0.85,
  },
  friendly: { 
    pitchShift: 1, 
    formantShift: 5, 
    description: "Warm, approachable personality",
    highPassFreq: 85,
    lowPassFreq: 8500,
    resonanceQ: 0.75,
  },
  calm: { 
    pitchShift: -1, 
    formantShift: -3, 
    description: "Soothing, relaxed delivery",
    highPassFreq: 70,
    lowPassFreq: 7000,
    resonanceQ: 0.95,
  },
  energetic: { 
    pitchShift: 2, 
    formantShift: 10, 
    description: "Vibrant, enthusiastic tone",
    highPassFreq: 100,
    lowPassFreq: 10000,
    resonanceQ: 0.5,
  },
  confident: { 
    pitchShift: 0, 
    formantShift: 2, 
    description: "Self-assured, steady presence",
    highPassFreq: 75,
    lowPassFreq: 8000,
    resonanceQ: 0.7,
  },
  professional: { 
    pitchShift: 0, 
    formantShift: 3, 
    description: "Business-ready, polished delivery",
    highPassFreq: 80,
    lowPassFreq: 8500,
    resonanceQ: 0.65,
  },
};
