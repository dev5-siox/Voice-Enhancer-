import { randomUUID } from "crypto";
import type { 
  Agent, 
  InsertAgent, 
  UpdateAgentSettings,
  AudioSettings 
} from "@shared/schema";
import { defaultAudioSettings } from "@shared/schema";

export interface IStorage {
  // Agent operations
  getAgent(id: string): Promise<Agent | undefined>;
  getAllAgents(): Promise<Agent[]>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgentSettings(id: string, settings: UpdateAgentSettings): Promise<Agent | undefined>;
  deleteAgent(id: string): Promise<boolean>;
  
  // Bulk operations
  getAgentCount(): Promise<number>;
  getActiveAgents(): Promise<Agent[]>;
}

export class MemStorage implements IStorage {
  private agents: Map<string, Agent>;

  constructor() {
    this.agents = new Map();
    // Initialize with sample agents for demo
    this.initializeSampleAgents();
  }

  private initializeSampleAgents() {
    const sampleAgents: InsertAgent[] = [
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

    sampleAgents.forEach((agent, index) => {
      const id = randomUUID();
      const callDuration = agent.status === "busy" ? Math.floor(Math.random() * 900) + 60 : 0;
      const latency = agent.isProcessingActive ? Math.floor(Math.random() * 30) + 10 : 0;
      
      this.agents.set(id, {
        id,
        name: agent.name,
        email: agent.email,
        status: agent.status,
        isProcessingActive: agent.isProcessingActive,
        audioSettings: agent.audioSettings,
        callDuration,
        latency,
      });
    });
  }

  async getAgent(id: string): Promise<Agent | undefined> {
    return this.agents.get(id);
  }

  async getAllAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values());
  }

  async createAgent(insertAgent: InsertAgent): Promise<Agent> {
    const id = randomUUID();
    const agent: Agent = {
      id,
      name: insertAgent.name,
      email: insertAgent.email,
      status: insertAgent.status || "offline",
      isProcessingActive: insertAgent.isProcessingActive || false,
      audioSettings: insertAgent.audioSettings || defaultAudioSettings,
      callDuration: 0,
      latency: 0,
    };
    this.agents.set(id, agent);
    return agent;
  }

  async updateAgentSettings(id: string, settings: UpdateAgentSettings): Promise<Agent | undefined> {
    const agent = this.agents.get(id);
    if (!agent) return undefined;

    const updatedAgent: Agent = {
      ...agent,
      status: settings.status ?? agent.status,
      isProcessingActive: settings.isProcessingActive ?? agent.isProcessingActive,
      audioSettings: settings.audioSettings 
        ? { ...agent.audioSettings, ...settings.audioSettings }
        : agent.audioSettings,
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
    return Array.from(this.agents.values()).filter(
      (agent) => agent.status !== "offline"
    );
  }
}

export const storage = new MemStorage();
