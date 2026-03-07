import { redirect } from 'next/navigation';

interface LegacyAccountListingDetailPageProps {
  params: Promise<{
    listingId: string;
  }>;
}

export default async function LegacyAccountListingDetailPage({
  params,
}: LegacyAccountListingDetailPageProps) {
  const { listingId } = await params;
  redirect(`/account/annunci/${encodeURIComponent(listingId)}`);
}
