/**
 * Experimental document boundary. Production primitives and consumers are unchanged.
 * All lab records and intelligence are explicitly demonstrative; no CRM API is called.
 */
export function DesignLabPage({ section }: { section: 'command-language' | 'components-v2' }) {
  return (
    <iframe
      title={
        section === 'command-language'
          ? 'Birthub Command Language — Design Lab'
          : 'Birthub Components V2 — Design Lab'
      }
      src={`/design-lab/assets/${section}.html`}
      allow="microphone 'self'"
      style={{
        display: 'block',
        width: '100%',
        height: '100dvh',
        border: 0,
        background: '#0c1019',
      }}
    />
  );
}
