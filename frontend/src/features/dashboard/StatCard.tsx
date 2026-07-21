export function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone?: 'destructive' | 'primary'
}) {
  return (
    <div className="rounded-md bg-secondary/60 p-3">
      <p className="mb-1.5 text-xs text-muted-foreground">{label}</p>
      <p
        className={
          tone === 'destructive'
            ? 'text-xl font-medium text-priority-p1'
            : tone === 'primary'
              ? 'text-xl font-medium text-primary'
              : 'text-xl font-medium'
        }
      >
        {value}
      </p>
    </div>
  )
}
