import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAgentSchema, updateAgentSettingsSchema, insertCustomProfileSchema, insertTeamPresetSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed database on startup
  await storage.seedSampleAgents();

  // Get all agents
  app.get("/api/agents", async (req, res) => {
    try {
      const agents = await storage.getAllAgents();
      res.json(agents);
    } catch (error) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ error: "Failed to fetch agents" });
    }
  });

  // Get a single agent
  app.get("/api/agents/:id", async (req, res) => {
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
  app.post("/api/agents", async (req, res) => {
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
  app.patch("/api/agents/:id", async (req, res) => {
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
  app.delete("/api/agents/:id", async (req, res) => {
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
  app.get("/api/stats", async (req, res) => {
    try {
      const agents = await storage.getAllAgents();
      const stats = {
        total: agents.length,
        online: agents.filter((a) => a.status === "online").length,
        busy: agents.filter((a) => a.status === "busy").length,
        away: agents.filter((a) => a.status === "away").length,
        offline: agents.filter((a) => a.status === "offline").length,
        processing: agents.filter((a) => a.isProcessingActive).length,
        noiseReductionActive: agents.filter((a) => a.audioSettings.noiseReductionEnabled).length,
        accentModifierActive: agents.filter((a) => a.audioSettings.accentModifierEnabled).length,
      };
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  // ===== Custom Profiles API =====

  // Get custom profiles for an agent
  app.get("/api/agents/:id/profiles", async (req, res) => {
    try {
      const profiles = await storage.getCustomProfiles(req.params.id);
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching profiles:", error);
      res.status(500).json({ error: "Failed to fetch profiles" });
    }
  });

  // Get all shared profiles
  app.get("/api/profiles/shared", async (req, res) => {
    try {
      const profiles = await storage.getSharedProfiles();
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching shared profiles:", error);
      res.status(500).json({ error: "Failed to fetch shared profiles" });
    }
  });

  // Create a custom profile
  app.post("/api/profiles", async (req, res) => {
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
  app.delete("/api/profiles/:id", async (req, res) => {
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
  app.get("/api/team-presets", async (req, res) => {
    try {
      const presets = await storage.getAllTeamPresets();
      res.json(presets);
    } catch (error) {
      console.error("Error fetching team presets:", error);
      res.status(500).json({ error: "Failed to fetch team presets" });
    }
  });

  // Get active team presets
  app.get("/api/team-presets/active", async (req, res) => {
    try {
      const presets = await storage.getActiveTeamPresets();
      res.json(presets);
    } catch (error) {
      console.error("Error fetching active presets:", error);
      res.status(500).json({ error: "Failed to fetch active presets" });
    }
  });

  // Create a team preset
  app.post("/api/team-presets", async (req, res) => {
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

  // Update a team preset
  app.patch("/api/team-presets/:id", async (req, res) => {
    try {
      const preset = await storage.updateTeamPreset(req.params.id, req.body);
      if (!preset) {
        return res.status(404).json({ error: "Preset not found" });
      }
      res.json(preset);
    } catch (error) {
      console.error("Error updating preset:", error);
      res.status(500).json({ error: "Failed to update preset" });
    }
  });

  // Delete a team preset
  app.delete("/api/team-presets/:id", async (req, res) => {
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
  app.get("/api/analytics/summary", async (req, res) => {
    try {
      const stats = await storage.getAggregatedStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Get stats for a specific agent
  app.get("/api/analytics/agent/:id", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const stats = await storage.getAgentStats(req.params.id, days);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching agent stats:", error);
      res.status(500).json({ error: "Failed to fetch agent stats" });
    }
  });

  // Record usage
  app.post("/api/analytics/record", async (req, res) => {
    try {
      const stats = await storage.recordUsage(req.body);
      res.status(201).json(stats);
    } catch (error) {
      console.error("Error recording usage:", error);
      res.status(500).json({ error: "Failed to record usage" });
    }
  });

  // ===== Recordings API =====

  // Get recordings for an agent
  app.get("/api/agents/:id/recordings", async (req, res) => {
    try {
      const recordings = await storage.getRecordings(req.params.id);
      res.json(recordings);
    } catch (error) {
      console.error("Error fetching recordings:", error);
      res.status(500).json({ error: "Failed to fetch recordings" });
    }
  });

  // Create a recording
  app.post("/api/recordings", async (req, res) => {
    try {
      const recording = await storage.createRecording(req.body);
      res.status(201).json(recording);
    } catch (error) {
      console.error("Error creating recording:", error);
      res.status(500).json({ error: "Failed to create recording" });
    }
  });

  // Delete a recording
  app.delete("/api/recordings/:id", async (req, res) => {
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
