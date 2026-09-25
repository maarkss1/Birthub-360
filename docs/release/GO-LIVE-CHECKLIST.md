# Checklist de Go-Live (Birth Hub 360)

## PRE-DEPLOY
- [ ] CI final verde no mesmo SHA candidato (`npm run release:check`)
- [ ] Security scan aprovado (ausência de criticals/highs não justificados)
- [ ] Variaveis de ambiente (`.env`) validadas em produção

## DEPLOY
- [ ] `docker compose up -d` executado com sucesso
- [ ] Aplicação acessível externamente via Proxy
- [ ] Migrations testadas e aplicadas (`prisma migrate deploy`)

## POST-DEPLOY
- [ ] `GET /health/live` OK
- [ ] `GET /health/ready` OK
- [ ] Login testado com sucesso
- [ ] Fluxo crítico (Pipeline/CRM) OK
- [ ] Logs chegando no Loki
- [ ] Métricas chegando no Prometheus
- [ ] Alertas do Alertmanager testados
- [ ] Sentry e PostHog reportando dados reais

## HYPERCARE
- [ ] Acompanhamento de 48h das taxas de 5xx
- [ ] Validação do 1º backup noturno em R2/Off-site
- [ ] Restore drill aprovado na primeira semana

## ROLLBACK CRITERIA
- Falha crítica em login que dure > 5min
- Latência sustentada > 2000ms
- Falha de banco de dados irrecuperável via reinício rápido

