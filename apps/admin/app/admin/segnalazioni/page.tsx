import { AdminFeatureUnavailable } from '../../../components/admin-feature-unavailable';

export default function AdminReportsPage() {
  return (
    <AdminFeatureUnavailable
      description="Le segnalazioni non mostrano piu dati mock. La vista tornera disponibile quando saranno pronti endpoint, filtri e workflow reali."
      routeLabel="/admin/segnalazioni"
      title="Segnalazioni in rollout"
    />
  );
}
