import {
  Category,
  CategoryWithParent,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@shared/types/models';
import { IPCContract } from './base.contract';

export const CategoryContracts = {
  GetAll: {
    channel: 'category:getAll',
  } as IPCContract<void, CategoryWithParent[]>,

  GetById: {
    channel: 'category:getById',
  } as IPCContract<{ id: string }, Category | null>,

  Create: {
    channel: 'category:create',
  } as IPCContract<CreateCategoryInput, Category>,

  Update: {
    channel: 'category:update',
  } as IPCContract<{ id: string; data: UpdateCategoryInput }, Category>,

  Delete: {
    channel: 'category:delete',
  } as IPCContract<{ id: string }, boolean>,
};
