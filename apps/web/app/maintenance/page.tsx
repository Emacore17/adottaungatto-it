import { ContentPage } from '../../components/content-page';
import { LinkButton } from '../../components/link-button';

export default function MaintenancePage() {
  return (
    <ContentPage
      actions={
        <>
          <LinkButton href="/">Torna alla home</LinkButton>
          <LinkButton href="/annunci" variant="outline">
            Apri il catalogo
          </LinkButton>
        </>
      }
      asideDescription="Questa pagina viene usata come punto di riferimento quando una parte del sito richiede un intervento temporaneo o un aggiornamento controllato."
      badges={[
        { label: 'Interventi programmati', variant: 'secondary' },
        { label: 'Comunicazioni essenziali', variant: 'outline' },
      ]}
      description="Un contenitore semplice per spiegare cosa succede durante una manutenzione, cosa resta disponibile e quali percorsi conviene usare nel frattempo."
      eyebrow="Manutenzione"
      highlights={[
        { label: 'Scopo', value: 'Aggiornare senza creare confusione' },
        { label: 'Fallback', value: 'Home, catalogo e pagine informative come appoggio' },
        { label: 'Chiarezza', value: 'Messaggi brevi e istruzioni pratiche' },
      ]}
      sections={[
        {
          title: 'Quando viene usata',
          items: [
            'Per comunicare interventi temporanei che possono impattare accesso, pubblicazione o area riservata.',
            'Per evitare che l utente atterri su pagine vuote o su errori poco chiari durante un aggiornamento.',
          ],
        },
        {
          title: 'Cosa conviene fare',
          items: [
            'Se stai cercando un annuncio, riparti dal catalogo pubblico e verifica se il flusso che ti serve e disponibile.',
            'Se il problema riguarda il tuo account, attendi la riapertura del workspace o riprova piu tardi.',
            'Per dubbi generali consulta i contatti e le FAQ, che restano il punto di supporto piu stabile.',
          ],
        },
        {
          title: 'Principio di design',
          items: [
            'Anche una pagina di manutenzione deve essere leggibile, breve e orientata all azione.',
            'L utente deve capire in pochi secondi se aspettare, cambiare percorso o tornare piu tardi.',
          ],
        },
      ]}
      title="Manutenzione programmata"
    />
  );
}
