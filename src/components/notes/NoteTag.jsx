export default function NoteTag({ cor, titulo, temLink = false }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-medium"
      style={{
        backgroundColor: cor ? `${cor}22` : '#94A3B822',
        color: cor ?? '#94A3B8',
        borderRadius: '99px',
        padding: '2px 8px',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: cor ?? '#94A3B8' }}
      />
      <span className="truncate max-w-[120px]">{titulo}</span>
      {temLink && (
        <svg className="w-2.5 h-2.5 flex-shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      )}
    </span>
  )
}
