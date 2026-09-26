export type StorageProviderId = "google-drive" | "terabox" | "dropbox" | "mega" | "mediafire";
export type StorageProviderSection = "google" | "other";
export type ProviderMaturity = "active" | "planned" | "experimental";

export type TransferProfile = {
  maxActiveUploads: number;
  maxActiveDownloads: number;
  uploadPartConcurrency: number;
  adaptiveConcurrency: boolean;
  resumable: boolean;
  requiresPreHash: boolean;
};

export type ProviderCapabilities = {
  folders: boolean;
  quota: boolean;
  sharing: boolean;
  multipartTransport: boolean;
  distributedStorageParts: boolean;
  wholeFilePlacementOnly: boolean;
  encryptionRequired: true;
};

export type StorageProviderDescriptor = {
  id: StorageProviderId;
  name: string;
  section: StorageProviderSection;
  maturity: ProviderMaturity;
  description: string;
  transfer: TransferProfile;
  capabilities: ProviderCapabilities;
};

export const storageProviders: readonly StorageProviderDescriptor[] = [
  {
    id: "google-drive",
    name: "Google Drive",
    section: "google",
    maturity: "active",
    description: "Multiple authorized Google accounts in one Meshly workspace. Managed uploads stay whole inside one selected or automatically chosen account.",
    transfer: { maxActiveUploads: 3, maxActiveDownloads: 3, uploadPartConcurrency: 1, adaptiveConcurrency: true, resumable: true, requiresPreHash: false },
    capabilities: { folders: true, quota: true, sharing: true, multipartTransport: true, distributedStorageParts: false, wholeFilePlacementOnly: true, encryptionRequired: true },
  },
  {
    id: "terabox",
    name: "TeraBox",
    section: "other",
    maturity: "planned",
    description: "Official API adapter planned with a conservative sequential upload queue and provider-aware retry handling.",
    transfer: { maxActiveUploads: 1, maxActiveDownloads: 1, uploadPartConcurrency: 1, adaptiveConcurrency: false, resumable: true, requiresPreHash: true },
    capabilities: { folders: true, quota: true, sharing: false, multipartTransport: true, distributedStorageParts: false, wholeFilePlacementOnly: false, encryptionRequired: true },
  },
  {
    id: "dropbox",
    name: "Dropbox",
    section: "other",
    maturity: "planned",
    description: "OAuth-backed provider adapter with resumable transfers and adaptive concurrency.",
    transfer: { maxActiveUploads: 3, maxActiveDownloads: 3, uploadPartConcurrency: 2, adaptiveConcurrency: true, resumable: true, requiresPreHash: false },
    capabilities: { folders: true, quota: true, sharing: true, multipartTransport: true, distributedStorageParts: false, wholeFilePlacementOnly: false, encryptionRequired: true },
  },
  {
    id: "mega",
    name: "MEGA",
    section: "other",
    maturity: "planned",
    description: "SDK/API-backed provider adapter planned behind the shared Meshly transfer and encryption layers.",
    transfer: { maxActiveUploads: 3, maxActiveDownloads: 3, uploadPartConcurrency: 2, adaptiveConcurrency: true, resumable: true, requiresPreHash: false },
    capabilities: { folders: true, quota: true, sharing: true, multipartTransport: true, distributedStorageParts: false, wholeFilePlacementOnly: false, encryptionRequired: true },
  },
  {
    id: "mediafire",
    name: "MediaFire",
    section: "other",
    maturity: "experimental",
    description: "Held behind capability verification until current supported production API access is confirmed.",
    transfer: { maxActiveUploads: 1, maxActiveDownloads: 1, uploadPartConcurrency: 1, adaptiveConcurrency: false, resumable: false, requiresPreHash: false },
    capabilities: { folders: true, quota: false, sharing: true, multipartTransport: false, distributedStorageParts: false, wholeFilePlacementOnly: false, encryptionRequired: true },
  },
] as const;

export function getStorageProvider(id: StorageProviderId) {
  const provider = storageProviders.find((item) => item.id === id);
  if (!provider) throw new Error(`Unknown storage provider: ${id}`);
  return provider;
}
