## AgentCore Templates

This directory stores:

- Template assets for agents written in different Languages, SDKs and having different configurations

The rendering logic is rooted in the `AgentEnvSpec` and must ALWAYS respect the configuration in the Spec

## Guidance for template changes

- Always make sure the templates are as close to working code as possible
- AVOID as much as possible using any conditionals within the templates

# How to use the assets in this directory

- These assets are rendered by the CLI's template renderer in `packages/agentcore-cli/src/templates`.
