import { Badge, Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import { LinkButton } from '../../components/link-button';
import { PageShell } from '../../components/page-shell';

const faqItems = [
  {
    question: 'Serve un account per vedere gli annunci?',
    answer:
      'No. Il catalogo pubblico e i dettagli degli annunci sono consultabili senza login. L account serve soprattutto per messaggi, pubblicazione e gestione dell area riservata.',
  },
  {
    question: 'Posso salvare i preferiti senza accedere?',
    answer:
      'Si. I preferiti vengono mantenuti sul dispositivo che stai usando, cosi puoi ritrovare gli annunci salvati anche senza sessione attiva.',
  },
  {
    question: "Come contatto l'inserzionista?",
    answer:
      "Dal dettaglio annuncio puoi aprire la conversazione privata. Per inviare un messaggio serve un account, cosi l'inbox resta collegata correttamente al tuo profilo.",
  },
  {
    question: 'Che tipo di annunci posso pubblicare?',
    answer:
      'Il flusso attuale e pensato per adozioni, stalli e segnalazioni. Ogni scheda deve essere chiara, contestuale e aggiornata.',
  },
  {
    question: 'Posso filtrare per luogo e caratteristiche?',
    answer:
      'Si. La ricerca permette di lavorare su citta, provincia, regione e altri filtri utili per restringere rapidamente il catalogo.',
  },
  {
    question: 'Dove gestisco annunci e messaggi dopo il login?',
    answer:
      'Tutto passa dal workspace: account, miei annunci, preferiti, impostazioni e inbox privata sono raccolti in una navigazione unica.',
  },
] as const;

export default function FaqPage() {
  return (
    <PageShell
      aside={
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">FAQ essenziali</Badge>
            <Badge variant="outline">Risposte brevi</Badge>
          </div>
          <p className="text-sm leading-6 text-[var(--color-text-muted)]">
            Le domande qui sotto coprono i flussi principali: catalogo, contatto, account,
            preferiti e pubblicazione.
          </p>
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/annunci">Vai agli annunci</LinkButton>
            <LinkButton href="/contatti" variant="outline">
              Contatti
            </LinkButton>
          </div>
        </div>
      }
      description="Le risposte piu utili per capire come muoversi nel sito senza cercare informazioni disperse tra piu pagine."
      eyebrow="FAQ"
      title="Domande frequenti"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Le risposte piu frequenti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {faqItems.map((item) => (
              <details
                className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-4"
                key={item.question}
              >
                <summary className="cursor-pointer rounded-[16px] pr-2 text-sm font-semibold text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-muted)]">
                  {item.question}
                </summary>
                <p className="pt-3 text-sm leading-6 text-[var(--color-text-muted)]">
                  {item.answer}
                </p>
              </details>
            ))}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Percorsi rapidi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-[var(--color-text-muted)]">
            <p>Apri direttamente la sezione che ti serve senza passare da schermate inutili.</p>
            <div className="flex flex-wrap gap-2">
              <LinkButton href="/login">Accedi</LinkButton>
              <LinkButton href="/pubblica" variant="outline">
                Pubblica
              </LinkButton>
              <LinkButton href="/preferiti" variant="secondary">
                Preferiti
              </LinkButton>
              <LinkButton href="/messaggi" variant="secondary">
                Messaggi
              </LinkButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
