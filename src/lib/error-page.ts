/**
 * Server-Side Catastrophic Error Fallback Document
 *
 * Rendered when SSR encounters an unrecoverable exception before hydration.
 * Preserves PennyGrade visual branding, clear user guidance, safe recovery actions,
 * and correlation ID reference without leaking internal stack traces or database errors.
 */

export function renderErrorPage(requestId?: string): string {
  const reqHtml = requestId
    ? `<p style="font-size: 0.75rem; color: #64748b; margin-top: 1.5rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">Reference ID: ${requestId}</p>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Service Unavailable | PennyGrade</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <style>
      :root {
        --bg: #0f172a;
        --card-bg: #1e293b;
        --gold: #d97706;
        --gold-hover: #b45309;
        --text: #f8fafc;
        --text-muted: #94a3b8;
        --border: #334155;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font: 16px/1.6 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: var(--bg);
        color: var(--text);
        display: grid;
        place-items: center;
        min-height: 100vh;
        padding: 1.5rem;
      }
      .card {
        max-width: 30rem;
        width: 100%;
        text-align: center;
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 1rem;
        padding: 2.5rem 2rem;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
      }
      .logo-emblem {
        width: 3.5rem;
        height: 3.5rem;
        margin: 0 auto 1.25rem;
        border-radius: 0.75rem;
        background: rgba(217, 119, 6, 0.15);
        border: 1px solid rgba(217, 119, 6, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        color: #fbbf24;
        font-size: 1.25rem;
      }
      h1 { font-size: 1.35rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem; letter-spacing: -0.01em; }
      p { color: var(--text-muted); font-size: 0.95rem; margin-bottom: 1.75rem; }
      .actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
      a, button {
        padding: 0.65rem 1.25rem;
        border-radius: 0.5rem;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        transition: all 0.15s ease;
        border: 1px solid transparent;
      }
      .primary {
        background: var(--gold);
        color: #ffffff;
        border-color: var(--gold);
      }
      .primary:hover { background: var(--gold-hover); }
      .secondary {
        background: transparent;
        color: var(--text);
        border-color: var(--border);
      }
      .secondary:hover { background: rgba(255, 255, 255, 0.05); }
    </style>
  </head>
  <body>
    <main class="card" role="main">
      <div class="logo-emblem" aria-hidden="true">PG</div>
      <h1>PennyGrade is temporarily unavailable</h1>
      <p>We encountered an unexpected system error while loading this page. Our reliability systems have been alerted.</p>
      <div class="actions">
        <button class="primary" onclick="window.location.reload()">Try Again</button>
        <a class="secondary" href="/">Return to Home</a>
      </div>
      ${reqHtml}
    </main>
  </body>
</html>`;
}
