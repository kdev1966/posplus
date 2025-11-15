import { CategoryRepository } from '../../repositories/category.repository';
import { CategoryContracts } from '../contracts';
import { createIPCHandler } from '../index';

const categoryRepo = new CategoryRepository();

/**
 * Register category IPC handlers
 */
export function registerCategoryHandlers(): void {
  // Get all categories
  createIPCHandler(CategoryContracts.GetAll.channel, async () => {
    return categoryRepo.getAllWithParent();
  });

  // Get category by ID
  createIPCHandler(CategoryContracts.GetById.channel, async (request: { id: string }) => {
    return categoryRepo.findById(request.id);
  });

  // Create category
  createIPCHandler(CategoryContracts.Create.channel, async (request: any) => {
    return categoryRepo.createCategory(request);
  });

  // Update category
  createIPCHandler(
    CategoryContracts.Update.channel,
    async (request: { id: string; data: any }) => {
      return categoryRepo.updateCategory(request.id, request.data);
    }
  );

  // Delete category
  createIPCHandler(CategoryContracts.Delete.channel, async (request: { id: string }) => {
    return categoryRepo.delete(request.id);
  });
}
