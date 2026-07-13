import type { AppStorage } from "../../shared/types";

export type StorageMigration = (storage: Partial<AppStorage>) => Partial<AppStorage>;

export const storageMigrations: StorageMigration[] = [];
