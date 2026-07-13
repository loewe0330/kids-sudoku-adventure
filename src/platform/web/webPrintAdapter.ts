import type { PrintAdapter } from "../adapters/printAdapter";

export const webPrintAdapter: PrintAdapter = {
  printCurrentPuzzle(): void {
    if (this.canPrint()) window.print();
  },
  printPuzzleSet(): void {
    if (this.canPrint()) window.print();
  },
  canPrint(): boolean {
    return typeof window !== "undefined" && typeof window.print === "function";
  }
};
