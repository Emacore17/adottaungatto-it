import { ContentPage } from '../../components/content-page';
import { LinkButton } from '../../components/link-button';

export default function PrivacyPage() {
  return (
    <ContentPage
      actions={
        <>
          <LinkButton href="/account/impostazioni">Gestisci preferenze</LinkButton>
          <LinkButton href="/contatti" variant="outline">
            Supporto
          </LinkButton>
        </>
      }
      asideDescription="Questa pagina riassume in modo semplice quali dati entrano in gioco nelle funzioni attive del sito."
      badges={[
        { label: 'Trasparenza', variant: 'secondary' },
        { label: 'Solo funzioni utili', variant: 'outline' },
      ]}
      description="Un riepilogo operativo su account, annunci, messaggi e preferenze, pensato per capire subito dove finiscono i dati che inserisci."
      eyebrow="Privacy"
      highlights={[
        { label: 'Account', value: 'Email, ruoli e sessione' },
        { label: 'Annunci', value: 'Scheda pubblica e recapiti inseriti da te' },
        { label: 'Messaggi', value: 'Inbox privata e notifiche configurabili' },
      ]}
      sections={[
        {
          title: 'Dati di account',
          items: [
            'Le informazioni di accesso servono per autenticarti e sbloccare il workspace personale.',
            'L email del tuo account viene usata anche per mostrarti e aggiornarti sulle notifiche dei messaggi, quando abilitate.',
            'Le route private restano protette dalla sessione attiva e vengono nascoste quando non sei autenticato.',
          ],
        },
        {
          title: 'Annunci e recapiti',
          items: [
            'I dati che inserisci in un annuncio vengono usati per costruire la scheda pubblica e facilitare il contatto.',
            'Titolo, descrizione, localita, foto e recapiti servono a dare contesto a chi visita il profilo del gatto.',
            'Le informazioni devono restare accurate e aggiornate, cosi da evitare richieste inutili o fuori contesto.',
          ],
        },
        {
          title: 'Messaggi e notifiche',
          items: [
            'Le conversazioni private restano nella tua inbox per permetterti di seguire lo storico dei contatti.',
            'Puoi scegliere se ricevere o meno notifiche email per i nuovi messaggi dalla pagina impostazioni.',
            'La chat interna e il canale consigliato per parlare di un annuncio senza disperdere il contesto.',
          ],
        },
        {
          title: 'Controlli disponibili oggi',
          items: [
            'Puoi fare logout in qualsiasi momento dalle aree riservate o dalla testata del sito.',
            'Le preferenze di notifica messaggi sono modificabili direttamente dal tuo account.',
            'Preferiti e alcune preferenze di esperienza vengono mantenuti in modo leggero per semplificare il ritorno al sito.',
          ],
        },
      ]}
      title="Privacy e dati"
    />
  );
}
