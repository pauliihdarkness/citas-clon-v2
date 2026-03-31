import { ActivityFeed } from '../components/ActivityFeed'

export function RadarPage() {
  return (
    <div className="radar-page container fade-in-up">
      <header className="page-header">
        <h1>Sistema de Radar</h1>
        <p className="subtitle">Monitoreo de actividad global en tiempo real</p>
      </header>

      <div className="radar-grid">
        <div className="radar-monitor">
          <div className="radar-sweep-container">
            <div className="radar-sweep" />
            <div className="radar-grid-lines" />
            <div className="radar-center-dot" />
          </div>
          <div className="monitor-stats">
            <div className="stat">ESTADO: <span className="stat-value">ACTIVO</span></div>
            <div className="stat">CONEXIÓN: <span className="stat-value">CIFRADA</span></div>
            <div className="stat">PROCEDENCIA: <span className="stat-value">GLOBAL</span></div>
          </div>
        </div>

        <section className="activity-log-container">
          <ActivityFeed maxItems={50} showHeader={false} />
        </section>
      </div>
    </div>
  )
}
