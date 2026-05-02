"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";

interface Toast {
    id: number;
    message: string;
    type: "success" | "error";
}

interface ToastCtx {
    success: (message: string) => void;
    error: (message: string) => void;
}

const ToastContext = createContext<ToastCtx>({} as ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: "success" | "error") => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    }, []);

    const success = useCallback((msg: string) => addToast(msg, "success"), [addToast]);
    const error = useCallback((msg: string) => addToast(msg, "error"), [addToast]);

    const dismiss = (id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ success, error }}>
            {children}
            {/* Container des toasts — fixé en bas à droite, au-dessus de tout */}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg
                                    border backdrop-blur-sm min-w-[300px] max-w-[420px]
                                    animate-[slideIn_0.3s_ease-out]
                                    ${toast.type === "success"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : "bg-red-50 border-red-200 text-red-800"
                        }`}
                    >
                        {toast.type === "success" ? (
                            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                        ) : (
                            <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                        )}
                        <p className="text-sm font-medium flex-1">{toast.message}</p>
                        <button
                            onClick={() => dismiss(toast.id)}
                            className="text-gray-400 hover:text-gray-600 transition cursor-pointer shrink-0"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => useContext(ToastContext);