import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertAgentSchema, 
  updateAgentSettingsSchema, 
  insertCustomProfileSchema, 
  insertTeamPresetSchema,
  teamPresets,
  audioSettingsSchema
} from "@shared/schema";
import { createInsertSchema } from "drizzle-zod";
import { usageStats, recordings } from "@shared/schema";
import { z } from "zod";
import { 
  requireAuth, 
  requireAdmin, 
  optionalAuth,
  handleLogin, 
  handleLogout, 
  handleGetCurrentUser,
  handleRegisterUser 
} from "./auth";

const insertUsageStatsSchema = createInsertSchema(usageStats);
const insertRecordingSchema = createInsertSchema(recordings, { audioSettings: audioSettingsSchema });
const updateTeamPresetSchema = insertTeamPresetSchema.partial();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ===== Authentication Routes (No auth required) =====
  app.post("/api/auth/login", handleLogin);
  app.post("/api/auth/logout", requireAuth, handleLogout);
  app.get("/api/auth/me", requireAuth, handleGetCurrentUser);
  app.post("/api/auth/register", requireAuth, requireAdmin, handleRegisterUser);

  // Seed database on startup - with error handling
  try {
    await storage.seedSampleAgents();
  } catch (error) {
    console.error("❌ Failed to seed sample agents:", error);
    // Continue startup - don't crash server if seeding fails
  }

  // ===== Agent Routes (Require Authentication) =====
  
  // Get all agents
  app.get("/api/agents", optionalAuth, async (req, res) => {
    try {
      const agents = await storage.getAllAgents();
      res.json(agents);
    } catch (error) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ error: "Failed to fetch agents" });
    }
  });

  // Get a single agent
  app.get("/api/agents/:id", optionalAuth, async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      res.json(agent);
    } catch (error) {
      console.error("Error fetching agent:", error);
      res.status(500).json({ error: "Failed to fetch agent" });
    }
  });

  // Create a new agent
  app.post("/api/agents", optionalAuth, async (req, res) => {
    try {
      const validatedData = insertAgentSchema.parse(req.body);
      const agent = await storage.createAgent(validatedData);
      res.status(201).json(agent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid agent data", details: error.errors });
      }
      console.error("Error creating agent:", error);
      res.status(500).json({ error: "Failed to create agent" });
    }
  });

  // Update agent settings
  app.patch("/api/agents/:id", optionalAuth, async (req, res) => {
    try {
      const validatedData = updateAgentSettingsSchema.parse(req.body);
      const agent = await storage.updateAgentSettings(req.params.id, validatedData);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      res.json(agent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid settings data", details: error.errors });
      }
      console.error("Error updating agent:", error);
      res.status(500).json({ error: "Failed to update agent" });
    }
  });

  // Delete an agent
  app.delete("/api/agents/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteAgent(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Agent not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting agent:", error);
      res.status(500).json({ error: "Failed to delete agent" });
    }
  });

  // Get agent statistics
  app.get("/api/stats", optionalAuth, async (req, res) => {
    try {
      const agents = await storage.getAllAgents();
      
      // Count preset usage across all agents
      const presetUsage: Record<string, number> = {};
      agents.forEach((a) => {
        const preset = a.audioSettings.accentPreset || "neutral";
        presetUsage[preset] = (presetUsage[preset] || 0) + 1;
      });

      // Calculate average settings
      const avgNoiseReduction = agents.reduce((sum, a) => sum + (a.audioSettings.noiseReductionLevel || 50), 0) / agents.length;
      const avgClarityBoost = agents.reduce((sum, a) => sum + (a.audioSettings.clarityBoost || 0), 0) / agents.length;
      const volumeNormalizationCount = agents.filter((a) => a.audioSettings.volumeNormalization).length;

      const stats = {
        total: agents.length,
        online: agents.filter((a) => a.status === "online").length,
        busy: agents.filter((a) => a.status === "busy").length,
        away: agents.filter((a) => a.status === "away").length,
        offline: agents.filter((a) => a.status === "offline").length,
        processing: agents.filter((a) => a.isProcessingActive).length,
        noiseReductionActive: agents.filter((a) => a.audioSettings.noiseReductionEnabled).length,
        accentModifierActive: agents.filter((a) => a.audioSettings.accentModifierEnabled).length,
        presetUsage,
        avgNoiseReduction: Math.round(avgNoiseReduction),
        avgClarityBoost: Math.round(avgClarityBoost),
        volumeNormalizationCount,
      };
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  // ===== Custom Profiles API =====

  // Get custom profiles for an agent
  app.get("/api/agents/:id/profiles", optionalAuth, async (req, res) => {
    try {
      const profiles = await storage.getCustomProfiles(req.params.id);
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching profiles:", error);
      res.status(500).json({ error: "Failed to fetch profiles" });
    }
  });

  // Get all shared profiles
  app.get("/api/profiles/shared", optionalAuth, async (req, res) => {
    try {
      const profiles = await storage.getSharedProfiles();
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching shared profiles:", error);
      res.status(500).json({ error: "Failed to fetch shared profiles" });
    }
  });

  // Create a custom profile
  app.post("/api/profiles", optionalAuth, async (req, res) => {
    try {
      const validatedData = insertCustomProfileSchema.parse(req.body);
      const profile = await storage.createCustomProfile(validatedData);
      res.status(201).json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid profile data", details: error.errors });
      }
      console.error("Error creating profile:", error);
      res.status(500).json({ error: "Failed to create profile" });
    }
  });

  // Delete a custom profile
  app.delete("/api/profiles/:id", optionalAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteCustomProfile(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting profile:", error);
      res.status(500).json({ error: "Failed to delete profile" });
    }
  });

  // ===== Team Presets API =====

  // Get all team presets
  app.get("/api/team-presets", optionalAuth, async (req, res) => {
    try {
      const presets = await storage.getAllTeamPresets();
      res.json(presets);
    } catch (error) {
      console.error("Error fetching team presets:", error);
      res.status(500).json({ error: "Failed to fetch team presets" });
    }
  });

  // Get active team presets
  app.get("/api/team-presets/active", optionalAuth, async (req, res) => {
    try {
      const presets = await storage.getActiveTeamPresets();
      res.json(presets);
    } catch (error) {
      console.error("Error fetching active presets:", error);
      res.status(500).json({ error: "Failed to fetch active presets" });
    }
  });

  // Create a team preset
  app.post("/api/team-presets", requireAuth, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertTeamPresetSchema.parse(req.body);
      const preset = await storage.createTeamPreset(validatedData);
      res.status(201).json(preset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid preset data", details: error.errors });
      }
      console.error("Error creating preset:", error);
      res.status(500).json({ error: "Failed to create preset" });
    }
  });

  // Update a team preset - NOW WITH VALIDATION
  app.patch("/api/team-presets/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const validatedData = updateTeamPresetSchema.parse(req.body);
      const preset = await storage.updateTeamPreset(req.params.id, validatedData);
      if (!preset) {
        return res.status(404).json({ error: "Preset not found" });
      }
      res.json(preset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid preset data", details: error.errors });
      }
      console.error("Error updating preset:", error);
      res.status(500).json({ error: "Failed to update preset" });
    }
  });

  // Delete a team preset
  app.delete("/api/team-presets/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteTeamPreset(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Preset not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting preset:", error);
      res.status(500).json({ error: "Failed to delete preset" });
    }
  });

  // ===== Usage Analytics API =====

  // Get aggregated stats
  app.get("/api/analytics/summary", optionalAuth, async (req, res) => {
    try {
      const stats = await storage.getAggregatedStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Get stats for a specific agent
  app.get("/api/analytics/agent/:id", optionalAuth, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const stats = await storage.getAgentStats(req.params.id, days);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching agent stats:", error);
      res.status(500).json({ error: "Failed to fetch agent stats" });
    }
  });

  // Record usage - NOW WITH VALIDATION
  app.post("/api/analytics/record", optionalAuth, async (req, res) => {
    try {
      const validatedData = insertUsageStatsSchema.parse(req.body);
      const stats = await storage.recordUsage(validatedData);
      res.status(201).json(stats);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid usage data", details: error.errors });
      }
      console.error("Error recording usage:", error);
      res.status(500).json({ error: "Failed to record usage" });
    }
  });

  // ===== Recordings API =====

  // Get recordings for an agent
  app.get("/api/agents/:id/recordings", optionalAuth, async (req, res) => {
    try {
      const recordings = await storage.getRecordings(req.params.id);
      res.json(recordings);
    } catch (error) {
      console.error("Error fetching recordings:", error);
      res.status(500).json({ error: "Failed to fetch recordings" });
    }
  });

  // Create a recording - NOW WITH VALIDATION
  app.post("/api/recordings", optionalAuth, async (req, res) => {
    try {
      const validatedData = insertRecordingSchema.parse(req.body);
      const recording = await storage.createRecording(validatedData);
      res.status(201).json(recording);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid recording data", details: error.errors });
      }
      console.error("Error creating recording:", error);
      res.status(500).json({ error: "Failed to create recording" });
    }
  });

  // Delete a recording
  app.delete("/api/recordings/:id", optionalAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteRecording(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Recording not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting recording:", error);
      res.status(500).json({ error: "Failed to delete recording" });
    }
  });

  return httpServer;
}
