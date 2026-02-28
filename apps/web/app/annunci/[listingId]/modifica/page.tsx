import { redirect } from 'next/navigation';
import { requireWebSession } from '../../../../lib/auth';

interface EditListingPageProps {
  params: Promise<{
    listingId: string;
  }>;
}

export default async function EditListingPage({ params }: EditListingPageProps) {
  const { listingId } = await params;
  await requireWebSession(`/annunci/${listingId}/modifica`);
  redirect(`/account/listings/${listingId}`);
}
