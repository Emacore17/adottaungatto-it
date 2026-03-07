import { Badge, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import { LinkButton } from '../../../components/link-button';
import { PageShell } from '../../../components/page-shell';

interface PublicProfilePageProps {
  params: Promise<{
    username: string;
  }>;
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params;

  return (
    <PageShell
      aside={
        <div className="space-y-4 p-1">
          <div className="flex flex-wrap gap-2">
            <Badge variant="warning">Feature in rollout</Badge>
            <Badge variant="outline">profilo pubblico</Badge>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">
            Questa sezione tornera online quando il backend profilo venditore e recensioni sara
            disponibile senza dati mock.
          </p>
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/annunci">Esplora annunci</LinkButton>
            <LinkButton href="/contatti" variant="outline">
              Contatti
            </LinkButton>
          </div>
        </div>
      }
      description="Il profilo pubblico venditore e in aggiornamento per passare a dati reali API."
      eyebrow="Profilo pubblico"
      title={`Profilo @${username}`}
    >
      <Card>
        <CardHeader>
          <CardTitle>Pagina temporaneamente non disponibile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-6 text-[var(--color-text-muted)]">
          <p>
            Per evitare ambiguita tra dati reali e mock, la vista pubblica del venditore e stata
            temporaneamente sospesa.
          </p>
          <p>
            Continua a usare il catalogo annunci; il profilo pubblico verra riattivato insieme a
            recensioni reali e metriche di affidabilita persistite lato backend.
          </p>
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/annunci">Vai al catalogo</LinkButton>
            <LinkButton href="/preferiti" variant="outline">
              Preferiti
            </LinkButton>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
