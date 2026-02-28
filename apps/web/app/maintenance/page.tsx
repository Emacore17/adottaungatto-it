import { LinkButton } from '../../components/link-button';
import { ScaffoldPlaceholder } from '../../components/scaffold-placeholder';

export default function MaintenancePage() {
  return (
    <ScaffoldPlaceholder
      actions={
        <LinkButton href="/" variant="outline">
          Torna alla home
        </LinkButton>
      }
      description="La route di manutenzione resta disponibile come punto di atterraggio tecnico, ma anche questa pagina e stata ripulita."
      eyebrow="Infra"
      nextSteps={['Definire il template definitivo per downtime e comunicazioni di esercizio.']}
      route="/maintenance"
      title="Manutenzione programmata"
    />
  );
}
