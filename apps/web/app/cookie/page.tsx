import { ContentPage } from '../../components/content-page';
import { LinkButton } from '../../components/link-button';

export default function CookiePage() {
  return (
    <ContentPage
      actions={
        <>
          <LinkButton href="/privacy">Privacy e dati</LinkButton>
          <LinkButton href="/login" variant="outline">
            Accedi
          </LinkButton>
        </>
      }
      asideDescription="Cookie tecnici e preferenze locali servono a mantenere il sito usabile, ricordare alcune scelte e proteggere l accesso."
      badges={[
        { label: 'Tecnico', variant: 'secondary' },
        { label: 'Preferenze locali', variant: 'outline' },
      ]}
      description="Una panoramica chiara su sessione, preferenze e memorie locali usate per tenere il sito leggero e coerente."
      eyebrow="Cookie"
      highlights={[
        { label: 'Sessione', value: 'Accesso alle aree riservate' },
        { label: 'Tema', value: 'Preferenza chiara o scura salvata localmente' },
        { label: 'Preferiti', value: 'Sincronizzati su account (con fallback locale ospite)' },
      ]}
      sections={[
        {
          title: 'Cookie essenziali',
          items: [
            'Sono usati per mantenere attiva la sessione quando accedi alle aree riservate del sito.',
            'Servono a proteggere i percorsi account, annunci privati, impostazioni e messaggistica.',
            'Senza questi elementi il sito non potrebbe riconoscere in modo affidabile il tuo accesso.',
          ],
        },
        {
          title: 'Preferenze locali',
          items: [
            'La scelta del tema e altre preferenze leggere possono essere mantenute nel browser per evitare di reimpostarle a ogni visita.',
            'I preferiti usano persistenza account lato server quando sei autenticato; senza login resta un fallback locale sul browser corrente.',
            'Questi dati servono soprattutto a migliorare continuita e usabilita dell esperienza.',
          ],
        },
        {
          title: 'Misurazione e strumenti opzionali',
          items: [
            'Quando attiviamo strumenti di misurazione o componenti aggiuntivi, li distinguiamo dai cookie tecnici e li documentiamo in modo esplicito.',
            'L obiettivo resta usare solo cio che aiuta a migliorare prestazioni, stabilita o comprensione dei flussi principali.',
          ],
        },
        {
          title: 'Come gestirli',
          items: [
            'Puoi cancellare i dati locali dal browser o fare logout per chiudere la sessione attiva.',
            'Se condividi il dispositivo con altre persone, esci sempre dall account dopo l uso.',
            'Per dubbi su dati e preferenze, consulta anche la pagina privacy.',
          ],
        },
      ]}
      title="Cookie e preferenze del browser"
    />
  );
}
