import type { SudokuSize } from "../types";

interface NumberPadProps {
  size: SudokuSize;
  onInput: (value: number) => void;
  onDelete: () => void;
}

export function NumberPad({ size, onInput, onDelete }: NumberPadProps) {
  return (
    <div className="number-pad no-print">
      {Array.from({ length: size }, (_, index) => index + 1).map((num) => (
        <button key={num} onClick={() => onInput(num)}>{num}</button>
      ))}
      <button className="danger" onClick={onDelete}>删除</button>
    </div>
  );
}
