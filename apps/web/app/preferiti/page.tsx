import { LinkButton } from '../../components/link-button';
import { ScaffoldPlaceholder } from '../../components/scaffold-placeholder';
import { requireWebSession } from '../../lib/auth';

export default async function FavoritesPage() {
  await requireWebSession('/preferiti');

  return (
    <ScaffoldPlaceholder
      actions={
        <LinkButton href="/account" variant="outline">
          Torna all'account
        </LinkButton>
      }
      description="I preferiti mock sono stati rimossi. La route protetta resta a disposizione per una futura feature reale."
      eyebrow="Area riservata"
      integrations={[
        'Protezione route via sessione.',
        'Shell base pronta per card, collection o saved search future.',
      ]}
      nextSteps={[
        'Definire modello dati e azioni dei preferiti.',
        'Reintrodurre persistenza solo con un backend dedicato.',
      ]}
      route="/preferiti"
      title="Preferiti"
    />
  );
}
