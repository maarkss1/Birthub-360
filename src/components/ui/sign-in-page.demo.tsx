import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from './sign-in-page';

/**
 * Preview isolado do componente `LoginPage` (sign-in-page.tsx) — envolve em seu próprio
 * BrowserRouter porque este arquivo não é montado dentro de src/App.tsx (que já tem seu próprio
 * Router e sua própria tela de login real). Use isto só para visualizar o componente isolado
 * (ex.: numa rota temporária, Storybook, ou renderizando <SignInPageDemo /> ad-hoc).
 */
export default function SignInPageDemo() {
  return (
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>
  );
}
