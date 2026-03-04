import { ContentPage } from '../../components/content-page';
import { LinkButton } from '../../components/link-button';

export default function TermsPage() {
  return (
    <ContentPage
      actions={
        <>
          <LinkButton href="/pubblica">Pubblica un annuncio</LinkButton>
          <LinkButton href="/contatti" variant="outline">
            Hai un dubbio?
          </LinkButton>
        </>
      }
      asideDescription="Le regole d'uso servono a mantenere annunci credibili, conversazioni ordinate e una piattaforma piu affidabile per tutti."
      badges={[
        { label: 'Uso responsabile', variant: 'secondary' },
        { label: 'Moderazione attiva', variant: 'outline' },
      ]}
      description="Una sintesi delle regole pratiche che guidano annunci, messaggi e gestione dell'account nell'esperienza web attuale."
      eyebrow="Termini"
      highlights={[
        { label: 'Annunci', value: 'Chiari, aggiornati e pertinenti' },
        { label: 'Messaggi', value: 'Rispettosi e contestuali' },
        { label: 'Moderazione', value: 'Interventi quando serve proteggere la piattaforma' },
      ]}
      sections={[
        {
          title: 'Uso corretto degli annunci',
          items: [
            'Pubblica solo contenuti pertinenti ad adozioni, stalli o segnalazioni relative ai gatti.',
            'Mantieni descrizione, localita, foto e recapiti coerenti con la situazione reale del profilo che stai pubblicando.',
            'Evita testi fuorvianti, informazioni non verificabili o CTA che portano fuori dal contesto della piattaforma.',
          ],
        },
        {
          title: 'Contatti e messaggi',
          items: [
            'Usa la chat privata per fare domande utili e mantenere lo storico della conversazione.',
            'Non condividere dati sensibili che non vuoi lasciare nel thread e resta sempre focalizzato sull annuncio.',
            'Messaggi aggressivi, spam o non pertinenti possono portare a limitazioni o rimozioni.',
          ],
        },
        {
          title: 'Moderazione e sicurezza',
          items: [
            'Possiamo intervenire su contenuti o accessi quando servono maggiore chiarezza, correzioni o tutela della piattaforma.',
            'Le aree riservate richiedono autenticazione e alcune azioni vengono mantenute entro il workspace personale.',
            'Le pagine di manutenzione o errore vengono usate per preservare stabilita e continuita del servizio.',
          ],
        },
        {
          title: 'Responsabilita dell utente',
          items: [
            'Chi pubblica e responsabile dei dati inseriti e dei recapiti mostrati nella scheda.',
            'Chi usa la piattaforma deve rispettare il contesto degli annunci e i tempi delle persone coinvolte.',
            'Se hai dubbi sul percorso corretto, parti da FAQ o contatti invece di aprire azioni non pertinenti.',
          ],
        },
      ]}
      title="Termini d'uso in sintesi"
    />
  );
}
