import { Badge, CardContent } from '@adottaungatto/ui';
import { FavoritesPageContent } from '../../components/favorites-page-content';
import { WorkspacePageShell } from '../../components/workspace-page-shell';
import { requireWebSession } from '../../lib/auth';

export default async function FavoritesPage() {
  await requireWebSession('/preferiti');

  return (
    <WorkspacePageShell
      aside={
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Preferiti</Badge>
            <Badge variant="outline">Account sincronizzato</Badge>
          </div>
          <p className="text-sm leading-6 text-[var(--color-text)]">
            Gli annunci salvati restano sincronizzati tra catalogo, dettaglio e pagina dedicata su
            tutti i dispositivi collegati al tuo account.
          </p>
        </CardContent>
      }
      description="Ritrova in un solo punto gli annunci che hai salvato con il cuore, con una vista ordinata e sincronizzata lato server."
      eyebrow="Area riservata"
      title="Preferiti"
    >
      <FavoritesPageContent />
    </WorkspacePageShell>
  );
}
