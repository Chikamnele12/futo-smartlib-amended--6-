import React, { useState, useRef } from "react";

export default function Dropzone({ icon: Icon, label, accept, fileName, onFile }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  }

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`dropzone ${dragging ? "dropzone-active" : ""} flex flex-col items-center gap-2 border-2 border-dashed border-paper-300 rounded-xl px-4 py-10 text-center cursor-pointer bg-paper-50`}
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${dragging ? "bg-brand-500 text-white" : "bg-brand-100 text-brand-700"}`}>
        <Icon size={20} />
      </div>
      <p className="text-sm text-ink-700 font-medium">
        {fileName || (dragging ? "Drop it here" : label)}
      </p>
      {!fileName && <p className="text-xs text-ink-500">Drag and drop, or click to browse</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
    </label>
  );
}
