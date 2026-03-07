import { AdminFeatureUnavailable } from '../../../components/admin-feature-unavailable';

export default function AdminUsersPage() {
  return (
    <AdminFeatureUnavailable
      description="La gestione utenti richiede endpoint amministrativi reali e audit coerente. La pagina e nascosta dal menu fino al completamento backend."
      routeLabel="/admin/utenti"
      title="Gestione utenti in rollout"
    />
  );
}
