export interface MetadataType {
  id: string;
  code: string;
  name: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  isSystem: boolean;
}

export interface MetadataItem {
  id: string;
  metadataTypeId: string;
  code: string;
  value: string;
  extraData?: Record<string, any>;
  isActive: boolean;
}
