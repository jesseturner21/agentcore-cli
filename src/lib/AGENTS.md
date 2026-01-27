# Lib Module

The `lib` module contains functionalities and utilities that are used by both the `cli` and the `cdk` modules. This
module serves the important goal of making sure that the CDK implementations don't take a direct dependency on the CLI.

## Functions

**Packaging**: Installing dependencies and then producing a `.zip` file artifact that is ready to be deployed on
AgentCore runtime. This is surfaced as a modular function in the CLI and used as a bundling CDK asset in the CDK. A core
problem this functionality solves is attempting to produce an artifact that can run on ARM64 arch hardware.

**ConfigIO**: This module defines utilities to read and write configs which satisfy schemas to the local file system.
Both the CLI and the CDK require this functionality.

**Util**: Subprocess command utilities, zod utilities, and OS utilities.

## Future Direction

Functionality such as imperative code implementations to write secret values into the AgentCore Identity primitive would
be well-suited for this module.
