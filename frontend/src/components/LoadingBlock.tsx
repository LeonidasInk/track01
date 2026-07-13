export function LoadingBlock({ lines = 3 }: { lines?: number }) {
  return (
    <div className="loading-block" aria-label="Cargando" aria-busy="true">
      {Array.from({ length: lines }, (_, index) => (
        <span key={index} style={{ width: `${Math.max(42, 96 - index * 13)}%` }} />
      ))}
    </div>
  )
}
