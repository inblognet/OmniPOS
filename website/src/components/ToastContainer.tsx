"use client";
import { useToastStore, ToastType } from "@/store/useToastStore";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";

const toastStyles: Record<ToastType, string> = {
  success: "bg-emerald-700 text-white",
  error: "bg-rose-700 text-white",
  info: "bg-blue-700 text-white",
  warning: "bg-amber-700 text-white",
};

const ToastIcon = ({ type }: { type: ToastType }) => {
  switch (type) {
    case "success": return <CheckCircle2 size={22} />;
    case "error": return <XCircle size={22} />;
    case "info": return <Info size={22} />;
    case "warning": return <AlertTriangle size={22} />;
  }
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3.5 rounded-lg shadow-xl shadow-black/10 w-80 animate-in slide-in-from-right-8 fade-in duration-300 relative overflow-hidden ${toastStyles[toast.type]}`}
        >
          <ToastIcon type={toast.type} />
          <p className="flex-1 text-[15px] font-medium tracking-wide">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      ))}
    </div>
  );
}