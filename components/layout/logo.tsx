export default function Logo() {
  return (
    <span
      className="font-[family-name:var(--font-hedvig-letters-serif)] text-foreground flex items-center text-2xl leading-none font-medium tracking-tight lowercase"
      aria-label="kubera">
      {/* Full wordmark when expanded */}
      <span className="group-data-[collapsible=icon]:hidden">kubera.</span>
      {/* Favicon-style "k" badge when the sidebar is collapsed to icon-only */}
      <span className="hidden size-8 items-center justify-center rounded-[7px] bg-[#0a0a0a] text-xl text-white group-data-[collapsible=icon]:flex">
        k
      </span>
    </span>
  );
}
