# Landing — Birth Hub 360º

Projeto **independente** da plataforma (sem código, rotas ou build compartilhados com `src/`).
Estático: `npm run build` gera `dist/`, que pode ir para qualquer host (Vercel, Netlify, S3, Caddy…).

```bash
cd landing
npm install
cp .env.example .env   # ajuste VITE_APP_URL para a URL da plataforma
npm run dev            # http://localhost:5300
npm run build
```

- `VITE_APP_URL` define para onde "Entrar" / "Acessar o Hub" apontam (`<URL>/login`).
- Tokens de cor em `src/index.css` espelham os da plataforma (`src/styles/globals.css`); logo e
  fontes (Cabin + IBM Plex Mono) são cópias. Se a identidade mudar lá, atualize aqui.
- O cockpit da página é uma **ilustração** com dados fictícios, rotulada como tal.
