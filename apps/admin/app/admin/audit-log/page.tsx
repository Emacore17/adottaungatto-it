import { AdminFeatureUnavailable } from '../../../components/admin-feature-unavailable';

export default function AuditLogPage() {
  return (
    <AdminFeatureUnavailable
      description="L'audit log amministrativo e in pausa finche non viene collegato ai record persistenti lato API con ricerca e filtri."
      routeLabel="/admin/audit-log"
      title="Audit log in rollout"
    />
  );
}
