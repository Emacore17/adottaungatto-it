import { LinkButton } from '../../components/link-button';
import { PageShell } from '../../components/page-shell';

export default function ServerErrorPage() {
  return (
    <PageShell
      description="Il server ha risposto con un errore temporaneo. Lo scaffold resta minimale anche nelle pagine di fallback."
      eyebrow="Errore server"
      title="500 · Problema temporaneo"
    >
      <div className="flex flex-wrap gap-2">
        <LinkButton href="/">Torna alla home</LinkButton>
        <LinkButton href="/annunci" variant="outline">
          Apri annunci
        </LinkButton>
      </div>
    </PageShell>
  );
}
