import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";

// Simple authentication middleware for development/demo
// In production, use proper session management, JWT, or OAuth

interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: "admin" | "agent";
}

// In-memory user store (replace with database in production)
const users: Map<string, User> = new Map();

// Default admin user (for demo purposes)
const DEFAULT_ADMIN = {
  id: "admin-1",
  username: "admin",
  passwordHash: bcrypt.hashSync("admin123", 10), // Change in production!
  role: "admin" as const,
};

users.set(DEFAULT_ADMIN.id, DEFAULT_ADMIN);

// Session store (replace with Redis or database in production)
const sessions: Map<string, { userId: string; expiresAt: number }> = new Map();

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionId?: string;
    }
  }
}

/**
 * Generate a session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
}

/**
 * Authentication middleware - checks for valid session
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.headers.authorization?.replace("Bearer ", "") || 
                    req.cookies?.sessionId;

  if (!sessionId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const session = sessions.get(sessionId);
  
  if (!session) {
    return res.status(401).json({ error: "Invalid session" });
  }

  // Check if session expired
  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    return res.status(401).json({ error: "Session expired" });
  }

  // Get user
  const user = users.get(session.userId);
  if (!user) {
    sessions.delete(sessionId);
    return res.status(401).json({ error: "User not found" });
  }

  // Attach user to request
  req.user = user;
  req.sessionId = sessionId;

  next();
}

/**
 * Authorization middleware - checks for admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
}

/**
 * Login endpoint handler
 */
export async function handleLogin(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    // Find user by username
    const user = Array.from(users.values()).find(u => u.username === username);
    
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!passwordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Create session (expires in 24 hours)
    const sessionId = generateSessionId();
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000);
    
    sessions.set(sessionId, {
      userId: user.id,
      expiresAt,
    });

    // Clean up expired sessions
    cleanExpiredSessions();

    res.json({
      sessionId,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      expiresAt,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
}

/**
 * Logout endpoint handler
 */
export function handleLogout(req: Request, res: Response) {
  const sessionId = req.sessionId;
  
  if (sessionId) {
    sessions.delete(sessionId);
  }

  res.json({ message: "Logged out successfully" });
}

/**
 * Get current user endpoint handler
 */
export function handleGetCurrentUser(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  res.json({
    id: req.user.id,
    username: req.user.username,
    role: req.user.role,
  });
}

/**
 * Clean up expired sessions
 */
function cleanExpiredSessions() {
  const now = Date.now();
  for (const [sessionId, session] of Array.from(sessions.entries())) {
    if (now > session.expiresAt) {
      sessions.delete(sessionId);
    }
  }
}

// Run cleanup every hour
setInterval(cleanExpiredSessions, 60 * 60 * 1000);

/**
 * Optional auth middleware - attaches user if session exists, but allows unauthenticated requests through
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.headers.authorization?.replace("Bearer ", "") || 
                    req.cookies?.sessionId;

  if (!sessionId) {
    return next();
  }

  const session = sessions.get(sessionId);
  if (!session || Date.now() > session.expiresAt) {
    if (session) sessions.delete(sessionId);
    return next();
  }

  const user = users.get(session.userId);
  if (user) {
    req.user = user;
    req.sessionId = sessionId;
  }

  next();
}

/**
 * Register a new user (admin only)
 */
export async function handleRegisterUser(req: Request, res: Response) {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    // Check if username already exists
    const existingUser = Array.from(users.values()).find(u => u.username === username);
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      username,
      passwordHash,
      role: role || "agent",
    };

    users.set(user.id, user);

    res.status(201).json({
      id: user.id,
      username: user.username,
      role: user.role,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
}
