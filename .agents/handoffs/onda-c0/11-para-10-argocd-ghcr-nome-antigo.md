- De: 11
- Para: 10
- Onda: c0
- Status: aberto
- Prioridade: alto

## Problema
`charts/prospector-atlas/values.yaml` referencia
`ghcr.io/maarksn/central-de-inteligencia-comecial-atlasgr` como repositório de imagem, e
`argocd/application-production.yaml`/`application-homolog.yaml` referenciam
`https://github.com/MaarksN/CENTRAL-DE-INTELIGENCIA-COMECIAL-ATLASGR.git` como `repoURL`. O
diretório local do projeto já se chama `Birthub-360`. Não foi possível confirmar nesta rodada se
o registro de containers (GHCR) e o repositório remoto real (GitHub) já foram renomeados para
acompanhar o rebranding.

## Arquivo(s) envolvido(s)
`charts/prospector-atlas/values.yaml`, `argocd/application-production.yaml`,
`argocd/application-homolog.yaml`.

## Alteração necessária
Confirmar o nome real atual do repositório GitHub e do registro GHCR. Se ambos já foram
renomeados: atualizar estes 3 arquivos antes que o redirecionamento automático do GitHub pare de
funcionar (não é permanente) ou que um `pull` de imagem falhe. Se não foram renomeados: nenhuma
ação, apenas documentar que é intencional.

## Teste esperado
Deploy real (produção ou homologação) completando sem erro de `ImagePullBackOff` nem falha de
sincronização do ArgoCD por `repoURL` inválido.

## Contexto adicional
Risco de causa-raiz de falha silenciosa de deploy — não é resíduo cosmético. Detalhado em
`docs/architecture/LEGACY_BRAND_CONTENT_MAP.md` §2.1.
