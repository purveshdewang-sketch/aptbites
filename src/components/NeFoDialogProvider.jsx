import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const NeFoDialogContext = createContext(null);

const DEFAULT_DIALOG = {
  open: false,
  mode: "alert",
  title: "NeFo",
  message: "",
  confirmText: "OK",
  cancelText: "Cancel",
  tone: "default",
};

function normalizeDialogOptions(
  input,
  fallbackMode
) {
  if (
    typeof input === "string"
  ) {
    return {
      mode: fallbackMode,
      title:
        fallbackMode ===
        "confirm"
          ? "Please confirm"
          : "NeFo",
      message: input,
      confirmText:
        fallbackMode ===
        "confirm"
          ? "Confirm"
          : "OK",
      cancelText: "Cancel",
      tone: "default",
    };
  }

  return {
    mode:
      input?.mode ||
      fallbackMode,
    title:
      input?.title ||
      (fallbackMode ===
      "confirm"
        ? "Please confirm"
        : "NeFo"),
    message:
      String(
        input?.message || ""
      ),
    confirmText:
      input?.confirmText ||
      (fallbackMode ===
      "confirm"
        ? "Confirm"
        : "OK"),
    cancelText:
      input?.cancelText ||
      "Cancel",
    tone:
      input?.tone ||
      "default",
  };
}

export function NeFoDialogProvider({
  children,
}) {
  const [
    dialog,
    setDialog,
  ] = useState(
    DEFAULT_DIALOG
  );

  const resolverRef =
    useRef(null);

  const closeDialog =
    useCallback((result) => {
      const resolver =
        resolverRef.current;

      resolverRef.current =
        null;

      setDialog(
        DEFAULT_DIALOG
      );

      if (resolver) {
        resolver(result);
      }
    }, []);

  const openDialog =
    useCallback(
      (options) => {
        if (
          resolverRef.current
        ) {
          resolverRef.current(
            false
          );
        }

        return new Promise(
          (resolve) => {
            resolverRef.current =
              resolve;

            setDialog({
              ...DEFAULT_DIALOG,
              ...options,
              open: true,
            });
          }
        );
      },
      []
    );

  const confirmAction =
    useCallback(
      (input) => {
        return openDialog(
          normalizeDialogOptions(
            input,
            "confirm"
          )
        );
      },
      [openDialog]
    );

  const showAlert =
    useCallback(
      async (input) => {
        await openDialog(
          normalizeDialogOptions(
            input,
            "alert"
          )
        );
      },
      [openDialog]
    );

  useEffect(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return undefined;
    }

    const originalAlert =
      window.alert;

    window.alert = (
      message
    ) => {
      void showAlert({
        title: "NeFo",
        message:
          String(message || ""),
        confirmText: "OK",
      });
    };

    window.NeFoDialog = {
      alert: showAlert,
      confirm:
        confirmAction,
    };

    return () => {
      window.alert =
        originalAlert;

      if (
        window.NeFoDialog
          ?.alert === showAlert
      ) {
        delete window.NeFoDialog;
      }
    };
  }, [
    confirmAction,
    showAlert,
  ]);

  useEffect(() => {
    if (!dialog.open) {
      return undefined;
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(
      event
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        closeDialog(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    dialog.open,
    closeDialog,
  ]);

  const contextValue =
    useMemo(
      () => ({
        confirmAction,
        showAlert,
      }),
      [
        confirmAction,
        showAlert,
      ]
    );

  const destructive =
    dialog.tone ===
    "danger";

  return (
    <NeFoDialogContext.Provider
      value={contextValue}
    >
      {children}

      {dialog.open ? (
        <div
          className="fixed inset-0 z-[5000] flex items-end justify-center px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-12 sm:items-center"
          role="presentation"
        >
          <button
            type="button"
            aria-label="Close dialog"
            onClick={() =>
              closeDialog(false)
            }
            className="absolute inset-0 bg-[#181411]/55 backdrop-blur-[2px]"
          />

          <section
            role={
              dialog.mode ===
              "confirm"
                ? "alertdialog"
                : "dialog"
            }
            aria-modal="true"
            aria-labelledby="nefo-dialog-title"
            aria-describedby="nefo-dialog-message"
            className="relative w-full max-w-sm overflow-hidden rounded-[28px] border border-[#D8C9B3] bg-[#FFFDF7] shadow-[0_24px_70px_rgba(24,20,17,0.35)]"
          >
            <div className="p-5">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full border text-xl ${
                  destructive
                    ? "border-red-200 bg-red-50 text-red-600"
                    : "border-[#D8C9B3] bg-[#FFF0DF] text-[#3F5128]"
                }`}
              >
                {destructive
                  ? "!"
                  : "✓"}
              </div>

              <h2
                id="nefo-dialog-title"
                className="mt-4 text-xl font-black text-[#181411]"
              >
                {dialog.title}
              </h2>

              <p
                id="nefo-dialog-message"
                className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-[#6B6258]"
              >
                {dialog.message}
              </p>
            </div>

            <div
              className={`grid gap-3 border-t border-[#EADFCE] bg-[#FFF8EC] p-4 ${
                dialog.mode ===
                "confirm"
                  ? "grid-cols-2"
                  : "grid-cols-1"
              }`}
            >
              {dialog.mode ===
              "confirm" ? (
                <button
                  type="button"
                  onClick={() =>
                    closeDialog(
                      false
                    )
                  }
                  className="rounded-2xl border border-[#D8C9B3] bg-white py-3.5 text-sm font-black text-[#6B6258] active:scale-[0.98]"
                >
                  {dialog.cancelText}
                </button>
              ) : null}

              <button
                type="button"
                autoFocus
                onClick={() =>
                  closeDialog(true)
                }
                className={`rounded-2xl border py-3.5 text-sm font-black text-white active:scale-[0.98] ${
                  destructive
                    ? "border-red-700 bg-red-600"
                    : "border-[#3F5128] bg-[#3F5128]"
                }`}
              >
                {dialog.confirmText}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </NeFoDialogContext.Provider>
  );
}

export function useNeFoDialog() {
  const context =
    useContext(
      NeFoDialogContext
    );

  if (!context) {
    throw new Error(
      "useNeFoDialog must be used inside NeFoDialogProvider."
    );
  }

  return context;
}
