import { Ollama } from 'ollama';

export const ollamaClient = new Ollama({
  host: process.env.OLLAMA_HOST || 'http://localhost:11434',
});

export async function generateLocalResponse(model: string, prompt: string) {
  const response = await ollamaClient.generate({
    model,
    prompt,
  });
  return response.response;
}
