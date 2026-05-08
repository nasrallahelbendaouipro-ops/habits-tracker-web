import { cn } from '@/lib/utils';

type Props = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
};

export default function GlassCard({ children, className, style, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={cn('rounded-2xl glass', onClick && 'cursor-pointer', className)}
      style={{
        padding: '20px',
        boxShadow: 'var(--shadow-sm)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
