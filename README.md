# @aws/agentcore-cli

CLI tool for Amazon Bedrock AgentCore. Create, deploy, and manage agentic applications on AWS.

## Installation

```bash
npm install -g @aws/agentcore-cli
```

## Quick Start

```bash
# Create a new project
agentcore-cli create

# Deploy to AWS
agentcore-cli deploy

# Check status
agentcore-cli status

# Invoke an agent
agentcore-cli invoke
```

## Commands

| Command   | Description                      |
| --------- | -------------------------------- |
| `create`  | Create a new AgentCore project   |
| `deploy`  | Deploy infrastructure to AWS     |
| `status`  | Check deployment status          |
| `invoke`  | Invoke a deployed agent          |
| `dev`     | Start local development server   |
| `add`     | Add agents, memory, identity     |
| `remove`  | Remove resources                 |
| `plan`    | Preview infrastructure changes   |

## Configuration

Projects use JSON schema files in the `agentcore/` directory:

- `agentcore.json` - Agent specifications
- `aws-targets.json` - Deployment targets
- `mcp.json` - MCP gateway configuration

## Library Usage

The CLI also exports utilities for programmatic use:

```typescript
import { ConfigIO, type AgentEnvSpec } from '@aws/agentcore-cli';

const configIO = new ConfigIO({ baseDir: './agentcore' });
const spec = await configIO.readProjectSpec();
```

## Related Package

- `@aws/agentcore-l3-cdk-constructs` - CDK constructs used by vended projects

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This project is licensed under the Apache-2.0 License.
