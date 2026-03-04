import { ContentPage } from '../../components/content-page';
import { LinkButton } from '../../components/link-button';

export default function CareersPage() {
  return (
    <ContentPage
      actions={
        <>
          <LinkButton href="/chi-siamo">Scopri il progetto</LinkButton>
          <LinkButton href="/contatti" variant="outline">
            Contatti
          </LinkButton>
        </>
      }
      asideDescription="Cerchiamo persone attente a prodotto, chiarezza e fiducia: non una vetrina di titoli, ma un lavoro concreto sulle esperienze che aiutano davvero."
      badges={[
        { label: 'Product minded', variant: 'secondary' },
        { label: 'Qualita prima del rumore', variant: 'outline' },
      ]}
      description="Quando apriamo collaborazioni cerchiamo profili capaci di semplificare, ordinare i flussi e migliorare l'esperienza di chi usa il sito."
      eyebrow="Lavora con noi"
      highlights={[
        { label: 'Design', value: 'Gerarchie visive, chiarezza, conversione' },
        { label: 'Engineering', value: 'Interfacce solide e performanti' },
        { label: 'Operations', value: 'Supporto, moderazione, processi chiari' },
      ]}
      sections={[
        {
          title: 'Che tipo di persone cerchiamo',
          items: [
            'Designer e sviluppatori capaci di lavorare mobile-first e di togliere complessita invece di aggiungerla.',
            'Profili operativi attenti a fiducia, qualita dei contenuti e gestione ordinata dei flussi utente.',
            'Persone che sanno trasformare un bisogno concreto in un percorso semplice, leggibile e difendibile.',
          ],
        },
        {
          title: 'Come lavoriamo',
          items: [
            'Partiamo dai flussi core e dalle priorita reali, non da pagine decorative o feature ridondanti.',
            'Valutiamo ogni scelta su usabilita, chiarezza del copy, performance e coerenza tra mobile e desktop.',
            'Documentazione, componenti riusabili e decisioni esplicite fanno parte del lavoro, non arrivano dopo.',
          ],
        },
        {
          title: 'Quando apriamo posizioni',
          items: [
            'Le opportunita vengono pubblicate qui quando sono chiari responsabilita, obiettivi e impatto del ruolo.',
            'Se oggi non trovi un ruolo aperto, la pagina resta come riferimento per il tipo di collaborazione che stiamo costruendo.',
          ],
        },
      ]}
      title="Lavorare su un prodotto che preferisce chiarezza, fiducia e scelte essenziali"
    />
  );
}
