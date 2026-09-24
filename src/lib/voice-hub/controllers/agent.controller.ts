import { Request, Response } from 'express';
import { agentSchema } from '../validators/index.js';
import { listAgents, createAgent, deleteAgent, getAgent, updateAgentConfig } from '../services/agentService.js';

export async function listAgentsHandler(req: Request, res: Response) {
  const agents = await listAgents(req.tenantId!);
  res.json({ agents });
}

export async function getAgentHandler(req: Request, res: Response) {
  const agent = await getAgent(String(req.params.id), req.tenantId!);
  if (!agent) return res.status(404).json({ error: 'Agente não encontrado.' });
  res.json({ agent });
}

export async function createAgentHandler(req: Request, res: Response) {
  const parsed = agentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const agent = await createAgent(req.tenantId!, req.user!.id, parsed.data);
  res.json({ success: true, agent });
}

export async function updateAgentConfigHandler(req: Request, res: Response) {
  try {
     const agent = await updateAgentConfig(String(req.params.id), req.tenantId!, req.body);
     res.json({ success: true, agent });
  } catch (err: unknown) {
     res.status(404).json({ error: err instanceof Error ? err.message : String(err) });
  }
}

export async function deleteAgentHandler(req: Request, res: Response) {
  await deleteAgent(String(String(req.params.id)), req.tenantId!);
  res.json({ success: true });
}
