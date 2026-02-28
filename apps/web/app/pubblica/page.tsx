import { LinkButton } from '../../components/link-button';
import { ScaffoldPlaceholder } from '../../components/scaffold-placeholder';
import { requireWebSession } from '../../lib/auth';

export default async function PublishPage() {
  await requireWebSession('/pubblica');

  return (
    <ScaffoldPlaceholder
      actions={
        <LinkButton href="/account/annunci" variant="outline">
          Vai ai miei annunci
        </LinkButton>
      }
      description="Il wizard di creazione e stato rimosso. Restano pronti autenticazione, proxy listings e upload media per ricostruire il flusso da zero."
      eyebrow="Area riservata"
      integrations={[
        'Protezione route via requireWebSession().',
        'POST /api/listings ancora collegato a /v1/listings.',
        'POST /api/listings/[listingId]/media ancora collegato all upload media.',
      ]}
      nextSteps={[
        'Progettare un nuovo form step-by-step minimalista.',
        'Separare chiaramente dati annuncio, localita e media upload.',
      ]}
      route="/pubblica"
      title="Pubblica annuncio"
    />
  );
}
