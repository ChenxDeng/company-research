// components/LoadingState.tsx

interface LoadingStateProps {
  status: string;
}

export function LoadingState({ status }: LoadingStateProps) {
  return (
    <div className="loading-state">
      <div className="loading-ring" />
      <div className="loading-text">{status}</div>
    </div>
  );
}
