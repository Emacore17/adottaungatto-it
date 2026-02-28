import { ScaffoldPlaceholder } from '../../components/scaffold-placeholder';

export default function CookiePage() {
  return (
    <ScaffoldPlaceholder
      description="La documentazione cookie tornera quando il nuovo layer consenso e analytics sara ridefinito."
      eyebrow="Pagina legale"
      nextSteps={[
        'Ridefinire gli script effettivamente presenti nel nuovo frontend.',
        'Pubblicare la policy solo dopo aver chiuso il nuovo perimetro tracking.',
      ]}
      route="/cookie"
      title="Cookie"
    />
  );
}
