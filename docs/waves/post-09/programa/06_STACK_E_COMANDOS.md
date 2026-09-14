# STACK E COMANDOS DO REPOSITÓRIO

Referência para os comandos citados nas ondas. Confirme no `package.json` antes de usar — este documento pode envelhecer.

## Stack observada

| Camada | Tecnologia |
|---|---|
| Frontend | React 19, Vite 6, Tailwind CSS v4 |
| Backend | Express (`server.ts`), build com esbuild |
| Dados | PostgreSQL via Prisma 7.8 (adapter `PrismaPg`, driver `pg`) |
| Lint/format | Biome (autoridade no CI); `eslint.config.mjs` existe apenas para diagnóstico no editor |
| Testes | Vitest (`vitest.config.ts`, `vitest.container.config.ts`), Playwright, Storybook |
| Qualidade | knip, dependency-cruiser, SonarQube |
| Segurança | gitleaks, Trivy |
| Infra | Docker, Kubernetes, Helm, ArgoCD, Render, Vercel, Prometheus |
| Mobile | Capacitor (`android/`, `ios/`) |
| IA | LiteLLM como gateway; Groq como contingência; caminho legado de embeddings Gemini |
| Integrações | Bitrix24, Apollo, Hunter, Google Maps/Places |

## Comandos base

```bash
npm ci                     # instalação reprodutível
npm run dev                # servidor de desenvolvimento
npm run build              # build de client e server
npm run lint               # Biome, sem alterar arquivos (usado pelo CI)
npm run lint:fix           # Biome com correção automática (uso local)
npm run start              # servidor compilado
npx tsc --noEmit           # verificação de tipos
npx vitest run             # testes de unidade e integração
npx vitest run --config vitest.container.config.ts   # integração com container
npx playwright test        # ponta a ponta
npx prisma validate && npx prisma migrate status     # estado do schema
npx knip                   # código e dependências não utilizados
npx depcruise --config .dependency-cruiser.cjs src   # regras de dependência
gitleaks detect --config .gitleaks.toml              # segredos
trivy fs --severity HIGH,CRITICAL .                  # vulnerabilidades
```

## Observações que afetam as ondas

- **Biome é a autoridade de lint.** A coexistência com ESLint gera ruído; a Onda AC deve decidir e documentar.
- **Há dois caminhos de embedding** (LiteLLM e legado Gemini). A Onda K precisa unificar ou isolar com prazo.
- **Múltiplos alvos de deploy** (Render, Vercel, k8s/ArgoCD, docker-compose). A Onda AC precisa declarar qual é o caminho oficial de produção.
- **`.gitleaksignore`, `.trivyignore.yaml` e `.dependency-cruiser-known-violations.json` existem.** Toda entrada precisa de motivo, dono e data de revisão (Ondas AC e J).
- **Variáveis sensíveis** estão em `.env.example`; nenhuma credencial real deve entrar no repositório em hipótese alguma.
