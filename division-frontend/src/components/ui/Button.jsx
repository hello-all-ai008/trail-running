/**
 * Shared button. Variants:
 * - 'accent'    sunrise-orange primary action
 * - 'secondary' glass-tinted neutral
 * - 'danger'    destructive (reset)
 */

/** @type {Record<string, string>} */
const VARIANT_CLASS = {
  accent: 'btn btn-accent',
  secondary: 'btn btn-secondary',
  danger: 'btn btn-danger',
}

/**
 * @param {{ variant?: 'accent'|'secondary'|'danger', type?: 'button'|'submit', onClick?: () => void, disabled?: boolean, className?: string, children: import('react').ReactNode }} props
 */
function Button({ variant = 'accent', type = 'button', onClick, disabled = false, className = '', children }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${VARIANT_CLASS[variant] ?? VARIANT_CLASS.accent} ${className}`}
    >
      {children}
    </button>
  )
}

export default Button
