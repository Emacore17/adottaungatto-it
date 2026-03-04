import { LinkButton } from '../components/link-button';
import { PageShell } from '../components/page-shell';

export default function NotFoundPage() {
  return (
    <PageShell
      description="La pagina che cerchi non e disponibile o potrebbe essere stata spostata."
      eyebrow="Routing"
      title="404 - Pagina non trovata"
    >
      <div className="flex flex-wrap gap-2">
        <LinkButton href="/">Torna alla home</LinkButton>
        <LinkButton href="/annunci" variant="outline">
          Vai agli annunci
        </LinkButton>
      </div>
    </PageShell>
  );
}
