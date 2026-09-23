/**
 * OPA (Open Policy Agent) Enforcement Guard
 * This guard enforces authorization policies using an external OPA server.
 */
import { Request, Response, NextFunction } from 'express';

// Extend Express Request type to include user
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id?: string;
      role?: string;
    };
  }
}

export interface OpaInput {
  role?: string;
  userId?: string;
  resourceOwnerId?: string;
  method: string;
  path: string;
}

const OPA_URL = process.env.OPA_URL || 'http://localhost:8181/v1/data/birthhub/authz/allow';

export const opaGuard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input: OpaInput = {
      role: req.user?.role,
      userId: req.user?.id,
      resourceOwnerId: req.params?.id,
      method: req.method,
      path: req.path,
    };

    const response = await fetch(OPA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input }),
    });

    if (!response.ok) {
      console.error(`OPA request failed with status: ${response.status}`);
      return res.status(500).json({ error: 'Authorization service unavailable' }); // Fail-close
    }

    const data = await response.json() as { result?: boolean };

    if (data.result === true) {
      return next(); // Access granted
    } else {
      return res.status(403).json({ error: 'Forbidden by OPA policy' }); // Access denied
    }
  } catch (error) {
    console.error('OPA guard error:', error);
    // Fail-close securely in case of connection errors to OPA sidecar
    return res.status(500).json({ error: 'Authorization service unreachable' });
  }
};
