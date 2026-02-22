import { Outlet, NavLink } from "react-router-dom";
import { useState, useCallback } from "react";
import ToastContainer from "./Toast";
import type { Toast, ToastType } from "../hooks/useToast";

// Global toast context
import { createContext, useContext } from "react";

interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void;
}

export const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function useAppToast() {
  return useContext(ToastContext);
}

let _counter = 0;

export default function Layout() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = ++_counter;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2800);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? "bg-blue-600 text-white"
        : "text-slate-300 hover:bg-slate-700 hover:text-white"
    }`;

  return (
    <ToastContext.Provider value={{ showToast }}>
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <header className="border-b border-slate-700 bg-slate-800">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌤</span>
              <span className="font-bold text-lg tracking-tight">WeatherApp</span>
            </div>
            <nav className="flex gap-2">
              <NavLink to="/" end className={navClass}>Home</NavLink>
              <NavLink to="/history" className={navClass}>History</NavLink>
            </nav>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">
          <Outlet />
        </main>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}