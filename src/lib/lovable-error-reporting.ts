// Previously used window.__lovableEvents to report errors to Lovable's infrastructure.
// Replaced with a plain console.error so the error boundary still works independently.
export function reportLovableError(error: unknown, context: Record<string, unknown> = {}) {
  console.error("[ErrorBoundary]", error, context);
}
