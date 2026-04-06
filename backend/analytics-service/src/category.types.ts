export interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryCreateInput {
  name: string;
  description?: string;
  parentId?: string | null;
}

export interface CategoryUpdateInput {
  name?: string;
  description?: string;
  parentId?: string | null;
}
