import { LinkButton } from '../../../../components/link-button';
import { ScaffoldPlaceholder } from '../../../../components/scaffold-placeholder';
import { requireWebSession } from '../../../../lib/auth';

export default async function ListingSubmittedPage() {
  await requireWebSession('/account/listings/submitted');

  return (
    <ScaffoldPlaceholder
      actions={
        <>
          <LinkButton href="/account/annunci">Vai ai miei annunci</LinkButton>
          <LinkButton href="/pubblica" variant="outline">
            Apri pubblica
          </LinkButton>
        </>
      }
      description="La route di conferma resta valida, ma il vecchio wizard e stato rimosso per rifare il flusso di creazione in modo piu pulito."
      eyebrow="Account"
      integrations={[
        'Route protetta ancora agganciata alla sessione.',
        'La pubblicazione continuera a passare dai route handler /api/listings e /api/listings/[listingId]/media.',
      ]}
      nextSteps={[
        'Definire un wizard ridotto, step-based e con upload separato dal contenuto.',
        'Reintrodurre la conferma solo quando il nuovo flow end-to-end e pronto.',
      ]}
      route="/account/listings/submitted"
      title="Conferma invio annuncio"
    />
  );
}
