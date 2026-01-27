# Schema Module

The `schema` module contains the high level schemas which serve as abstractions enabling a streamlined L3 implementation
to model AgentCore resources.

This module only houses schemas and zod validation logic. Schemas are modeled separately with types and interfaces for
readability and clean imports. Zod validators take a dependency on the top level types and serve only validation.

## Function

**Schemas**: The core interface for both CLI and the input props to the L3 CDK constructs. These schemas allow
high-level definitions for agent use case and behavior to be translated into AgentCore infrastructure.
