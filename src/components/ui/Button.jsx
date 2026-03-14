// Variantes: 'primary' | 'secondary' | 'ghost'
// Tamaños:   'sm' | 'md' | 'lg'
export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold tracking-wide ' +
    'rounded-xl transition-all duration-200 select-none focus:outline-none focus-visible:ring-2 ' +
    'focus-visible:ring-cr-primary/60 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary:
      'bg-cr-primary text-white hover:bg-cr-primary-hover active:scale-[0.98] ' +
      'shadow-md hover:shadow-cr-primary/30 hover:shadow-lg',
    secondary:
      'bg-transparent border border-cr-border text-cr-primary hover:bg-cr-primary/10 ' +
      'active:scale-[0.98]',
    ghost:
      'bg-transparent text-cr-muted hover:text-cr-primary hover:bg-cr-primary/5 active:scale-[0.98]',
  }

  const sizes = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-2.5 text-sm',
    lg: 'w-full py-3 text-sm',
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : children}
    </button>
  )
}
