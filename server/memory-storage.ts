import type { IStorage } from "./storage";
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
  InsertRecording
} from "@shared/schema";
import { defaultAudioSettings } from "@shared/schema";
import fs from "fs";
import path from "path";

/**
 * In-memory storage implementation for quick local development
 * This bypasses the need for a database connection
 */
export class MemoryStorage implements IStorage {
  private agents: Map<string, Agent> = new Map();
  private customProfiles: Map<string, CustomProfile> = new Map();
  private teamPresets: Map<string, TeamPreset> = new Map();
  private usageStats: Map<string, UsageStats> = new Map();
  private recordings: Map<string, Recording> = new Map();
  private idCounter = 0;

  private readonly MAX_USAGE_STATS = 10000;
  private readonly MAX_RECORDINGS = 1000;
  private readonly USAGE_STATS_TTL_DAYS = 90;

  private readonly PERSISTENCE_FILE = './data/memory-storage.json';
  private readonly SAVE_INTERVAL_MS = 5 * 60 * 1000;

  constructor() {
    this.loadFromDisk();
    setInterval(() => this.cleanupOldData(), 60 * 60 * 1000);
    setInterval(() => this.saveToDisk(), this.SAVE_INTERVAL_MS);
    process.on('SIGINT', () => {
      this.saveToDisk();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      this.saveToDisk();
      process.exit(0);
    });
    console.log("MemoryStorage: Initialized with persistence and cleanup scheduled");
  }

  private saveToDisk(): void {
    try {
      const data = {
        agents: Array.from(this.agents.entries()),
        customProfiles: Array.from(this.customProfiles.entries()),
        teamPresets: Array.from(this.teamPresets.entries()),
        usageStats: Array.from(this.usageStats.entries()),
        recordings: Array.from(this.recordings.entries()),
        idCounter: this.idCounter,
        version: 1,
        savedAt: new Date().toISOString(),
      };

      const dir = path.dirname(this.PERSISTENCE_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.PERSISTENCE_FILE, JSON.stringify(data, null, 2));
      console.log(`MemoryStorage: Saved ${this.agents.size} agents to disk`);
    } catch (error) {
      console.error('MemoryStorage: Failed to save:', error);
    }
  }

  private loadFromDisk(): void {
    try {
      if (!fs.existsSync(this.PERSISTENCE_FILE)) {
        console.log('MemoryStorage: No existing data file, starting fresh');
        return;
      }
      const fileContent = fs.readFileSync(this.PERSISTENCE_FILE, 'utf-8');
      const data = JSON.parse(fileContent);

      if (data.agents) {
        this.agents = new Map(data.agents.map(([id, agent]: [string, any]) => [
          id, { ...agent, createdAt: new Date(agent.createdAt), updatedAt: new Date(agent.updatedAt) }
        ]));
      }
      if (data.customProfiles) {
        this.customProfiles = new Map(data.customProfiles.map(([id, p]: [string, any]) => [
          id, { ...p, createdAt: new Date(p.createdAt) }
        ]));
      }
      if (data.teamPresets) {
        this.teamPresets = new Map(data.teamPresets.map(([id, p]: [string, any]) => [
          id, { ...p, createdAt: new Date(p.createdAt), updatedAt: new Date(p.updatedAt) }
        ]));
      }
      if (data.usageStats) {
        this.usageStats = new Map(data.usageStats.map(([id, s]: [string, any]) => [
          id, { ...s, date: new Date(s.date) }
        ]));
      }
      if (data.recordings) {
        this.recordings = new Map(data.recordings.map(([id, r]: [string, any]) => [
          id, { ...r, createdAt: new Date(r.createdAt) }
        ]));
      }
      if (data.idCounter) {
        this.idCounter = data.idCounter;
      }

      console.log(`MemoryStorage: Loaded ${this.agents.size} agents from disk`);
    } catch (error) {
      console.log('MemoryStorage: Could not load data file, starting fresh');
    }
  }

  private generateId(): string {
    return `id_${++this.idCounter}_${Date.now()}`;
  }

  /**
   * CRITICAL FIX: Clean up old data to prevent memory leaks
   */
  private cleanupOldData(): void {
    try {
      // Remove usage stats older than TTL
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.USAGE_STATS_TTL_DAYS);
      
      let statsDeleted = 0;
      for (const [id, stat] of this.usageStats.entries()) {
        if (stat.date < cutoffDate) {
          this.usageStats.delete(id);
          statsDeleted++;
        }
      }

      // Limit recordings to MAX_RECORDINGS (keep newest)
      if (this.recordings.size > this.MAX_RECORDINGS) {
        const sorted = Array.from(this.recordings.entries())
          .sort((a, b) => b[1].createdAt.getTime() - a[1].createdAt.getTime());
        
        const toRemove = sorted.slice(this.MAX_RECORDINGS);
        toRemove.forEach(([id]) => this.recordings.delete(id));
        
        console.log(`MemoryStorage: Cleaned up ${toRemove.length} old recordings`);
      }

      // Limit usage stats to MAX_USAGE_STATS (keep newest)
      if (this.usageStats.size > this.MAX_USAGE_STATS) {
        const sorted = Array.from(this.usageStats.entries())
          .sort((a, b) => b[1].date.getTime() - a[1].date.getTime());
        
        const toRemove = sorted.slice(this.MAX_USAGE_STATS);
        toRemove.forEach(([id]) => this.usageStats.delete(id));
        
        console.log(`MemoryStorage: Cleaned up ${toRemove.length} old usage stats`);
      }

      if (statsDeleted > 0) {
        console.log(`MemoryStorage: Cleaned up ${statsDeleted} expired usage stats`);
      }
    } catch (error) {
      console.error("MemoryStorage: Cleanup error:", error);
    }
  }

  /**
   * Get current memory usage statistics
   */
  getMemoryStats(): { agents: number; profiles: number; presets: number; stats: number; recordings: number } {
    return {
      agents: this.agents.size,
      profiles: this.customProfiles.size,
      presets: this.teamPresets.size,
      stats: this.usageStats.size,
      recordings: this.recordings.size,
    };
  }

  // Agent operations
  async getAgent(id: string): Promise<Agent | undefined> {
    return this.agents.get(id);
  }

  async getAllAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async createAgent(insertAgent: InsertAgentInput): Promise<Agent> {
    const agent: Agent = {
      id: this.generateId(),
      name: insertAgent.name,
      email: insertAgent.email,
      status: insertAgent.status || "offline",
      isProcessingActive: insertAgent.isProcessingActive || false,
      audioSettings: insertAgent.audioSettings || defaultAudioSettings,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.agents.set(agent.id, agent);
    return agent;
  }

  async updateAgentSettings(id: string, settings: UpdateAgentSettings): Promise<Agent | undefined> {
    const agent = this.agents.get(id);
    if (!agent) return undefined;

    const updatedSettings = settings.audioSettings 
      ? { ...agent.audioSettings, ...settings.audioSettings }
      : agent.audioSettings;

    const updatedAgent: Agent = {
      ...agent,
      status: settings.status ?? agent.status,
      isProcessingActive: settings.isProcessingActive ?? agent.isProcessingActive,
      audioSettings: updatedSettings,
      updatedAt: new Date(),
    };

    this.agents.set(id, updatedAgent);
    return updatedAgent;
  }

  async deleteAgent(id: string): Promise<boolean> {
    return this.agents.delete(id);
  }

  async getAgentCount(): Promise<number> {
    return this.agents.size;
  }

  async getActiveAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values()).filter(a => a.status !== 'offline');
  }

  // Custom profiles
  async getCustomProfiles(agentId: string): Promise<CustomProfile[]> {
    return Array.from(this.customProfiles.values())
      .filter(p => p.agentId === agentId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getSharedProfiles(): Promise<CustomProfile[]> {
    return Array.from(this.customProfiles.values())
      .filter(p => p.isShared)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async createCustomProfile(profile: Omit<InsertCustomProfile, "id" | "createdAt">): Promise<CustomProfile> {
    const newProfile: CustomProfile = {
      ...profile,
      id: this.generateId(),
      createdAt: new Date(),
    };
    this.customProfiles.set(newProfile.id, newProfile);
    return newProfile;
  }

  async deleteCustomProfile(id: string): Promise<boolean> {
    return this.customProfiles.delete(id);
  }

  // Team presets
  async getAllTeamPresets(): Promise<TeamPreset[]> {
    return Array.from(this.teamPresets.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getActiveTeamPresets(): Promise<TeamPreset[]> {
    return Array.from(this.teamPresets.values())
      .filter(p => p.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async createTeamPreset(preset: Omit<InsertTeamPreset, "id" | "createdAt" | "updatedAt">): Promise<TeamPreset> {
    const newPreset: TeamPreset = {
      ...preset,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.teamPresets.set(newPreset.id, newPreset);
    return newPreset;
  }

  async updateTeamPreset(id: string, preset: Partial<InsertTeamPreset>): Promise<TeamPreset | undefined> {
    const existing = this.teamPresets.get(id);
    if (!existing) return undefined;

    const updated: TeamPreset = {
      ...existing,
      ...preset,
      updatedAt: new Date(),
    };
    this.teamPresets.set(id, updated);
    return updated;
  }

  async deleteTeamPreset(id: string): Promise<boolean> {
    return this.teamPresets.delete(id);
  }

  // Usage stats
  async getAgentStats(agentId: string, days = 30): Promise<UsageStats[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return Array.from(this.usageStats.values())
      .filter(s => s.agentId === agentId && s.date >= cutoffDate)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async getAllStats(days = 30): Promise<UsageStats[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return Array.from(this.usageStats.values())
      .filter(s => s.date >= cutoffDate)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async recordUsage(stats: Omit<InsertUsageStats, "id">): Promise<UsageStats> {
    const newStats: UsageStats = {
      ...stats,
      id: this.generateId(),
    };
    this.usageStats.set(newStats.id, newStats);
    return newStats;
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
    return Array.from(this.recordings.values())
      .filter(r => r.agentId === agentId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createRecording(recording: Omit<InsertRecording, "id" | "createdAt">): Promise<Recording> {
    const newRecording: Recording = {
      ...recording,
      id: this.generateId(),
      createdAt: new Date(),
    };
    this.recordings.set(newRecording.id, newRecording);
    return newRecording;
  }

  async deleteRecording(id: string): Promise<boolean> {
    return this.recordings.delete(id);
  }

  // Seed sample agents for demo
  async seedSampleAgents(): Promise<void> {
    if (this.agents.size > 0) {
      console.log(`Memory storage already has ${this.agents.size} agents, skipping seed.`);
      return;
    }

    console.log("Seeding sample agents...");
    
    const sampleAgents: InsertAgentInput[] = [
      { name: "Sarah Johnson", email: "sarah.j@company.com", status: "busy", isProcessingActive: true, audioSettings: { ...defaultAudioSettings, noiseReductionEnabled: true } },
      { name: "Michael Chen", email: "m.chen@company.com", status: "online", isProcessingActive: true, audioSettings: { ...defaultAudioSettings, accentModifierEnabled: true, accentPreset: "warm" } },
      { name: "Emily Rodriguez", email: "e.rodriguez@company.com", status: "busy", isProcessingActive: true, audioSettings: { ...defaultAudioSettings, noiseReductionEnabled: true, noiseReductionLevel: 75 } },
      { name: "David Kim", email: "d.kim@company.com", status: "online", isProcessingActive: false, audioSettings: defaultAudioSettings },
      { name: "Jessica Martinez", email: "j.martinez@company.com", status: "away", isProcessingActive: false, audioSettings: defaultAudioSettings },
    ];

    for (const agent of sampleAgents) {
      await this.createAgent(agent);
    }

    console.log(`Seeded ${sampleAgents.length} sample agents.`);
  }
}
