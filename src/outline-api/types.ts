// Outline API Types

export interface OutlineUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OutlineCollection {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  index?: string;
  url: string;
  urlId: string;
  permission?: string;
  sharing?: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  createdBy: OutlineUser;
  updatedBy: OutlineUser;
}

export interface OutlineDocument {
  id: string;
  title: string;
  text: string;
  url: string;
  urlId: string;
  revision: number;
  fullWidth?: boolean;
  emoji?: string;
  template?: boolean;
  templateId?: string;
  publishedAt?: string;
  archivedAt?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: OutlineUser;
  updatedBy: OutlineUser;
  collection?: OutlineCollection;
  collaborators?: OutlineUser[];
}

export interface OutlineApiResponse<T> {
  ok: boolean;
  data: T;
  status?: number;
  error?: string;
}

export interface OutlinePagination {
  offset: number;
  limit: number;
  total: number;
}
export interface OutlineDocumentsListResponse extends OutlineApiResponse<OutlineDocument[]> {
  pagination: OutlinePagination;
} 