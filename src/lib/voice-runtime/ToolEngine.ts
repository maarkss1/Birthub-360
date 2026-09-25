import { observability } from './Observability';

// Raised whenever a tool call is refused for scope reasons — kept distinct from "tool not found"
// or the tool's own execution errors so callers (and observability consumers) can tell "the
// agent tried to overreach" apart from "the agent asked for something that doesn't exist" or
// "the tool itself broke".
export class ToolPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolPermissionError';
  }
}

export interface ToolExecutionContext {
  tenantId: string;
  // Tool names this specific agent/session is explicitly allowed to call — normally derived
  // from the agent's own configuration (AgentConfiguration.tools). A voice agent must never be
  // able to invoke a tool just because *some* tenant registered it platform-wide; every call is
  // scoped to what this tenant/agent actually opted into.
  allowedTools: string[];
  // Elevated capabilities explicitly granted to this tenant/session (e.g. 'tools:admin'). Most
  // voice-agent sessions hold none of these — only administrative/back-office callers do.
  grantedPermissions: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  // A tool that touches administrative/cross-tenant capability (billing, tenant management,
  // bulk export, etc.) declares the permission it requires here. Tools with no special
  // requirement are available to any tenant that has explicitly enabled them (see
  // ToolExecutionContext.allowedTools) — undefined/omitted means "no extra permission beyond
  // being enabled for this tenant".
  requiredPermission?: string;
  execute: (args: Record<string, unknown>, ctx: ToolExecutionContext) => Promise<unknown>;
}

export class ToolExecutionEngine {
  private registeredTools: Map<string, ToolDefinition> = new Map();

  public registerTool(tool: ToolDefinition) {
    this.registeredTools.set(tool.name, tool);
  }

  public async executeTool(
    sessionId: string,
    toolName: string,
    args: Record<string, unknown>,
    ctx: ToolExecutionContext
  ): Promise<unknown> {
    const tool = this.registeredTools.get(toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    // Tenant scope: the tool must be explicitly enabled for this tenant/agent — being globally
    // registered on the platform is not authorization. This is the "um agente de voz não deve
    // conseguir chamar uma ferramenta administrativa fora do que o tenant autorizou" requirement
    // (AGENTS.md, Onda 2, Agente 04).
    if (!ctx.allowedTools.includes(toolName)) {
      observability.logEvent(sessionId, 'TOOL_EXECUTION_DENIED', {
        tool: toolName,
        tenantId: ctx.tenantId,
        reason: 'tool_not_enabled_for_tenant'
      });
      throw new ToolPermissionError(`Tool ${toolName} is not enabled for tenant ${ctx.tenantId}`);
    }

    // Permission scope: an administrative-capability tool additionally requires an explicitly
    // granted permission, independent of whether the tool name is in allowedTools.
    if (tool.requiredPermission && !ctx.grantedPermissions.includes(tool.requiredPermission)) {
      observability.logEvent(sessionId, 'TOOL_EXECUTION_DENIED', {
        tool: toolName,
        tenantId: ctx.tenantId,
        reason: 'missing_permission',
        requiredPermission: tool.requiredPermission
      });
      throw new ToolPermissionError(`Tool ${toolName} requires permission '${tool.requiredPermission}', which tenant ${ctx.tenantId} does not hold for this session`);
    }

    observability.startSpan(`tool-${sessionId}`);
    observability.logEvent(sessionId, 'TOOL_EXECUTION_STARTED', { tool: toolName, args, tenantId: ctx.tenantId });

    try {
      const result = await tool.execute(args, ctx);
      observability.endSpan(`tool-${sessionId}`, sessionId, 'TOOL_EXECUTION_COMPLETED', { tool: toolName, result });
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      observability.endSpan(`tool-${sessionId}`, sessionId, 'TOOL_EXECUTION_FAILED', { tool: toolName, error: message });
      throw error;
    }
  }

  public getAvailableTools(ctx?: Pick<ToolExecutionContext, 'allowedTools'>): Array<{ name: string; description: string; parameters: Record<string, unknown> }> {
    const tools = Array.from(this.registeredTools.values())
      // Without a context, callers get the full catalog (e.g. an admin-facing tool registry
      // page); with one, only what that tenant/agent may actually invoke — never advertise a
      // tool as "available" that executeTool would then refuse.
      .filter(t => !ctx || ctx.allowedTools.includes(t.name));

    return tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }));
  }
}

export const toolEngine = new ToolExecutionEngine();
