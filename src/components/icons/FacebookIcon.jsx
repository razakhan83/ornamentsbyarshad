/**
 * Official Facebook brand icon as a React SVG component.
 * Sized to match Lucide icon conventions (currentColor, size prop).
 */
export default function FacebookIcon({ className = 'size-4', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.026 4.388 11.022 10.125 11.927v-8.437H7.078v-3.49h3.047V9.413c0-3.021 1.792-4.688 4.533-4.688 1.313 0 2.686.235 2.686.235v2.969h-1.514c-1.491 0-1.956.931-1.956 1.887v2.257h3.328l-.532 3.49h-2.796V24C19.612 23.095 24 18.099 24 12.073z" />
    </svg>
  );
}
