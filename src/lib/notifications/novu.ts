import { Novu } from '@novu/node';

let novuClient: Novu | null = null;

export function getNovuClient() {
  if (!novuClient && process.env.NOVU_API_KEY) {
    novuClient = new Novu(process.env.NOVU_API_KEY);
  }
  return novuClient;
}
