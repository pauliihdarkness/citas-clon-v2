export function PlaceholderPage({ title }) {
  return (
    <section className="container">
      <h1>{title}</h1>
      <p style={{ color: 'var(--secondary)', fontSize: 13 }}>Pantalla pendiente de migración.</p>
    </section>
  )
}
