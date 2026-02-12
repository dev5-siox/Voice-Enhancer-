import { eq, desc, and, gte, sql } from "drizzle-orm";
import { db } from "./db";
import { 
  agents, 
  customProfiles, 
  teamPresets, 
  usageStats, 
  recordings,
  schemaVersions,
  defaultAudioSettings,
  SCHEMA_VERSION
} from "@shared/schema";
import type { 
  Agent, 
  InsertAgentInput, 
  UpdateAgentSettings,
  CustomProfile,
  InsertCustomProfile,
  TeamPreset,
  InsertTeamPreset,
  UsageStats,
  InsertUsageStats,
  Recording,
  InsertRecording,
  AudioSettings 
} from "@shared/schema";

export interface IStorage {
  // Agent operations
  getAgent(id: string): Promise<Agent | undefined>;
  getAllAgents(): Promise<Agent[]>;
  createAgent(agent: InsertAgentInput): Promise<Agent>;
  updateAgentSettings(id: string, settings: UpdateAgentSettings): Promise<Agent | undefined>;
  deleteAgent(id: string): Promise<boolean>;
  
  // Bulk operations
  getAgentCount(): Promise<number>;
  getActiveAgents(): Promise<Agent[]>;

  // Custom profiles
  getCustomProfiles(agentId: string): Promise<CustomProfile[]>;
  getSharedProfiles(): Promise<CustomProfile[]>;
  createCustomProfile(profile: Omit<InsertCustomProfile, "id" | "createdAt">): Promise<CustomProfile>;
  deleteCustomProfile(id: string): Promise<boolean>;

  // Team presets
  getAllTeamPresets(): Promise<TeamPreset[]>;
  getActiveTeamPresets(): Promise<TeamPreset[]>;
  createTeamPreset(preset: Omit<InsertTeamPreset, "id" | "createdAt" | "updatedAt">): Promise<TeamPreset>;
  updateTeamPreset(id: string, preset: Partial<InsertTeamPreset>): Promise<TeamPreset | undefined>;
  deleteTeamPreset(id: string): Promise<boolean>;

  // Usage stats
  getAgentStats(agentId: string, days?: number): Promise<UsageStats[]>;
  getAllStats(days?: number): Promise<UsageStats[]>;
  recordUsage(stats: Omit<InsertUsageStats, "id">): Promise<UsageStats>;
  getAggregatedStats(): Promise<{
    totalNoiseReductionMinutes: number;
    totalAccentModifierMinutes: number;
    totalCalls: number;
    avgLatency: number;
    presetUsage: Record<string, number>;
  }>;

  // Recordings
  getRecordings(agentId: string): Promise<Recording[]>;
  createRecording(recording: Omit<InsertRecording, "id" | "createdAt">): Promise<Recording>;
  deleteRecording(id: string): Promise<boolean>;

  // Seed sample data
  seedSampleAgents(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async checkSchemaVersion(): Promise<void> {
    try {
      const result = await db.select()
        .from(schemaVersions)
        .orderBy(desc(schemaVersions.version))
        .limit(1);

      if (result.length === 0) {
        await db.insert(schemaVersions).values({
          version: SCHEMA_VERSION,
          description: `Initial schema version ${SCHEMA_VERSION}`,
        });
        console.log(`Schema version initialized to ${SCHEMA_VERSION}`);
      } else {
        const currentDbVersion = result[0].version;
        if (currentDbVersion !== SCHEMA_VERSION) {
          console.warn(
            `Schema version mismatch: database has v${currentDbVersion}, code expects v${SCHEMA_VERSION}. Run migrations.`
          );
        } else {
          console.log(`Schema version ${SCHEMA_VERSION} verified`);
        }
      }
    } catch (error) {
      console.warn('Schema version check skipped (table may not exist yet):', (error as Error).message);
    }
  }

  async getAgent(id: string): Promise<Agent | undefined> {
    const result = await db.select().from(agents).where(eq(agents.id, id));
    return result[0];
  }

  async getAllAgents(): Promise<Agent[]> {
    return await db.select().from(agents).orderBy(agents.name);
  }

  async createAgent(insertAgent: InsertAgentInput): Promise<Agent> {
    const result = await db.insert(agents).values({
      name: insertAgent.name,
      email: insertAgent.email,
      status: insertAgent.status || "offline",
      isProcessingActive: insertAgent.isProcessingActive || false,
      audioSettings: insertAgent.audioSettings || defaultAudioSettings,
    }).returning();
    return result[0];
  }

  async updateAgentSettings(id: string, settings: UpdateAgentSettings): Promise<Agent | undefined> {
    return await db.transaction(async (tx: any) => {
      await tx.execute(sql`SELECT 1 FROM agents WHERE id = ${id} FOR UPDATE`);

      const [agent] = await tx.select().from(agents).where(eq(agents.id, id));
      if (!agent) return undefined;

      const updatedSettings = settings.audioSettings 
        ? { ...agent.audioSettings, ...settings.audioSettings }
        : agent.audioSettings;

      const [updated] = await tx.update(agents)
        .set({
          status: settings.status ?? agent.status,
          isProcessingActive: settings.isProcessingActive ?? agent.isProcessingActive,
          audioSettings: updatedSettings,
          updatedAt: new Date(),
        })
        .where(eq(agents.id, id))
        .returning();
      
      return updated;
    });
  }

  async deleteAgent(id: string): Promise<boolean> {
    const result = await db.delete(agents).where(eq(agents.id, id)).returning();
    return result.length > 0;
  }

  async getAgentCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(agents);
    return Number(result[0]?.count || 0);
  }

  async getActiveAgents(): Promise<Agent[]> {
    return await db.select().from(agents).where(
      sql`${agents.status} != 'offline'`
    );
  }

  // Custom Profiles
  async getCustomProfiles(agentId: string): Promise<CustomProfile[]> {
    return await db.select().from(customProfiles)
      .where(eq(customProfiles.agentId, agentId))
      .orderBy(desc(customProfiles.createdAt));
  }

  async getSharedProfiles(): Promise<CustomProfile[]> {
    return await db.select().from(customProfiles)
      .where(eq(customProfiles.isShared, true))
      .orderBy(customProfiles.name);
  }

  async createCustomProfile(profile: Omit<InsertCustomProfile, "id" | "createdAt">): Promise<CustomProfile> {
    const result = await db.insert(customProfiles).values(profile).returning();
    return result[0];
  }

  async deleteCustomProfile(id: string): Promise<boolean> {
    const result = await db.delete(customProfiles).where(eq(customProfiles.id, id)).returning();
    return result.length > 0;
  }

  // Team Presets
  async getAllTeamPresets(): Promise<TeamPreset[]> {
    return await db.select().from(teamPresets).orderBy(teamPresets.name);
  }

  async getActiveTeamPresets(): Promise<TeamPreset[]> {
    return await db.select().from(teamPresets)
      .where(eq(teamPresets.isActive, true))
      .orderBy(teamPresets.name);
  }

  async createTeamPreset(preset: Omit<InsertTeamPreset, "id" | "createdAt" | "updatedAt">): Promise<TeamPreset> {
    const result = await db.insert(teamPresets).values(preset).returning();
    return result[0];
  }

  async updateTeamPreset(id: string, preset: Partial<InsertTeamPreset>): Promise<TeamPreset | undefined> {
    const result = await db.update(teamPresets)
      .set({ ...preset, updatedAt: new Date() })
      .where(eq(teamPresets.id, id))
      .returning();
    return result[0];
  }

  async deleteTeamPreset(id: string): Promise<boolean> {
    const result = await db.delete(teamPresets).where(eq(teamPresets.id, id)).returning();
    return result.length > 0;
  }

  // Usage Stats
  async getAgentStats(agentId: string, days = 30): Promise<UsageStats[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return await db.select().from(usageStats)
      .where(and(
        eq(usageStats.agentId, agentId),
        gte(usageStats.date, cutoffDate)
      ))
      .orderBy(desc(usageStats.date));
  }

  async getAllStats(days = 30): Promise<UsageStats[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return await db.select().from(usageStats)
      .where(gte(usageStats.date, cutoffDate))
      .orderBy(desc(usageStats.date));
  }

  async recordUsage(stats: Omit<InsertUsageStats, "id">): Promise<UsageStats> {
    const result = await db.insert(usageStats).values(stats).returning();
    return result[0];
  }

  async getAggregatedStats(): Promise<{
    totalNoiseReductionMinutes: number;
    totalAccentModifierMinutes: number;
    totalCalls: number;
    avgLatency: number;
    presetUsage: Record<string, number>;
  }> {
    const allStats = await this.getAllStats(30);
    
    let totalNoiseReductionMinutes = 0;
    let totalAccentModifierMinutes = 0;
    let totalCalls = 0;
    let totalLatency = 0;
    const presetUsage: Record<string, number> = {};

    allStats.forEach(stat => {
      totalNoiseReductionMinutes += stat.noiseReductionMinutes;
      totalAccentModifierMinutes += stat.accentModifierMinutes;
      totalCalls += stat.totalCalls;
      totalLatency += stat.avgLatency;
      
      if (stat.accentPresetUsed) {
        presetUsage[stat.accentPresetUsed] = (presetUsage[stat.accentPresetUsed] || 0) + 1;
      }
    });

    return {
      totalNoiseReductionMinutes,
      totalAccentModifierMinutes,
      totalCalls,
      avgLatency: allStats.length > 0 ? Math.round(totalLatency / allStats.length) : 0,
      presetUsage,
    };
  }

  // Recordings
  async getRecordings(agentId: string): Promise<Recording[]> {
    return await db.select().from(recordings)
      .where(eq(recordings.agentId, agentId))
      .orderBy(desc(recordings.createdAt));
  }

  async createRecording(recording: Omit<InsertRecording, "id" | "createdAt">): Promise<Recording> {
    const result = await db.insert(recordings).values(recording).returning();
    return result[0];
  }

  async deleteRecording(id: string): Promise<boolean> {
    const result = await db.delete(recordings).where(eq(recordings.id, id)).returning();
    return result.length > 0;
  }

  // Seed sample agents for demo
  async seedSampleAgents(): Promise<void> {
    const existingCount = await this.getAgentCount();
    if (existingCount > 0) {
      console.log(`Database already has ${existingCount} agents, skipping seed.`);
      return;
    }

    console.log("Seeding sample agents...");
    
    const sampleAgents: InsertAgentInput[] = [
      { name: "Sarah Johnson", email: "sarah.j@company.com", status: "busy", isProcessingActive: true, audioSettings: { ...defaultAudioSettings, noiseReductionEnabled: true } },
      { name: "Michael Chen", email: "m.chen@company.com", status: "online", isProcessingActive: true, audioSettings: { ...defaultAudioSettings, accentModifierEnabled: true, accentPreset: "warm" } },
      { name: "Emily Rodriguez", email: "e.rodriguez@company.com", status: "busy", isProcessingActive: true, audioSettings: { ...defaultAudioSettings, noiseReductionEnabled: true, noiseReductionLevel: 75 } },
      { name: "David Kim", email: "d.kim@company.com", status: "online", isProcessingActive: false, audioSettings: defaultAudioSettings },
      { name: "Jessica Martinez", email: "j.martinez@company.com", status: "away", isProcessingActive: false, audioSettings: defaultAudioSettings },
      { name: "James Wilson", email: "j.wilson@company.com", status: "busy", isProcessingActive: true, audioSettings: { ...defaultAudioSettings, noiseReductionEnabled: true } },
      { name: "Amanda Brown", email: "a.brown@company.com", status: "online", isProcessingActive: true, audioSettings: { ...defaultAudioSettings, accentModifierEnabled: true, accentPreset: "deeper" } },
      { name: "Christopher Lee", email: "c.lee@company.com", status: "offline", isProcessingActive: false, audioSettings: defaultAudioSettings },
      { name: "Ashley Taylor", email: "a.taylor@company.com", status: "online", isProcessingActive: true, audioSettings: { ...defaultAudioSettings, noiseReductionEnabled: true } },
      { name: "Matthew Anderson", email: "m.anderson@company.com", status: "busy", isProcessingActive: true, audioSettings: { ...defaultAudioSettings, noiseReductionEnabled: true, accentModifierEnabled: true, accentPreset: "clear" } },
      { name: "Jennifer Thomas", email: "j.thomas@company.com", status: "online", isProcessingActive: false, audioSettings: defaultAudioSettings },
      { name: "Daniel Jackson", email: "d.jackson@company.com", status: "away", isProcessingActive: false, audioSettings: defaultAudioSettings },
      { name: "Nicole White", email: "n.white@company.com", status: "busy", isProcessingActive: true, audioSettings: { ...defaultAudioSettings, noiseReductionEnabled: true } },
      { name: "Brandon Harris", email: "b.harris@company.com", status: "online", isProcessingActive: true, audioSettings: { ...defaultAudioSettings, accentModifierEnabled: true, accentPreset: "higher" } },
      { name: "Stephanie Clark", email: "s.clark@company.com", status: "offline", isProcessingActive: false, audioSettings: defaultAudioSettings },
      { name: "Kevin Lewis", email: "k.lewis@company.com", status: "online", isProcessingActive: true, audioSettings: { ...defaultAudioSettings, noiseReductionEnabled: true, noiseReductionLevel: 60 } },
      { name: "Rachel Walker", email: "r.walker@company.com", status: "busy", isProcessingActive: true, audioSettings: { ...defaultAudioSettings, noiseReductionEnabled: true } },
      { name: "Tyler Hall", email: "t.hall@company.com", status: "online", isProcessingActive: false, audioSettings: defaultAudioSettings },
      { name: "Megan Young", email: "m.young@company.com", status: "away", isProcessingActive: false, audioSettings: defaultAudioSettings },
      { name: "Justin Allen", email: "j.allen@company.com", status: "busy", isProcessingActive: true, audioSettings: { ...defaultAudioSettings, noiseReductionEnabled: true, accentModifierEnabled: true } },
      { name: "Lauren King", email: "l.king@company.com", status: "online", isProcessingActive: true, audioSettings: { ...defaultAudioSettings, noiseReductionEnabled: true } },
      { name: "Ryan Wright", email: "r.wright@company.com", status: "online", isProcessingActive: true, audioSettings: defaultAudioSettings },
      { name: "Brittany Scott", email: "b.scott@company.com", status: "offline", isProcessingActive: false, audioSettings: defaultAudioSettings },
      { name: "Andrew Green", email: "a.green@company.com", status: "busy", isProcessingActive: true, audioSettings: { ...defaultAudioSettings, noiseReductionEnabled: true } },
      { name: "Kimberly Adams", email: "k.adams@company.com", status: "online", isProcessingActive: false, audioSettings: defaultAudioSettings },
      { name: "Joshua Baker", email: "j.baker@company.com", status: "away", isProcessingActive: false, audioSettings: defaultAudioSettings },
      { name: "Samantha Nelson", email: "s.nelson@company.com", status: "busy", isProcessingActive: true, audioSettings: { ...defaultAudioSettings, noiseReductionEnabled: true } },
      { name: "Nathan Hill", email: "n.hill@company.com", status: "online", isProcessingActive: true, audioSettings: { ...defaultAudioSettings, accentModifierEnabled: true, accentPreset: "warm" } },
      { name: "Christina Moore", email: "c.moore@company.com", status: "online", isProcessingActive: true, audioSettings: defaultAudioSettings },
      { name: "Eric Rivera", email: "e.rivera@company.com", status: "offline", isProcessingActive: false, audioSettings: defaultAudioSettings },
      { name: "Heather Phillips", email: "h.phillips@company.com", status: "busy", isProcessingActive: true, audioSettings: { ...defaultAudioSettings, noiseReductionEnabled: true } },
      { name: "Aaron Campbell", email: "a.campbell@company.com", status: "online", isProcessingActive: false, audioSettings: defaultAudioSettings },
      { name: "Michelle Parker", email: "m.parker@company.com", status: "away", isProcessingActive: false, audioSettings: defaultAudioSettings },
      { name: "Jonathan Evans", email: "j.evans@company.com", status: "busy", isProcessingActive: true, audioSettings: { ...defaultAudioSettings, noiseReductionEnabled: true, noiseReductionLevel: 80 } },
      { name: "Vanessa Edwards", email: "v.edwards@company.com", status: "online", isProcessingActive: true, audioSettings: { ...defaultAudioSettings, noiseReductionEnabled: true } },
      { name: "Patrick Collins", email: "p.collins@company.com", status: "online", isProcessingActive: true, audioSettings: defaultAudioSettings },
      { name: "Danielle Stewart", email: "d.stewart@company.com", status: "offline", isProcessingActive: false, audioSettings: defaultAudioSettings },
      { name: "Steven Sanchez", email: "s.sanchez@company.com", status: "busy", isProcessingActive: true, audioSettings: { ...defaultAudioSettings, noiseReductionEnabled: true } },
      { name: "Monica Morris", email: "m.morris@company.com", status: "online", isProcessingActive: false, audioSettings: defaultAudioSettings },
      { name: "Gregory Rogers", email: "g.rogers@company.com", status: "away", isProcessingActive: false, audioSettings: defaultAudioSettings },
      { name: "Tiffany Reed", email: "t.reed@company.com", status: "busy", isProcessingActive: true, audioSettings: { ...defaultAudioSettings, noiseReductionEnabled: true, accentModifierEnabled: true } },
      { name: "Derek Cook", email: "d.cook@company.com", status: "online", isProcessingActive: true, audioSettings: { ...defaultAudioSettings, noiseReductionEnabled: true } },
      { name: "Amber Morgan", email: "a.morgan@company.com", status: "online", isProcessingActive: true, audioSettings: defaultAudioSettings },
      { name: "Jeremy Bell", email: "j.bell@company.com", status: "offline", isProcessingActive: false, audioSettings: defaultAudioSettings },
      { name: "Courtney Murphy", email: "c.murphy@company.com", status: "busy", isProcessingActive: true, audioSettings: { ...defaultAudioSettings, noiseReductionEnabled: true } },
      { name: "Marcus Bailey", email: "m.bailey@company.com", status: "online", isProcessingActive: false, audioSettings: defaultAudioSettings },
      { name: "Lindsay Rivera", email: "l.rivera@company.com", status: "away", isProcessingActive: false, audioSettings: defaultAudioSettings },
      { name: "Travis Cooper", email: "t.cooper@company.com", status: "busy", isProcessingActive: true, audioSettings: { ...defaultAudioSettings, noiseReductionEnabled: true } },
      { name: "Cassandra Richardson", email: "c.richardson@company.com", status: "online", isProcessingActive: true, audioSettings: { ...defaultAudioSettings, accentModifierEnabled: true, accentPreset: "deeper" } },
      { name: "Kyle Cox", email: "k.cox@company.com", status: "online", isProcessingActive: true, audioSettings: { ...defaultAudioSettings, noiseReductionEnabled: true } },
    ];

    for (const agent of sampleAgents) {
      await this.createAgent(agent);
    }

    console.log(`Seeded ${sampleAgents.length} sample agents.`);
  }
}

// Use memory storage if no database URL is configured
import { MemoryStorage } from "./memory-storage";

const dbStorage = process.env.DATABASE_URL ? new DatabaseStorage() : null;
if (dbStorage) {
  dbStorage.checkSchemaVersion().catch(err => 
    console.warn('Schema version check failed:', err)
  );
}
export const storage: IStorage = dbStorage || new MemoryStorage();
