// Componente base para textarea
export default function Textarea({
    id,
    name,
    label,
    placeholder = '',
    value,
    onChange,
    disabled = false,
    error = '',
    rows = 4,
    className = '',
    ...props
}) {
    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {label && (
                <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-widest text-cr-muted">
                    {label}
                </label>
            )}
            <textarea
                id={id}
                name={name}
                value={value}
                onChange={onChange}
                disabled={disabled}
                placeholder={placeholder}
                rows={rows}
                className={[
                    'w-full px-4 py-2.5 text-sm rounded-xl bg-cr-surface2 text-cr-text resize-none',
                    'border transition-all duration-200 outline-none placeholder:text-cr-muted/50',
                    error
                        ? 'border-rose-500/60 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20'
                        : 'border-cr-primary/15 focus:border-cr-primary focus:ring-2 focus:ring-cr-primary/20',
                    disabled && 'opacity-40 cursor-not-allowed',
                ]
                    .filter(Boolean)
                    .join(' ')}
                {...props}
            />
            {error && <p className="text-[11px] text-rose-400">{error}</p>}
        </div>
    )
}
