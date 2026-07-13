export interface PrintAdapter {
  printCurrentPuzzle(): void;
  printPuzzleSet(): void;
  canPrint(): boolean;
}
