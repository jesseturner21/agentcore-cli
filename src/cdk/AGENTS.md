# CDK Module

The `cdk` module defines the L3 CDK constructs that translate high level schemas into AgentCore resources.

The generated project in the users' local directory created by the CLI will take a dependency on the `agentcore` package
and use these constructs. Since the bulk of the implementation is contained here, the generated CDK projects will be
thin instantiators.

## Approach

The CDK module encapsulates the full logic required to translate a schema into deployed resources. Instead of the CLI
acting as middle-step, imperative requirements are met by taking advantage of CDK features like
`aws-cdk-lib.triggers module` or `aws-cdk-lib.aws_s3_assets module`.

Use cases for high level imperative CDK approaches include local Docker builds, packaging zip files as CDK assets, or
making an API call targeting a just deployed resource (for example putting a secret value in an AgentCore Identity
resource).

## Stacks

It is not the primary concern of this module to organize constructs into stacks. In any case, assume the stack form
factor is a monostack. This prevents cross stack reference pain points.

## Resource Interfaces

Ensure that constructs surface interfaces with modeled resources. This will help ensure that users are minimally
constrained by assumptions of the L3.

## Cfn Outputs

Make sure to model `CfnOutputs` inside of the L3 constructs. Since the end user is expected to have just a few high
level instances of the resources contained in the L3 definitions and the CLI has an immediate use case to model deployed
resources, we need to model appropriate `CfnOutputs` inside of the L3 constructs.

## Logical IDs

Stable CloudFormation logical IDs are paramount for graceful updates. CDK automatically generates logical IDs from
construct paths, so:

1. **Use simple, descriptive construct IDs** like `'Runtime'`, `'Role'`, `'Resource'` - CDK's construct tree provides
   scoping
2. **Use `toPascalId()` only for dynamic names** - when incorporating user-provided names like agent names (e.g.,
   `toPascalId('Agent', spec.name)`)
3. **Use `outputId()` for CfnOutput IDs** - appends 'Output' suffix automatically
4. **Use `exportName()` for CloudFormation export names** - formats names with hyphens

---

## The AgentCore L3 Construct

The AgentCore L3 CDK construct is the single aggregation point for the majority of AgentCore-managed infrastructure. It
takes exactly one input: the `AgentEnvSpec`.

A key property of this construct is graceful, deterministic updates. A deploy → schema update → deploy cycle must result
in precise CloudFormation updates, where only resources affected by schema changes are modified. This is achieved by
synthesizing CloudFormation templates from the L3 construct with stable logical IDs, rather than importing or mutating
resources outside of CloudFormation’s normal update flow.

An orchestration layer may exist above this construct to support multiple agents or environments. Shared resources (for
example, an MCP Gateway) are modeled explicitly and managed coherently through the same aggregation point.

## The AgentCoreMcp L3 Construct

Infrastructure related to MCP is pulled out into its own L3 CDK construct. It is still deployed in the same monostack as
the AgentCore L3 construct.

Depending on configuration, the AgentCoreMcp L3 construct might define JWT authorizer Cognito infrastructure, Lambda
functions and AgentCore Runtimes hosting MCP server application code, and/or AgentCore Gateway resources.

The same properties required for graceful updates to the AgentCore L3 construct are neccesary in the MCP L3 construct.

IAM policies attached to tool execution are treated as opaque, user-owned configuration and are not covered by schema
compatibility guarantees.

### MCP Runtime Notes

AgentCore MCP runtimes are provisioned via the shared `AgentCoreRuntime` primitive component. This is reused for both:

- Standalone MCP runtimes (directly addressable by agents).
- MCP runtimes behind a Gateway target (registered as an MCP server endpoint).

Runtime endpoint URLs are derived from the runtime ARN and must be URL-encoded:

```
https://bedrock-agentcore.{region}.amazonaws.com/runtimes/{encoded_arn}/invocations?qualifier=DEFAULT
```

For Gateway-backed runtimes, the runtime endpoint is treated as an MCP server URL and registered as a gateway target of
type `mcpServer`.

When runtime configuration is set to the CLI-managed default, the CLI is responsible for zipping MCP server code and
storing it using managed CDK assets. The runtime configuration uses the CDK asset bucket and object key that are
resolved during synthesis/deploy.

## CloudFormation Component Rules

Component constructs for AgentCore primitives in `src/cloudformation/components/primitives` MUST adhere to the following
rules:

L1-only restriction Component constructs MUST exclusively use L1 CloudFormation constructs for AgentCore resources. Like
elsewhere, L2 CDK constructs are only allowed for well known official libraries.

Schema-only configuration inputs Component construct props MUST accept configuration exclusively via schema sub-types
derived from the agent-env schema.

No ad-hoc or flag-style props Component construct props MUST NOT introduce standalone configuration fields (for example:
string, boolean, or enum flags) that influence resource behavior. If a value affects resource configuration, it MUST be
modeled in the schema.

Wiring-only exceptions The only non-schema props permitted are wiring inputs required to connect the component to other
resources (for example: IAM role ARNs, dependency references, or stack-level identifiers). Wiring props MUST NOT alter
resource semantics.

No schema shadowing or overrides Component constructs MUST NOT override, duplicate, or partially re-express schema
fields via props. All defaults and optional behavior MUST be defined in the schema and handled through schema
versioning.

Deterministic synthesis requirement Given a logical ID and the schema sub-type, a component construct MUST be able to
deterministically synthesize its CloudFormation resources without additional configuration.

If a component construct creates or depends on an IAM role or resource name, it owns it. Such values must never be
passed as props.

Components use `AgentCoreComponentProps` which require a logicalId property. The logical ID factory is the sole source
of truth for both CloudFormation logical IDs and physical Name properties.
