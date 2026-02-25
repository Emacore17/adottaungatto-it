export interface ListingMediaRecord {
  id: string;
  listingId: string;
  storageKey: string;
  mimeType: string;
  fileSize: string;
  width: number | null;
  height: number | null;
  hash: string | null;
  position: number;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateListingMediaInput {
  storageKey: string;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  hash: string | null;
  position: number;
  isPrimary: boolean;
}

export interface UploadListingMediaInput {
  mimeType: string;
  payload: Buffer;
  originalFileName: string | null;
  width: number | null;
  height: number | null;
  hash: string | null;
  position: number | null;
  isPrimary: boolean;
}

export interface ListingMediaView extends ListingMediaRecord {
  objectUrl: string;
}
