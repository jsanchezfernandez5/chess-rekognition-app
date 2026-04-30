// Componente base para desplegables
export default function InputSelect({
    id,
    name,
    label,
    value,
    onChange,
    disabled = false,
    error = '',
    options = [],
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
            <div className="relative">
                <select
                    id={id}
                    name={name}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    className={[
                        'w-full px-4 py-2.5 text-sm rounded-xl bg-cr-surface2 text-cr-text appearance-none cursor-pointer',
                        'border transition-all duration-200 outline-none',
                        error
                            ? 'border-rose-500/60 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20'
                            : 'border-cr-primary/15 focus:border-cr-primary focus:ring-2 focus:ring-cr-primary/20',
                        disabled && 'opacity-40 cursor-not-allowed',
                    ]
                        .filter(Boolean)
                        .join(' ')}
                    {...props}
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-cr-muted">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
            {error && <p className="text-[11px] text-rose-400">{error}</p>}
        </div>
    )
}
