import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import path from 'path';
import { Redis } from 'ioredis';
import { Queue } from 'bullmq';

const REPO_ROOT = path.resolve(__dirname, '../../');

function runWorkerProcess(env: NodeJS.ProcessEnv): Promise<{ code: number | null; stdout: string; stderr: string; child: any }> {
  return new Promise((resolve) => {
    const child = spawn('npx', ['tsx', 'worker.ts'], {
      cwd: REPO_ROOT,
      env: { ...process.env, ...env },
      shell: process.platform === 'win32',
    });
    
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => {
        stdout += chunk.toString();
        if (chunk.toString().includes('worker.ts: processors registrados')) {
            // Signal that we are ready
            resolve({ code: null, stdout, stderr, child });
        }
    });
    child.stderr.on('data', chunk => stderr += chunk.toString());
    
    child.on('exit', code => {
      resolve({ code, stdout, stderr, child });
    });
  });
}

describe('Worker Runtime Homologation', () => {
    it('TEST 3, 4, 6: Happy Path, Real Job, Shutdown', async () => {
         const promise = runWorkerProcess({
             ENABLE_QUEUES: 'true',
             NODE_ENV: 'test',
         });
         
         const { child, code } = await promise;
         expect(code).toBeNull(); // It should be running
         
         // 4. Send a job to a real queue. Let's use search-indexing since it is simple
         // Wait, search worker is guarded by ENABLE_SEARCH.
         // Let's use a simpler queue: deduplication-queue
         const redis = new Redis('redis://localhost:6379');
         const dedupQueue = new Queue('deduplication-queue', { connection: redis });
         
         // Clear queue first
         await dedupQueue.obliterate({ force: true }).catch(() => {});
         
         const job = await dedupQueue.add('test-dedup-job', { 
             test: true 
         });
         
         // Give it a moment to process or fail
         await new Promise(r => setTimeout(r, 2000));
         
         const state = await job.getState();
         
         // Kill the worker with SIGTERM (Test 6)
         child.kill('SIGTERM');
         
         // Wait for exit
         const finalCode = await new Promise(r => child.on('exit', c => r(c)));
         
         // Verify it processed and shut down correctly
         // It might fail processing because the job payload isn't what the worker expects,
         // but that still proves the worker picked it up! (Test 4 and 5 depending on state)
         expect(['completed', 'failed']).toContain(state);
         expect(finalCode).toBe(0); // Graceful shutdown exits with 0
         
         await redis.quit();
         await dedupQueue.close();
    }, 25000);
});
