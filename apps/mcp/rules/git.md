# Git Workflow Rules

This document defines the expected git workflow for coding agents working in this repository.

## Topic-Based Commits

- Treat each completed implementation topic as its own unit of work.
- When a topic is complete and its relevant verification has been run, create a git commit without asking for additional permission.
- Do not wait for the entire request to finish before committing if one topic is already complete.
- Keep commits scoped to the topic that was actually completed.

## Push Behavior

- Completing the overall user goal does not automatically permit a push.
- When the overall requested goal is finished, ask the user whether to push unless the user already explicitly requested a push in the current conversation.
- If the user explicitly requested a push, push after verification and commit are complete.
- Do not push partial or unverified work.

## Verification Before Commit

- Run the relevant verification before claiming a topic is complete.
- For documentation-only changes, verify the affected files exist, are readable, and match the intended repository rules.
- For code changes, run the most relevant lint, test, or build command that proves the topic works.

## Commit Quality

- Write commit messages that describe the completed topic clearly.
- Avoid mixing unrelated topics into one commit.
- If documentation changes are required by a code change, include them in the same topic commit.
