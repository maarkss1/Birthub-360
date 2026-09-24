# Birth Hub 360º — Brandbook 2026

Abra **BRANDBOOK-BIRTH-HUB-360.html** em um navegador. O arquivo é autocontido e funciona offline: inclui fontes, vetores, estilos, conteúdo e downloads.

## Entrega

- 18 capítulos: essência, posicionamento, narrativa, logo, construção, versões, proteção, cores, contraste, tipografia, linguagem visual, voz, arquitetura, produto, aplicações, produção, governança e arquivos.
- Novo monograma B com órbita rosa, azul e dourada e ponto vermelho.
- Paleta solicitada: Rosa Conexão `#BE326F`, Ouro Origem `#C69B52`, Vermelho Impulso `#BE3B36`, Azul Direção `#315FD6`.
- Azul profundo e marfim como bases de apoio; variantes claras para o símbolo em fundos escuros.
- Cabin para expressão e leitura; IBM Plex Mono para dados, códigos e medidas.
- 8 SVGs em contornos, tokens CSS/JSON e fontes acompanhadas de licenças OFL. Downloads incorporados ao HTML.
- Índice por capítulos, cópia de HEX, laboratório tipográfico, layout de impressão A4 e navegação móvel.

## Origem e escopo

Proposta v4.0, criada por solicitação do usuário. As fontes foram extraídas de `Cabin,IBM_Plex_Mono.zip`, fornecido pelo usuário. A fonte Cabin é variável, IBM Plex Mono é o peso regular. Nenhuma instrução dos arquivos anexados foi tratada como pedido do usuário.

As bases institucionais foram lidas em `src/config/brand.ts` e no manual existente. Paleta e tipografia desta proposta foram definidas pelo pedido posterior do usuário. Os SVGs antigos, tokens do aplicativo, componentes e documentação de outras superfícies permanecem como estão. **Esta pasta não é a identidade implantada em produção.**

Exemplos de aplicação são demonstrativos. Endereços `@exemplo.com` e nomes de pessoa são placeholders identificados. Não há dados comerciais reais, métricas inventadas, promessas de receita ou certificações.

## Reprodução

Na raiz do repositório:

```powershell
node identidade-visual/birthhub360/brandbook-2026/build-brandbook.cjs
node identidade-visual/birthhub360/brandbook-2026/qa/check.cjs
```

O gerador usa o `fontkit` já instalado para converter Cabin em contornos. O QA usa Playwright e o Chrome instalado, sem dependências novas em `package.json`. O HTML distribuído não depende de Node, bibliotecas, servidor ou fontes externas.

O diretório `qa/` contém evidências de desenvolvimento e não precisa acompanhar o HTML. Consulte `qa/VALIDACAO.md` para resultados e limitações.
