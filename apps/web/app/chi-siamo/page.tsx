import { ScaffoldPlaceholder } from '../../components/scaffold-placeholder';

export default function AboutPage() {
  return (
    <ScaffoldPlaceholder
      description="La pagina istituzionale verra riscritta quando il nuovo posizionamento del prodotto sara definito."
      eyebrow="Pagina istituzionale"
      nextSteps={[
        'Ridefinire tono, manifesto e proof points del progetto.',
        'Ricostruire il contenuto editoriale sopra il nuovo shell.',
      ]}
      route="/chi-siamo"
      title="Chi siamo"
    />
  );
}
