import { CrescentMark } from "./logo";

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode; icon?: unknown }) {
  return (
    <div className="flex flex-col items-start border-y border-hairline py-16 sm:items-center sm:text-center">
      <CrescentMark className="mb-6 size-8 opacity-80" />
      <h2 className="font-display text-display-sm">{title}</h2>
      {description ? <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
