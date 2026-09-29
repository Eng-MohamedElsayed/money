import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { qk } from "../query-keys";
import {
  createCategoryAction,
  deleteCategoryAction,
  getCategoriesAction,
  updateCategoryAction,
} from "../../server/actions/categories";
import {
  categoryInputSchema,
  categoryUpdateSchema,
  type CategoryInput,
  type CategoryUpdate,
} from "../schemas/categories";

export { categoryInputSchema, categoryUpdateSchema, type CategoryInput, type CategoryUpdate };

export interface CategoryView {
  id: string;
  name: string;
  defaultBucket:
    | "GROWTH"
    | "STABILITY"
    | "ESSENTIALS"
    | "REWARDS"
    | "UNCLASSIFIED";
  isSystem: boolean;
  transactionCount: number;
}

export function transformCategories(raw: any): CategoryView[] {
  if (!raw || !Array.isArray(raw.categories)) return [];
  return raw.categories.map((row: any) => ({
    id: String(row.id),
    name: String(row.name),
    defaultBucket: (row.defaultBucket ?? "UNCLASSIFIED") as CategoryView["defaultBucket"],
    isSystem: Boolean(row.isSystem),
    transactionCount: Math.round(Number(row.transactionCount) || 0),
  }));
}

export function categoriesQueryOptions(userId: string) {
  return queryOptions({
    queryKey: qk.categories(userId),
    queryFn: async () => transformCategories(await getCategoriesAction()),
  });
}

export function useCategories(userId: string) {
  return useQuery(categoriesQueryOptions(userId));
}

export function useCreateCategory(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryInput) => createCategoryAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.categories(userId) });
    },
  });
}

export function useUpdateCategory(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: CategoryUpdate }) =>
      updateCategoryAction(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.categories(userId) });
    },
  });
}

export function useDeleteCategory(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCategoryAction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.categories(userId) });
    },
  });
}
