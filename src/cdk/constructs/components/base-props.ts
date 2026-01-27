export interface AgentCoreComponentProps {
  /**
   * The project name used as prefix for physical AWS resource names.
   * Example: "${projectName}_${agentName}" for runtime names.
   */
  readonly projectName: string;
}
