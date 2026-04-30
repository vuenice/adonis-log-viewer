import './style.css'

const el = document.getElementById('app')
if (el) {
  el.innerHTML = `
    <main class="wrap">
      <header class="header">
        <h1>Logs viewer</h1>
        <p>Served by the Adonis app at <code>/logs</code>.</p>
      </header>
      <section class="card">
        <p>If you can see this page, routes and assets are wired correctly.</p>
      </section>
    </main>
  `
}
