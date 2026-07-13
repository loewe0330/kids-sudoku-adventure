import { describe, expectTypeOf, test } from "vitest";
import type {
  AdminAccount,
  AppStorage,
  ChildProfile,
  ParentAccount,
  PracticeRecord,
  SudokuPuzzleItem
} from "../shared/types";

describe("shared type barrels", () => {
  test("exports grouped domain types from one stable shared entry", () => {
    expectTypeOf<AdminAccount>().toHaveProperty("username").toEqualTypeOf<string>();
    expectTypeOf<ParentAccount>().toHaveProperty("id").toEqualTypeOf<string>();
    expectTypeOf<ChildProfile>().toHaveProperty("parentId").toEqualTypeOf<string>();
    expectTypeOf<PracticeRecord>().toHaveProperty("childId").toEqualTypeOf<string>();
    expectTypeOf<SudokuPuzzleItem>().toHaveProperty("solution").toEqualTypeOf<number[][]>();
    expectTypeOf<AppStorage>().toHaveProperty("puzzleBank").toEqualTypeOf<SudokuPuzzleItem[]>();
  });
});
