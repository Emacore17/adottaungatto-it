import { LinkButton } from '../../../components/link-button';
import { ScaffoldPlaceholder } from '../../../components/scaffold-placeholder';
import { requireWebSession } from '../../../lib/auth';

export default async function AccountSettingsPage() {
  const session = await requireWebSession('/account/impostazioni');

  return (
    <ScaffoldPlaceholder
      actions={
        <LinkButton href="/account" variant="outline">
          Torna alla dashboard
        </LinkButton>
      }
      description={`Le impostazioni di ${session.user.email} verranno ridisegnate da zero quando saranno chiariti profilo, preferenze e privacy.`}
      eyebrow="Account"
      integrations={[
        'Protezione route via requireWebSession().',
        'Shell condivisa, tema e motion gia applicati.',
        'Logout e navigazione account ancora disponibili.',
      ]}
      nextSteps={[
        'Definire una nuova information architecture per preferenze e profilo.',
        'Aggiungere solo i campi realmente supportati dal backend.',
      ]}
      route="/account/impostazioni"
      title="Impostazioni account"
    />
  );
}
