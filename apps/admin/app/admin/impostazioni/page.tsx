import { AdminFeatureUnavailable } from '../../../components/admin-feature-unavailable';

export default function AdminSettingsPage() {
  return (
    <AdminFeatureUnavailable
      description="Le impostazioni piattaforma saranno riattivate quando saranno presenti endpoint amministrativi reali e validazioni server-side."
      routeLabel="/admin/impostazioni"
      title="Impostazioni in rollout"
    />
  );
}
