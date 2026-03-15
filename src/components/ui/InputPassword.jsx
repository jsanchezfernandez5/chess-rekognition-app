import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function InputPassword({
    id,
    name = 'password',
    label = 'Contraseña',
    placeholder = '••••••••',
    value,
    onChange,
    disabled = false,
    error = '',
    autoComplete = 'current-password',
    className = '',
    ...props
}) {
    const [visible, setVisible] = useState(false)

    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {label && (
                <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-widest text-cr-muted">
                    {label}
                </label>
            )}
            <div className="relative">
                <input
                    id={id}
                    name={name}
                    type={visible ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    autoComplete={autoComplete}
                    placeholder={placeholder}
                    className={[
                        'w-full px-4 py-2.5 pr-10 text-sm rounded-xl bg-cr-surface2 text-cr-text',
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
                <button
                    type="button"
                    onClick={() => setVisible(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-cr-muted hover:text-cr-primary transition-colors"
                    tabIndex={-1}
                    aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                    {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
            {error && <p className="text-[11px] text-rose-400">{error}</p>}
        </div>
    )
}
