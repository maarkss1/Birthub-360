import { ConversationTurn, MemoryNode, MemoryLevel } from './types';
import { observability } from './Observability';

export class MemoryPipeline {
  private memoryStore: Map<string, {
    immediate: MemoryNode[];
    session: MemoryNode[];
    persistent: MemoryNode[];
    historical: MemoryNode[];
  }> = new Map();

  public initialize(sessionId: string, initialContext: Record<string, unknown> = {}) {
    this.memoryStore.set(sessionId, {
      immediate: [],
      session: [],
      persistent: [],
      historical: []
    });
    
    // Add initial context to persistent memory
    if (Object.keys(initialContext).length > 0) {
      this.addMemoryNode(sessionId, 'persistent', initialContext, null, 100);
    }
  }

  private addMemoryNode(
    sessionId: string, 
    level: MemoryLevel,
    content: unknown,
    ttl: number | null = null, 
    priority: number = 50,
    relationships: string[] = []
  ): MemoryNode {
    const memory = this.memoryStore.get(sessionId);
    if (!memory) throw new Error('Session memory not initialized');

    const node: MemoryNode = {
      id: `mem_${crypto.randomUUID()}`,
      level,
      content,
      ttl,
      priority,
      compressed: false,
      version: 1,
      relationships,
      timestamp: Date.now()
    };

    memory[level].push(node);
    return node;
  }

  public addTurn(sessionId: string, rawTurn: ConversationTurn) {
    const memory = this.memoryStore.get(sessionId);
    if (!memory) return;

    // 1. Immediate Memory (TTL: very short, highly contextual)
    const turnNode = this.addMemoryNode(sessionId, 'immediate', rawTurn, 60000, 90);

    observability.logEvent(sessionId, 'MEMORY_IMMEDIATE_UPDATED', { role: rawTurn.role, nodeId: turnNode.id });

    // 2. Session Memory (TTL: session duration)
    // We clone it to session memory as well
    this.addMemoryNode(sessionId, 'session', rawTurn, null, 70, [turnNode.id]);

    // Cleanup immediate memory based on length (simulate TTL for immediate)
    if (memory.immediate.length > 5) {
      this.compressAndShiftImmediate(sessionId);
    }
  }

  private compressAndShiftImmediate(sessionId: string) {
    const memory = this.memoryStore.get(sessionId);
    if (!memory) return;

    observability.startSpan(`memory-compression-${sessionId}`);
    
    // Move older immediate memories to compressed session summaries if needed
    const oldImmediate = memory.immediate.shift();
    if (oldImmediate) {
      oldImmediate.compressed = true;
      oldImmediate.version += 1;
      // In a real scenario, this would trigger an LLM compression task
    }

    observability.endSpan(`memory-compression-${sessionId}`, sessionId, 'MEMORY_COMPRESSION_COMPLETED');
  }

  public updatePersistentSummary(sessionId: string, summary: string) {
    // 3. Persistent Summary
    this.addMemoryNode(sessionId, 'persistent', { summary }, null, 100);
    observability.logEvent(sessionId, 'MEMORY_PERSISTENT_UPDATED', { summaryLength: summary.length });
  }

  public getContext(sessionId: string) {
    const memory = this.memoryStore.get(sessionId);
    if (!memory) return null;

    // Filter out expired TTLs (Mocking TTL check)
    const now = Date.now();
    const activeImmediate = memory.immediate.filter(m => m.ttl === null || now - m.timestamp < m.ttl);

    return {
      immediate: activeImmediate.map(m => m.content),
      session: memory.session.map(m => m.content),
      persistent: memory.persistent.map(m => m.content),
      historical: memory.historical.map(m => m.content)
    };
  }

  public clear(sessionId: string) {
    this.memoryStore.delete(sessionId);
  }
}

export const memoryPipeline = new MemoryPipeline();
