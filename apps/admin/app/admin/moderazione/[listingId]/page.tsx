import { AdminFeatureUnavailable } from '../../../../components/admin-feature-unavailable';

interface ModerationDetailPageProps {
  params: Promise<{
    listingId: string;
  }>;
}

export default async function ModerationDetailPage({ params }: ModerationDetailPageProps) {
  const { listingId } = await params;

  return (
    <AdminFeatureUnavailable
      description={`Il dettaglio singolo per l'annuncio #${listingId} e temporaneamente disabilitato: usa la coda moderazione principale per operare azioni reali API.`}
      routeLabel={`/admin/moderazione/${listingId}`}
      title="Dettaglio moderazione temporaneamente non disponibile"
    />
  );
}
