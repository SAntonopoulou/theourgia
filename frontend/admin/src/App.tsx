import { ToastProvider } from "@theourgia/shared";

import { Foundations } from "./routes/Foundations.js";

/**
 * Theourgia admin shell. Phase 02 batches ship the Foundations smoke
 * page only; AppShell, routing, and authenticated surfaces land later.
 *
 * ToastProvider mounts at the root so any descendant can call
 * `Toast.push(...)` without a context handshake.
 */
export function App() {
  return (
    <>
      <ToastProvider />
      <Foundations />
    </>
  );
}
