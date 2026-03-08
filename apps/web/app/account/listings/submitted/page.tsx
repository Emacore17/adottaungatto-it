import { Badge, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import type { Metadata } from 'next';
import { LinkButton } from '../../../../components/link-button';
import { WorkspacePageShell } from '../../../../components/workspace-page-shell';
import { requireWebSession } from '../../../../lib/auth';

export const metadata: Metadata = {
  title: 'Annuncio inviato',
};

export default async function ListingSubmittedPage() {
  await requireWebSession('/account/listings/submitted');

  return (
    <WorkspacePageShell
      aside={
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">Invio completato</Badge>
            <Badge variant="outline">Workspace annunci</Badge>
          </div>
          <p className="text-sm leading-6 text-[var(--color-text-muted)]">
            Da qui puoi tornare subito ai tuoi annunci, controllare lo stato e continuare il lavoro
            senza passaggi inutili.
          </p>
        </div>
      }
      description="Una conferma semplice e utile: niente schermate vuote, solo i prossimi passi davvero necessari dopo il salvataggio o l'invio di un annuncio."
      eyebrow="Area riservata"
      title="Annuncio inviato"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Cosa fare ora</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-6 text-[var(--color-text-muted)]">
            <p>
              Apri I miei annunci per verificare lo stato corrente e rientrare rapidamente nella
              scheda che hai appena aggiornato.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Perfeziona il profilo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-6 text-[var(--color-text-muted)]">
            <p>
              Foto, descrizione, localita e recapiti ben ordinati aiutano a ricevere contatti piu
              pertinenti e meno dispersivi.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prossimo passo rapido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-6 text-[var(--color-text-muted)]">
            <p>
              Se devi continuare a pubblicare, puoi aprire subito un nuovo annuncio senza uscire dal
              workspace.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <LinkButton href="/account/annunci">Vai ai miei annunci</LinkButton>
        <LinkButton href="/pubblica" variant="outline">
          Nuovo annuncio
        </LinkButton>
        <LinkButton href="/account" variant="secondary">
          Torna alla dashboard
        </LinkButton>
      </div>
    </WorkspacePageShell>
  );
}
