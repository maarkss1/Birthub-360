import { Request, Response } from 'express';
import { addComment, resolveComment, lockNode, unlockNode, ConflictError } from '../services/workflowCollabService.js';
import { NotFoundError } from '../services/workflowService.js';

function handleCollabError(err: unknown, res: Response) {
  if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
  if (err instanceof ConflictError) return res.status(409).json({ error: err.message });
  throw err;
}

export async function addCommentHandler(req: Request, res: Response) {
  try {
    const { nodeId, text } = req.body;
    if (!nodeId || !text) return res.status(400).json({ error: 'nodeId e text são obrigatórios.' });

    const workflow = await addComment(req.tenantId!, req.user!.id, nodeId, text);
    res.json({ success: true, workflow });
  } catch (err) {
    handleCollabError(err, res);
  }
}

export async function resolveCommentHandler(req: Request, res: Response) {
  try {
    const { commentId } = req.body;
    if (!commentId) return res.status(400).json({ error: 'commentId é obrigatório.' });

    const workflow = await resolveComment(req.tenantId!, req.user!.id, commentId);
    res.json({ success: true, workflow });
  } catch (err) {
    handleCollabError(err, res);
  }
}

export async function lockNodeHandler(req: Request, res: Response) {
  try {
    const { nodeId } = req.body;
    if (!nodeId) return res.status(400).json({ error: 'nodeId é obrigatório.' });

    const workflow = await lockNode(req.tenantId!, req.user!.id, nodeId);
    res.json({ success: true, workflow });
  } catch (err) {
    handleCollabError(err, res);
  }
}

export async function unlockNodeHandler(req: Request, res: Response) {
  try {
    const { nodeId } = req.body;
    if (!nodeId) return res.status(400).json({ error: 'nodeId é obrigatório.' });

    const workflow = await unlockNode(req.tenantId!, req.user!.id, nodeId);
    res.json({ success: true, workflow });
  } catch (err) {
    handleCollabError(err, res);
  }
}
