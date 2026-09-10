/**
 * Official Instagram brand icon as a React SVG component.
 * Sized to match Lucide icon conventions (currentColor, size prop).
 */
export default function InstagramIcon({ className = 'size-4', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95h-8.5zm8.95 1.35a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3zM12 6.86A5.14 5.14 0 1 1 6.86 12 5.15 5.15 0 0 1 12 6.86zm0 1.8A3.34 3.34 0 1 0 15.34 12 3.35 3.35 0 0 0 12 8.66z" />
    </svg>
  );
}
