import { Toaster as SonnerToaster } from 'sonner'

function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            'group toast bg-card text-card-foreground border border-border shadow-lg rounded-md',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-muted text-muted-foreground',
        },
      }}
    />
  )
}

export { Toaster }
