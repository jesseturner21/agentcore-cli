import { EditSchemaScreen } from '../schema/EditSchemaScreen';

interface EditFlowProps {
  /** Whether running in interactive TUI mode (from App.tsx) vs CLI mode */
  isInteractive: boolean;
  onExit: () => void;
  onRequestAdd?: () => void;
}

export function EditFlow({ isInteractive, onExit, onRequestAdd }: EditFlowProps) {
  return <EditSchemaScreen isInteractive={isInteractive} onExit={onExit} onRequestAdd={onRequestAdd} />;
}
