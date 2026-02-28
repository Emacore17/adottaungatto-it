import { LinkButton } from '../../components/link-button';
import { ScaffoldPlaceholder } from '../../components/scaffold-placeholder';
import { requireWebSession } from '../../lib/auth';

export default async function MessagesPage() {
  await requireWebSession('/messaggi');

  return (
    <ScaffoldPlaceholder
      actions={
        <LinkButton href="/account" variant="outline">
          Torna all'account
        </LinkButton>
      }
      description="La messaggistica mock e stata rimossa. La route resta protetta e pronta a essere ricostruita con un modello piu chiaro."
      eyebrow="Area riservata"
      integrations={[
        'Route ancora protetta da sessione.',
        'Shell condivisa pronta per ospitare un nuovo inbox flow.',
      ]}
      nextSteps={[
        'Definire thread list, dettaglio conversazione e permessi reali.',
        'Aggiungere API e stato client solo quando il dominio messaggi sara concreto.',
      ]}
      route="/messaggi"
      title="Messaggi"
    />
  );
}
