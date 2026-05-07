import { useRef, useState } from "react";

export function useTwoStepConfirm() {
  const [state, setState] = useState({
    open: false,
    step: 1,
    title: "Confirm action",
    primaryMessage: "",
    secondaryMessage: "Please confirm once again to continue.",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel"
  });
  const resolverRef = useRef(null);

  const closeWith = (result) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setState((prev) => ({ ...prev, open: false, step: 1 }));
    if (resolver) resolver(result);
  };

  const confirm = (options) =>
    new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({
        open: true,
        step: 1,
        title: options?.title || "Confirm action",
        primaryMessage: options?.primaryMessage || "Are you sure?",
        secondaryMessage:
          options?.secondaryMessage || "Please confirm once again to continue.",
        confirmLabel: options?.confirmLabel || "Confirm",
        cancelLabel: options?.cancelLabel || "Cancel"
      });
    });

  const dialog = state.open ? (
    <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900">{state.title}</h3>
        <p className="text-sm text-slate-600 mt-2">
          {state.step === 1 ? state.primaryMessage : state.secondaryMessage}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => closeWith(false)}
            className="px-4 py-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm"
          >
            {state.cancelLabel}
          </button>
          {state.step === 1 ? (
            <button
              type="button"
              onClick={() => setState((prev) => ({ ...prev, step: 2 }))}
              className="px-4 py-2 rounded bg-amber-600 hover:bg-amber-700 text-white text-sm"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={() => closeWith(true)}
              className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm"
            >
              {state.confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, dialog };
}
