import React, { useState } from 'react';
import {
  Code, Palette, Play,
  Layers
} from 'lucide-react';
import {
  Card, Button, Badge,
  Tabs, Avatar,
  Alert, Checkbox, Switch, Input, Select
} from '../../components/design-system';

export default function DesignSystemDocs() {
  const [activeTab, setActiveTab] = useState('tokens');
  const [btnLoading, setBtnLoading] = useState(false);
  const [switchState, setSwitchState] = useState(false);
  const [checkState, setCheckState] = useState(true);
  const [inputText, setInputText] = useState('');
  const [selectVal, setSelectVal] = useState('c1');

  const docTabs = [
    { id: 'tokens', label: 'Design Tokens', icon: <Palette className="h-4 w-4" /> },
    { id: 'components', label: 'Componentes', icon: <Code className="h-4 w-4" /> },
    { id: 'playground', label: 'Playground Interativo', icon: <Play className="h-4 w-4" /> },
    { id: 'architecture', label: 'Arquitetura', icon: <Layers className="h-4 w-4" /> }
  ];

  return (
    <div className="space-y-8 animate-slide-up text-left">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="primary">Fase 1.2 — Infraestrutura</Badge>
          <Badge variant="info">Enterprise Standard</Badge>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 font-sans tracking-tight">Design System & Foundation</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-3xl">
          A fundação técnica do Birth Hub 360 foi consolidada seguindo padrões rígidos de reutilização de código, design tokens descentralizados, acessibilidade total e consistência de marca.
        </p>
      </div>

      <Card className="p-1">
        <Tabs tabs={docTabs} activeTab={activeTab} onChange={setActiveTab} />
      </Card>

      {/* TAB 1: DESIGN TOKENS */}
      {activeTab === 'tokens' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Cores do Sistema</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Paleta de cores centralizadas consumidas dinamicamente via tokens Tailwind e CSS custom properties.
              </p>
              
              <div className="space-y-3">
                <ColorRow name="var(--brand-color)" hex="#2563eb" desc="Cor de destaque principal (branc Color)" />
                <ColorRow name="--bg-primary" hex="#f1f5f9" desc="Cor de fundo da aplicação (Claro)" />
                <ColorRow name="--bg-surface" hex="#ffffff" desc="Cor dos painéis e cards" />
                <ColorRow name="--text-primary" hex="#0f172a" desc="Texto principal com alta legibilidade" />
                <ColorRow name="--border-color" hex="#e2e8f0" desc="Divisores e bordas de cards" />
              </div>
            </Card>

            <Card className="space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Espaçamento e Dimensões</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Padrões de margens, preenchimentos e lacunas para ritmo visual preciso.
              </p>

              <div className="space-y-2.5 font-mono text-xs text-slate-650 dark:text-slate-300">
                <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-900/35 rounded-lg border border-slate-150 dark:border-slate-800">
                  <span>spacing.xs</span>
                  <span className="font-bold">4px (0.25rem)</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-900/35 rounded-lg border border-slate-150 dark:border-slate-800">
                  <span>spacing.sm</span>
                  <span className="font-bold">8px (0.5rem)</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-900/35 rounded-lg border border-slate-150 dark:border-slate-800">
                  <span>spacing.md</span>
                  <span className="font-bold">12px (0.75rem)</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-900/35 rounded-lg border border-slate-150 dark:border-slate-800">
                  <span>spacing.lg</span>
                  <span className="font-bold">16px (1.0rem)</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-900/35 rounded-lg border border-slate-150 dark:border-slate-800">
                  <span>spacing.xl</span>
                  <span className="font-bold">24px (1.5rem)</span>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="space-y-2">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Bordas & Radius</h4>
              <p className="text-xs text-slate-400 mb-4">Arredondamentos padronizados no sistema.</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">radius.sm: 4px</Badge>
                <Badge variant="secondary">radius.md: 6px</Badge>
                <Badge variant="secondary">radius.lg: 8px</Badge>
                <Badge variant="secondary">radius.xl: 12px</Badge>
              </div>
            </Card>

            <Card className="space-y-2">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Transições</h4>
              <p className="text-xs text-slate-400 mb-4">Durações de animações e acelerações (easing).</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="info">fast: 100ms</Badge>
                <Badge variant="info">normal: 200ms</Badge>
                <Badge variant="info">slow: 300ms</Badge>
              </div>
            </Card>

            <Card className="space-y-2">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Acessibilidade WCAG</h4>
              <p className="text-xs text-slate-400 mb-4">Garantia de contraste de cores e navegação.</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="success">Foco Visível</Badge>
                <Badge variant="success">AA Compliant</Badge>
                <Badge variant="success">Aria Labels</Badge>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: COMPONENTES */}
      {activeTab === 'components' && (
        <div className="space-y-8 animate-fade-in">
          {/* Section Buttons */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white border-b pb-2 border-slate-200 dark:border-slate-700">Botões (Button)</h3>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary Button</Button>
              <Button variant="secondary">Secondary Button</Button>
              <Button variant="outline">Outline Button</Button>
              <Button variant="danger">Danger Button</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="success">Success Button</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="xs" variant="outline">Extra Small</Button>
              <Button size="sm" variant="outline">Small Button</Button>
              <Button size="md" variant="outline">Medium Button</Button>
              <Button size="lg" variant="outline">Large Button</Button>
              <Button variant="primary" isLoading={true}>Loading State</Button>
            </div>
          </div>

          {/* Section Badges */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white border-b pb-2 border-slate-200 dark:border-slate-700">Badges & Status</h3>
            <div className="flex flex-wrap gap-2.5">
              <Badge variant="primary">Destaque</Badge>
              <Badge variant="secondary">Draft</Badge>
              <Badge variant="success">Ativo</Badge>
              <Badge variant="warning">Aguardando</Badge>
              <Badge variant="danger">Revogado</Badge>
              <Badge variant="info">Informação</Badge>
            </div>
          </div>

          {/* Section Cards */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white border-b pb-2 border-slate-200 dark:border-slate-700">Tabelas & Avatares</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase">Avatares de Usuários / Workspace</p>
                <div className="flex items-center gap-4">
                  <Avatar name="Catarina Vendas" size="sm" />
                  <Avatar name="Catarina Vendas" size="md" />
                  <Avatar name="Catarina Vendas" size="lg" />
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Iniciais Geradas Automaticamente</p>
                    <p className="text-xs text-slate-400">Padrão com cores sólidas da marca</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase">Alertas</p>
                <Alert variant="warning" title="Aviso do Servidor" description="A chave de API expira em 30 dias. Por favor, programe uma rotação de chaves." />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PLAYGROUND INTERATIVO */}
      {activeTab === 'playground' && (
        <div className="space-y-6 animate-fade-in">
          <Card className="space-y-6">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Teste Interativo de Inputs</h3>
            <p className="text-xs text-slate-500">Ajuste os valores abaixo para ver as propriedades reativas do design system se adaptarem instantaneamente.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Input 
                  label="Nome da Integração" 
                  placeholder="Ex: Webhook de Produção" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  helperText={inputText ? `Nome digitado: ${inputText}` : 'Identificador exclusivo da API'}
                />

                <Select 
                  label="Nível de Log"
                  value={selectVal}
                  onChange={(e) => setSelectVal(e.target.value)}
                  options={[
                    { value: 'c1', label: 'Informativo (INFO)' },
                    { value: 'c2', label: 'Avisos de sistema (WARNING)' },
                    { value: 'c3', label: 'Apenas Erros (ERROR)' }
                  ]}
                />
              </div>

              <div className="space-y-6 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-150 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-500 uppercase">Toggles de Estado</h4>
                <Switch 
                  checked={switchState} 
                  onChange={setSwitchState} 
                  label="White-label Corporativo"
                  description="Aplica branding corporativo estrito de forma dinâmica"
                />

                <Checkbox 
                  label="Aceito termos e condições para requisições de API" 
                  checked={checkState}
                  onChange={() => setCheckState(!checkState)}
                />

                <div className="pt-2">
                  <Button 
                    variant="primary" 
                    className="w-full"
                    isLoading={btnLoading}
                    onClick={() => {
                      setBtnLoading(true);
                      requestAnimationFrame(() => setBtnLoading(false));
                    }}
                  >
                    Simular Envio de Dados
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: ARQUITETURA */}
      {activeTab === 'architecture' && (
        <Card className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-5 w-5 text-brand" />
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Arquitetura Visual e Fundações</h3>
          </div>
          
          <div className="space-y-4 text-sm text-slate-650 dark:text-slate-300 leading-relaxed">
            <p>
              O Birth Hub 360 foi projetado sob os mais modernos conceitos de <strong>Modularização</strong> e <strong>Clean Code</strong>, garantindo que toda nova funcionalidade herde propriedades consistentes de marca.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-250/50 dark:border-slate-800">
                <h4 className="font-bold text-slate-900 dark:text-slate-50 text-sm mb-2">01. Centralização</h4>
                <p className="text-xs text-slate-500">Toda mudança de cor de destaque é refletida instantaneamente nos botões, badges, focos de inputs e links de navegação.</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-250/50 dark:border-slate-800">
                <h4 className="font-bold text-slate-900 dark:text-slate-50 text-sm mb-2">02. Theme-First</h4>
                <p className="text-xs text-slate-500">O motor de temas Light / Dark / System opera nativamente injetando a classe CSS <code>.dark</code> na raiz do HTML para compatibilidade absoluta com iFrames.</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-250/50 dark:border-slate-800">
                <h4 className="font-bold text-slate-900 dark:text-slate-50 text-sm mb-2">03. Performance</h4>
                <p className="text-xs text-slate-500">Componentes divididos em blocos isolados com hooks de controle e controle estrito de renderizações em cascata.</p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function ColorRow({ name, hex, desc }: { name: string, hex: string, desc: string }) {
  return (
    <div className="flex items-center justify-between gap-4 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-900/20 rounded-lg transition-colors border border-transparent hover:border-slate-100">
      <div className="flex items-center gap-3">
        <div 
          className="h-8 w-8 rounded-lg border border-slate-200 shadow-xs" 
          style={{ backgroundColor: name.startsWith('var') ? name : hex }}
        />
        <div className="text-left">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{name}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">{desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded uppercase">
          {hex}
        </span>
      </div>
    </div>
  );
}
