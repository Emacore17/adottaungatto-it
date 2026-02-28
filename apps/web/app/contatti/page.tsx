import { ScaffoldPlaceholder } from '../../components/scaffold-placeholder';

export default function ContactsPage() {
  return (
    <ScaffoldPlaceholder
      description="La route contatti resta attiva ma il contenuto verra riprogettato insieme ai canali di supporto del nuovo sito."
      eyebrow="Pagina istituzionale"
      nextSteps={[
        'Definire supporto, commerciale e segnalazioni come entry point separati.',
        'Aggiungere CTA e form solo quando i destinatari saranno chiari.',
      ]}
      route="/contatti"
      title="Contatti"
    />
  );
}
