interface Props {
  message: string;
  onDismiss?: () => void;
}

export default function ErrorBanner({ message, onDismiss }: Props) {
  return (
    <div className="flex items-start justify-between gap-4 bg-red-900/40 border border-red-500/50 text-red-300 rounded-lg px-4 py-3 text-sm">
      <span>⚠ {message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-200 shrink-0"
        >
          ✕
        </button>
      )}
    </div>
  );
}