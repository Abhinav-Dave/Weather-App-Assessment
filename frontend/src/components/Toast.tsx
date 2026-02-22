import { useEffect, useState } from "react";
import type { Toast as ToastItem, ToastType } from "../hooks/useToast";

interface Props {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

const styles: Record<ToastType, string> = {
  success: "bg-green-900/90 border-green-600 text-green-100",
  error:   "bg-red-900/90 border-red-600 text-red-100",
  info:    "bg-slate-700/90 border-slate-500 text-slate-100",
};

const icons: Record<ToastType, string> = {
  success: "✅",
  error:   "⚠",
  info:    "ℹ",
};

function ToastItem({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm shadow-lg
        transition-all duration-300 ${styles[toast.type]}
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
    >
      <span>{icons[toast.type]}</span>
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="opacity-60 hover:opacity-100 text-lg leading-none"
      >
        ✕
      </button>
    </div>
  );
}

export default function ToastContainer({ toasts, onDismiss }: Props) {
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}