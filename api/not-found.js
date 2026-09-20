export default function handler(_request, response) {
  response.status(404);
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  response.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <meta name="theme-color" content="#050507" />
    <title>404 — SabHaven</title>
    <link rel="stylesheet" href="/404.css" />
  </head>
  <body>
    <main class="not-found">
      <a class="brand" href="/">S/ <span>SabHaven</span></a>
      <section>
        <p class="code">404</p>
        <h1>Page not found</h1>
        <p class="copy">That SabHaven route does not exist. Check the address or return to the file portal.</p>
        <a class="action" href="/">Back to SabHaven</a>
      </section>
      <nav aria-label="Legal and support">
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/acceptable-use">Acceptable Use</a>
        <a href="/abuse">Report abuse</a>
        <a href="/security">Security</a>
        <a href="/contact">Contact</a>
      </nav>
    </main>
  </body>
</html>`);
}
