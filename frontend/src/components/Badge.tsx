interface Props {
  label: string;
  color?: string;
  className?: string;
}

export default function Badge({ label, color, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}
      style={color ? { backgroundColor: color + "22", color } : undefined}
    >
      {label}
    </span>
  );
}
