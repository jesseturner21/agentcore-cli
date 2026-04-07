<div align="center">
  <h1>AgentCore CLI</h1>
  <p><strong>Create, develop, and deploy AI agents to Amazon Bedrock AgentCore</strong></p>

  <p>
    <a href="https://github.com/aws/agentcore-cli/actions"><img src="https://img.shields.io/github/actions/workflow/status/aws/agentcore-cli/build-and-test.yml?branch=main&label=build" alt="Build Status"></a>
    <a href="https://www.npmjs.com/package/@aws/agentcore"><img src="https://img.shields.io/npm/v/@aws/agentcore" alt="npm version"></a>
    <a href="LICENSE"><img src="https://img.shields.io/github/license/aws/agentcore-cli" alt="License"></a>
  </p>
</div>

Amazon Bedrock AgentCore lets you deploy and operate AI agents securely at scale using any framework and model. This CLI handles the full agent lifecycle — from scaffolding a project, to testing locally with hot-reload, to deploying managed infrastructure on AWS.

## Prerequisites

- **Node.js** 20.x or later
- **AWS credentials** configured (`aws configure` or environment variables)
- **uv** for Python agents ([install](https://docs.astral.sh/uv/getting-started/installation/))

## Installation

```bash
npm install -g @aws/agentcore
```

> **Upgrading from the Bedrock AgentCore Starter Toolkit?** If the old Python CLI is still installed, you'll see a
> warning after install asking you to uninstall it. Both CLIs use the `agentcore` command name, so having both can cause
> confusion. Uninstall the old one using whichever tool you originally used:
>
> ```bash
> pip uninstall bedrock-agentcore-starter-toolkit    # if installed via pip
> pipx uninstall bedrock-agentcore-starter-toolkit   # if installed via pipx
> uv tool uninstall bedrock-agentcore-starter-toolkit # if installed via uv
> ```

## Quick Start

```bash
# Launch the interactive terminal UI
agentcore

# Or use individual commands:
agentcore create        # Scaffold a new project (wizard guides you through setup)
cd my-project
agentcore dev           # Start local dev server with hot-reload
agentcore deploy        # Deploy to AWS
agentcore invoke        # Test the deployed agent
```

## Supported Frameworks

| Framework           | Supported Model Providers          | Notes                              |
| ------------------- | ---------------------------------- | ---------------------------------- |
| Strands Agents      | Bedrock, Anthropic, OpenAI, Gemini | AWS-native, streaming support      |
| LangChain/LangGraph | Bedrock, Anthropic, OpenAI, Gemini | Graph-based workflows              |
| Google ADK          | Gemini                             | Google's Agent Development Kit     |
| OpenAI Agents       | OpenAI                             | OpenAI's native agent framework    |
| BYO (Bring Your Own)| Any                                | Use your own code and framework    |

You can also **import existing Bedrock Agents** — the CLI translates action groups, knowledge bases, guardrails, and multi-agent collaboration into framework-specific Python code. See [Frameworks](docs/frameworks.md) for details.

## Commands

### Project Lifecycle

| Command              | Alias | Description                               |
| -------------------- | ----- | ----------------------------------------- |
| `agentcore create`   |       | Scaffold a new project                    |
| `agentcore dev`      | `d`   | Start local dev server with hot-reload    |
| `agentcore deploy`   | `dp`  | Deploy infrastructure to AWS              |
| `agentcore invoke`   | `i`   | Invoke an agent (local or deployed)       |
| `agentcore status`   | `s`   | Check deployment status                   |
| `agentcore validate` |       | Validate configuration files              |
| `agentcore package`  | `pkg` | Package artifacts without deploying       |

### Resource Management

| Command                      | Description                                         |
| ---------------------------- | --------------------------------------------------- |
| `agentcore add agent`        | Add a template, BYO, or imported agent              |
| `agentcore add memory`       | Add memory (semantic, summarization, episodic, etc.) |
| `agentcore add identity`     | Add API key or OAuth credentials                    |
| `agentcore add gateway`      | Add an MCP-compatible gateway                       |
| `agentcore add gateway-target` | Add a backend tool target to a gateway            |
| `agentcore add evaluator`    | Add a custom LLM-as-a-Judge evaluator               |
| `agentcore add online-eval`  | Add continuous evaluation for live traffic           |
| `agentcore remove <resource>` | Remove any resource from the project               |

> Run `agentcore deploy` after `add` or `remove` to sync changes to AWS.

### Observability

| Command                    | Alias | Description                                   |
| -------------------------- | ----- | --------------------------------------------- |
| `agentcore logs`           | `l`   | Stream or search agent runtime logs           |
| `agentcore logs evals`     |       | Stream or search online eval logs             |
| `agentcore traces list`    | `t`   | List recent traces for a deployed agent       |
| `agentcore traces get`     |       | Download a trace to a JSON file               |

### Evaluations

| Command                      | Description                                   |
| ---------------------------- | --------------------------------------------- |
| `agentcore add evaluator`    | Add a custom LLM-as-a-Judge evaluator         |
| `agentcore add online-eval`  | Add continuous evaluation for live traffic     |
| `agentcore run eval`         | Run on-demand evaluation against agent traces  |
| `agentcore evals history`    | View past eval run results                    |
| `agentcore pause online-eval`| Pause a deployed online eval config           |
| `agentcore resume online-eval`| Resume a paused online eval config           |

### Utilities

| Command              | Description                      |
| -------------------- | -------------------------------- |
| `agentcore update`   | Check for and install CLI updates |
| `agentcore import`   | Import from a Starter Toolkit project |
| `agentcore fetch access` | Fetch access info for a deployed gateway or agent |

## Capabilities

- **Runtime** — Managed execution environment with CodeZip (Python source) or Container (Docker) build types
- **Memory** — Semantic, summarization, user preference, and episodic memory strategies
- **Identity** — Secure API key and OAuth credential management via Secrets Manager
- **Gateway** — MCP-compatible proxy for routing agents to external tools, APIs, and Lambda functions
- **Evaluations** — LLM-as-a-Judge for on-demand and continuous agent quality monitoring
- **Observability** — Log streaming, trace inspection, and deployment status checks
- **Multi-protocol** — HTTP, MCP, and A2A agent protocols
- **VPC Support** — Deploy agents in private subnets with custom security groups

## Project Structure

```
my-project/
├── agentcore/
│   ├── agentcore.json      # Agents, memory, credentials, evaluators
│   ├── mcp.json            # Gateways and gateway targets
│   ├── aws-targets.json    # Deployment targets (account, region)
│   ├── .env.local          # API keys for local dev (gitignored)
│   └── cdk/                # CDK infrastructure (auto-managed)
├── app/
│   └── <AgentName>/        # Agent source code
│       ├── main.py         # Agent entry point
│       ├── pyproject.toml  # Python dependencies
│       └── model/          # Model configuration
```

## Common Workflows

### CI/CD Pipeline

```bash
agentcore validate
agentcore deploy --plan --json   # Preview changes
agentcore deploy -y --json       # Deploy with auto-confirm
```

### Gateway Setup

```bash
agentcore add gateway --name MyGateway
agentcore add gateway-target \
  --name WeatherTools \
  --type mcp-server \
  --endpoint https://mcp.example.com/mcp \
  --gateway MyGateway
agentcore add agent --name MyAgent --framework Strands --model-provider Bedrock
agentcore deploy -y
```

### Debugging

```bash
agentcore logs --agent MyAgent                    # Stream logs
agentcore logs --since 2h --level error           # Search for errors
agentcore traces list --agent MyAgent --limit 10  # List recent traces
agentcore traces get <traceId> --output trace.json
```

### JSON Output for Automation

All commands support `--json` for machine-readable output:

```bash
agentcore status --json | jq '.resources[] | select(.resourceType == "agent")'
agentcore invoke "Hello" --json | jq '.response'
```

## Documentation

- [CLI Commands Reference](docs/commands.md) — Full command reference with all flags
- [Configuration](docs/configuration.md) — Schema reference for config files
- [Frameworks](docs/frameworks.md) — Framework comparison, BYO agents, and Bedrock Agent import
- [Gateway](docs/gateway.md) — Gateway setup, targets, and authentication
- [Evaluations](docs/evals.md) — Evaluators, on-demand evals, and online monitoring
- [Memory](docs/memory.md) — Memory strategies and sharing
- [Local Development](docs/local-development.md) — Dev server, hot-reload, and debugging
- [Container Builds](docs/container-builds.md) — Docker/Podman/Finch container deployments
- [IAM Permissions](docs/PERMISSIONS.md) — Required AWS permissions

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## Feedback & Issues

Found a bug or have a feature request? [Open an issue](https://github.com/aws/agentcore-cli/issues/new) on GitHub.

## Security

See [SECURITY](SECURITY.md) for reporting vulnerabilities.

## License

This project is licensed under the Apache-2.0 License.
