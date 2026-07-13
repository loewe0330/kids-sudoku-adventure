interface ToolbarProps {
  onCheck: () => void;
  onHint: () => void;
  onReveal: () => void;
  onReset: () => void;
  onNext: () => void;
  onSave: () => void;
  onPrint: () => void;
  onPrintAnswer: () => void;
  disabled?: boolean;
}

export function Toolbar({ onCheck, onHint, onReveal, onReset, onNext, onSave, onPrint, onPrintAnswer, disabled }: ToolbarProps) {
  return (
    <div className="toolbar no-print">
      <div className="toolbar-group">
        <button className="primary" onClick={onCheck} disabled={disabled}>检查答案</button>
        <button onClick={onHint} disabled={disabled}>提示</button>
        <button onClick={onReveal}>显示答案</button>
      </div>
      <div className="toolbar-group">
        <button onClick={onReset}>重做本题</button>
        <button onClick={onNext}>生成下一题</button>
        <button onClick={onSave}>保存到题库</button>
      </div>
      <div className="toolbar-group">
        <button onClick={onPrint}>打印当前题</button>
        <button onClick={onPrintAnswer}>打印答案</button>
      </div>
    </div>
  );
}
