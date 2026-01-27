## AgentCore Templates Rendering

This directory contains the **rendering logic** for template processing.

Template **assets** live in the `assets/` directory at the repository root.

The rendering logic is rooted in the `AgentEnvSpec` and must ALWAYS respect the configuration in the Spec.

## Guidance for template changes

- Always make sure the templates are as close to working code as possible
- AVOID as much as possible using any conditionals within the templates

## How to use the code in this directory

- `index.ts` exports a `createRenderer` method that consumes an `AgentEnvSpec`
- This method picks the appropriate renderer; the caller only needs to call the `render` method
- `templateRoot.ts` exports `getTemplatePath` and `TEMPLATE_ROOT` to locate assets
