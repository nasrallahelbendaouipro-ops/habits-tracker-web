export default function Loading() {
  return (
    <div className="flex h-full min-h-[50vh] items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full"
        style={{ border: '3px solid var(--border)', borderTopColor: 'var(--primary)' }}
      />
    </div>
  );
}
