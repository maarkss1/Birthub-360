# Configuração do GitHub Codespace

Este arquivo contém instruções para configurar o ambiente do GitHub Codespace para o projeto Birth Hub 360.

## Configuração Automática

O Codespace já está configurado para:
- Usar uma imagem base Node.js 22
- Instalar dependências automaticamente
- Gerar o Prisma client
- Criar arquivo `.env` baseado no template `.env.codespace`

## Configuração Manual de Chaves de API

O arquivo `.env.codespace` contém placeholders para as chaves de API. Você precisa configurar as chaves reais do arquivo `CHAVES.pdf`:

### Chaves necessárias do CHAVES.pdf:

1. **Novu** (Notificações)
   - `NOVU_APPLICATION_IDENTIFIER=<valor do CHAVES.pdf>`
   - `NOVU_SECRET_KEY=<valor do CHAVES.pdf>`

2. **Sentry** (Error tracking)
   - `SENTRY_DSN=<valor do CHAVES.pdf>`
   - `VITE_SENTRY_DSN=<valor do CHAVES.pdf>`

3. **PostHog** (Analytics)
   - `POSTHOG_KEY=<valor do CHAVES.pdf>`
   - `VITE_POSTHOG_KEY=<valor do CHAVES.pdf>`

4. **Apollo** (Prospecção)
   - `APOLLO_API_KEY=<valor do CHAVES.pdf>`

5. **Groq** (IA)
   - `GROQ_API_KEY=<valor do CHAVES.pdf>`

6. **Google Maps**
   - `GOOGLE_MAPS_API_KEY=<valor do CHAVES.pdf>`

7. **Ollama** (IA local)
   - `OLLAMA_API_KEY=<valor do CHAVES.pdf>`

8. **GlitchTip**
   - `GLITCHTIP_KEY=<valor do CHAVES.pdf>`

### Como configurar:

1. Abra o arquivo `.env` no Codespace
2. Substitua os placeholders vazios pelos valores acima
3. Salve o arquivo

## Serviços Externos

O Codespace está configurado para não usar serviços Docker locais (Redis, Meilisearch, MinIO, etc). Para usar estes serviços:

1. **Banco de dados**: Configure `DATABASE_URL` para apontar para seu banco de dados externo
2. **Redis**: Configure `REDIS_URL` se necessário
3. **Storage**: Configure `STORAGE_ENDPOINT` para um serviço S3 compatível

## Iniciar o Servidor

Após configurar as chaves de API:

```bash
npm run dev
```

O servidor estará disponível na porta 3024.

## Solução de Problemas

### Erro de banco de dados
Se receber erro de conexão com banco de dados, verifique:
- `DATABASE_URL` está configurada corretamente
- O banco de dados está acessível do Codespace

### Serviços não funcionando
Se serviços externos não funcionarem:
- Verifique se as chaves de API estão configuradas corretamente
- Confirme que os serviços externos estão acessíveis

### Build falhando
Se o build falhar:
- Execute `npm install` para garantir dependências atualizadas
- Execute `npx prisma generate` para regenerar o Prisma client