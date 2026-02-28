import { ScaffoldPlaceholder } from '../../components/scaffold-placeholder';

export default function PrivacyPage() {
  return (
    <ScaffoldPlaceholder
      description="La privacy policy verra reinserita nella nuova architettura legale del sito."
      eyebrow="Pagina legale"
      nextSteps={[
        'Ripubblicare i contenuti legali aggiornati una volta chiuso il nuovo perimetro frontend.',
      ]}
      route="/privacy"
      title="Privacy"
    />
  );
}
