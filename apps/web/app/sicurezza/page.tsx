import { StaticPage } from '../../components/static-page';

export default function SafetyPage() {
  return (
    <StaticPage
      subtitle="Checklist anti-truffa e best practice per adozioni sicure."
      title="Sicurezza"
    >
      <ul className="list-disc space-y-1 pl-5">
        <li>Diffida di richieste di pagamento urgente o canali esterni non tracciati.</li>
        <li>Verifica il badge inserzionista e controlla recensioni/profilo.</li>
        <li>Conserva la conversazione in piattaforma per tutela reciproca.</li>
        <li>Segnala subito contenuti sospetti al team moderazione.</li>
      </ul>
    </StaticPage>
  );
}
