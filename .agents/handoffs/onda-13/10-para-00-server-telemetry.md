- De: 10
- Para: 00
- Onda: 13
- Status: resolvido
- Prioridade: bloqueador
## Problema
Integração de telemetria necessita ser iniciada no primeiro momento de execução do servidor.

## Arquivo(s) envolvido(s)
server.ts

## Alteração necessária
Adicionar a seguinte importação como a PRIMEIRA linha do arquivo:
import './lib/telemetry/otel';

## Teste esperado
A aplicação deve compilar e os logs de telemetria devem iniciar sem falhas no boot.

## Contexto adicional
Conforme as regras do repositório, o Agente 10 não pode editar server.ts diretamente. O import do otel precisa ser a primeira coisa a rodar.

## Resolução

Resolvido pelo Agente 00 na Onda 44: o import de `./src/lib/telemetry/otel` passou a ser a primeira
linha de `server.ts`, antes de tracing, process guards, Express e demais módulos instrumentados. A
validação fica coberta pelo typecheck/build e pelo smoke de boot da aplicação desta onda.
