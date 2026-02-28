import { LinkButton } from '../components/link-button';
import { PageShell } from '../components/page-shell';

export default function NotFoundPage() {
  return (
    <PageShell
      description="La risorsa richiesta non e disponibile nello scaffold attuale oppure e stata rimossa durante il reset del frontend."
      eyebrow="Routing"
      title="404 · Pagina non trovata"
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
