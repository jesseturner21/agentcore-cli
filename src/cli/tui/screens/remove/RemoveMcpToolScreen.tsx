import type { RemovableMcpTool } from '../../../operations/remove';
import { SelectScreen } from '../../components';
import React from 'react';

interface RemoveMcpToolScreenProps {
  /** List of MCP tools that can be removed */
  tools: RemovableMcpTool[];
  /** Called when a tool is selected for removal */
  onSelect: (tool: RemovableMcpTool) => void;
  /** Called when user cancels */
  onExit: () => void;
}

export function RemoveMcpToolScreen({ tools, onSelect, onExit }: RemoveMcpToolScreenProps) {
  const items = tools.map(tool => ({
    id: tool.name,
    title: tool.name,
    description: tool.type === 'mcp-runtime' ? 'MCP Runtime tool' : `Gateway target (${tool.gatewayName})`,
  }));

  // Create a map for quick lookup
  const toolMap = new Map(tools.map(t => [t.name, t]));

  return (
    <SelectScreen
      title="Select MCP Tool to Remove"
      items={items}
      onSelect={item => {
        const tool = toolMap.get(item.id);
        if (tool) {
          onSelect(tool);
        }
      }}
      onExit={onExit}
    />
  );
}
