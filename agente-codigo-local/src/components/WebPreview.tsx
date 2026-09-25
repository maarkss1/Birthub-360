import React, { useState, useEffect } from 'react';
import { RefreshCw, Monitor, Tablet, Smartphone, ExternalLink, Globe } from 'lucide-react';

interface WebPreviewProps {
  files: Record<string, string>;
  onRefresh: () => void;
}

export const WebPreview: React.FC<WebPreviewProps> = ({ files, onRefresh }) => {
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [srcDoc, setSrcDoc] = useState<string>('');
  const [key, setKey] = useState<number>(0);

  useEffect(() => {
    buildPreviewHtml();
  }, [files]);

  const buildPreviewHtml = () => {
    let html = files['index.html'] || files['public/index.html'] || '';
    if (!html) {
      setSrcDoc(`
        <!DOCTYPE html>
        <html>
        <body style="font-family: sans-serif; background: #0f172a; color: #94a3b8; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
          <div style="text-align:center;">
            <p style="font-size: 14px; color: #cbd5e1;">Nenhum arquivo <code>index.html</code> encontrado.</p>
            <p style="font-size: 12px; color: #64748b;">Peça ao agente para criar um <code>index.html</code> para visualizar.</p>
          </div>
        </body>
        </html>
      `);
      return;
    }

    // Inline local css files referenced via <link rel="stylesheet" href="...">
    html = html.replace(/<link\s+[^>]*href=["']([^"']+)["'][^>]*>/gi, (match, href) => {
      const cleanHref = href.replace(/^\.\//, '').replace(/^\/+/, '');
      if (files[cleanHref]) {
        return `<style>/* inlined ${cleanHref} */\n${files[cleanHref]}\n</style>`;
      }
      return match;
    });

    // Inline local js files referenced via <script src="...">
    html = html.replace(/<script\s+[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi, (match, src) => {
      const cleanSrc = src.replace(/^\.\//, '').replace(/^\/+/, '');
      if (files[cleanSrc]) {
        return `<script>/* inlined ${cleanSrc} */\n${files[cleanSrc]}\n</script>`;
      }
      return match;
    });

    setSrcDoc(html);
  };

  const reloadIframe = () => {
    buildPreviewHtml();
    setKey((prev) => prev + 1);
  };

  const getViewportWidth = () => {
    switch (viewport) {
      case 'mobile':
        return '375px';
      case 'tablet':
        return '768px';
      default:
        return '100%';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090d14] overflow-hidden">
      {/* Top browser mock bar */}
      <div className="h-10 border-b border-slate-800 bg-[#0e131f] px-3 flex items-center justify-between">
        {/* Mock address bar */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#0b0f17] border border-slate-800 rounded-md text-[11px] text-slate-400 font-mono w-full">
            <Globe className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span className="truncate">http://sandbox.local/index.html</span>
          </div>
          <button
            onClick={reloadIframe}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title="Recarregar preview"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Viewport size switcher */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 border border-slate-800 rounded-md">
          <button
            onClick={() => setViewport('desktop')}
            className={`p-1 rounded text-xs transition-colors ${
              viewport === 'desktop' ? 'bg-slate-800 text-teal-400' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Desktop (100%)"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewport('tablet')}
            className={`p-1 rounded text-xs transition-colors ${
              viewport === 'tablet' ? 'bg-slate-800 text-teal-400' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Tablet (768px)"
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewport('mobile')}
            className={`p-1 rounded text-xs transition-colors ${
              viewport === 'mobile' ? 'bg-slate-800 text-teal-400' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Mobile (375px)"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex-1 overflow-auto bg-[#06080d] flex items-center justify-center p-4">
        <div
          style={{ width: getViewportWidth(), height: '100%', maxWidth: '100%' }}
          className="bg-white rounded shadow-2xl transition-all duration-300 overflow-hidden border border-slate-800 flex flex-col"
        >
          <iframe
            key={key}
            srcDoc={srcDoc}
            title="Live Sandbox Preview"
            sandbox="allow-scripts allow-forms allow-modals"
            className="w-full h-full border-0 bg-white"
          />
        </div>
      </div>
    </div>
  );
};
