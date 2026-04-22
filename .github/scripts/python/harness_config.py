"""Shared configuration for harness invocation."""

REGION = "us-east-1"
ACCOUNT_ID = "325335451438"
MODEL_ID = "us.anthropic.claude-opus-4-7"
HARNESS_ID = "PRReviewerV2-7wTxwhCaEo"


def harness_arn(harness_id=HARNESS_ID):
    """Build a harness ARN from an ID."""
    return f"arn:aws:bedrock-agentcore:{REGION}:{ACCOUNT_ID}:harness/{harness_id}"
