// Session Management Service with proper persistence
import type { KVNamespace } from '@cloudflare/workers-types'

export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    intent?: string;
    queryType?: string;
    dbResults?: number;
    responseTime?: number;
  };
}

export interface Session {
  id: string;
  messages: SessionMessage[];
  createdAt: string;
  lastActivity: string;
  metadata?: {
    userAgent?: string;
    ip?: string;
  };
}

export class SessionManager {
  private kv: KVNamespace | null = null;
  private memoryStore: Map<string, Session> = new Map();
  private readonly SESSION_TTL = 86400; // 24 hours in seconds
  private readonly MAX_MESSAGES = 50; // Maximum messages per session

  constructor(kv?: KVNamespace) {
    this.kv = kv || null;
    
    // Clean up old sessions from memory every hour
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanupMemorySessions(), 3600000);
    }
  }

  // Generate unique session ID
  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get or create session
  async getSession(sessionId: string): Promise<Session> {
    // Try KV store first
    if (this.kv) {
      try {
        const stored = await this.kv.get(`session:${sessionId}`);
        if (stored) {
          const session = JSON.parse(stored);
          session.lastActivity = new Date().toISOString();
          // Update in KV with extended TTL
          await this.kv.put(
            `session:${sessionId}`, 
            JSON.stringify(session),
            { expirationTtl: this.SESSION_TTL }
          );
          return session;
        }
      } catch (error) {
        console.error('KV session read error:', error);
      }
    }

    // Check memory store
    const memorySession = this.memoryStore.get(sessionId);
    if (memorySession) {
      memorySession.lastActivity = new Date().toISOString();
      return memorySession;
    }

    // Create new session
    const newSession: Session = {
      id: sessionId,
      messages: [],
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    // Save to both stores
    await this.saveSession(newSession);
    return newSession;
  }

  // Save session
  async saveSession(session: Session): Promise<void> {
    // Limit messages to prevent memory issues
    if (session.messages.length > this.MAX_MESSAGES) {
      // Keep first system message if exists, then most recent messages
      const systemMessages = session.messages.filter(m => m.role === 'system').slice(0, 1);
      const recentMessages = session.messages.slice(-(this.MAX_MESSAGES - systemMessages.length));
      session.messages = [...systemMessages, ...recentMessages];
    }

    // Update last activity
    session.lastActivity = new Date().toISOString();

    // Save to memory
    this.memoryStore.set(session.id, session);

    // Save to KV if available
    if (this.kv) {
      try {
        await this.kv.put(
          `session:${session.id}`,
          JSON.stringify(session),
          { expirationTtl: this.SESSION_TTL }
        );
      } catch (error) {
        console.error('KV session save error:', error);
      }
    }
  }

  // Add message to session
  async addMessage(
    sessionId: string, 
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: SessionMessage['metadata']
  ): Promise<SessionMessage> {
    const session = await this.getSession(sessionId);
    
    const message: SessionMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date().toISOString(),
      metadata
    };

    session.messages.push(message);
    await this.saveSession(session);
    
    return message;
  }

  // Get session history for context
  async getSessionHistory(sessionId: string, limit: number = 10): Promise<SessionMessage[]> {
    const session = await this.getSession(sessionId);
    return session.messages.slice(-limit);
  }

  // Get full session
  async getFullSession(sessionId: string): Promise<Session> {
    return await this.getSession(sessionId);
  }

  // Clear session
  async clearSession(sessionId: string): Promise<void> {
    this.memoryStore.delete(sessionId);
    
    if (this.kv) {
      try {
        await this.kv.delete(`session:${sessionId}`);
      } catch (error) {
        console.error('KV session delete error:', error);
      }
    }
  }

  // Clean up old sessions from memory
  private cleanupMemorySessions(): void {
    const now = Date.now();
    const maxAge = this.SESSION_TTL * 1000; // Convert to milliseconds

    for (const [sessionId, session] of this.memoryStore.entries()) {
      const lastActivity = new Date(session.lastActivity).getTime();
      if (now - lastActivity > maxAge) {
        this.memoryStore.delete(sessionId);
      }
    }
  }

  // Get session statistics
  async getSessionStats(sessionId: string): Promise<any> {
    const session = await this.getSession(sessionId);
    
    const userMessages = session.messages.filter(m => m.role === 'user').length;
    const assistantMessages = session.messages.filter(m => m.role === 'assistant').length;
    const totalMessages = session.messages.length;
    
    const sessionDuration = Date.now() - new Date(session.createdAt).getTime();
    const avgResponseTime = session.messages
      .filter(m => m.metadata?.responseTime)
      .reduce((sum, m) => sum + (m.metadata?.responseTime || 0), 0) / assistantMessages || 0;

    return {
      sessionId,
      totalMessages,
      userMessages,
      assistantMessages,
      sessionDuration: Math.floor(sessionDuration / 1000), // in seconds
      avgResponseTime: Math.round(avgResponseTime),
      createdAt: session.createdAt,
      lastActivity: session.lastActivity
    };
  }

  // Export session for debugging
  async exportSession(sessionId: string): Promise<string> {
    const session = await this.getFullSession(sessionId);
    return JSON.stringify(session, null, 2);
  }
}

// Global instance for memory-based session management
let globalSessionManager: SessionManager | null = null;

export function getSessionManager(kv?: KVNamespace): SessionManager {
  if (!globalSessionManager) {
    globalSessionManager = new SessionManager(kv);
  }
  return globalSessionManager;
}