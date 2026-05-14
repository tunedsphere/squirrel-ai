---
name: grill-with-docs
description: Stress-tests a plan against glossary and recorded ADRs, sharpens product vocabulary, patches CONTEXT inline. Use when the user says “grill me with docs”, wants a proposal checked against documented language before building, or is naming features and needs alignment with CONTEXT/ADR.
---

# Grill with docs

## Outcome

One shared mental model across **spoken plan**, **`CONTEXT.md` words**, **`docs/adr` facts**, and **code behaviour**. Work in small commits to understanding; no ornamental debate.

## Flow

1. **Anchor** — Identify which context applies: root **`CONTEXT.md`** at the repository root or, when **`CONTEXT-MAP.md`** exists, only the bounded context that matches this topic; open only that slice unless the span is clearly cross-cutting.
2. **Vocabulary first** — If the user mixes terms (`account` vs `Customer`, cancellation vs revoke, etc.), stop and reconcile before architecture. Prefer the glossary wording; propose a canonical term plus “avoid” aliases per [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md).
3. **One fork per turn** — Ask **one** question at a time and wait unless the codebase already settles it—in that case state the finding and advance. Prefer concrete scenarios (“what if X happens after Y?”) for boundary cases.
4. **Prove with code only when relevant** — If the user claims runtime behaviour, confirm in-repo; mismatches get quoted (`code says A, you said B`). Do not skim unrelated packages.
5. **Write lazily but immediately** — When a definition or relationship resolves, patch **`CONTEXT.md`** in place (Terms / Relationships / Flagged ambiguities). Batch only if two edits are inseparable sentences.
6. **ADR guard** — Offer an ADR only when reversing would hurt, newcomers would puzzle without it, and a real fork existed. Else skip. Shape: linked [ADR-FORMAT.md](./ADR-FORMAT.md).

## Efficient execution

- Open **`CONTEXT.md` once per thread** unless the bounded context shifts; reuse what you already read.
- Batch reads: glossary + the one ADR that matches the topic, not the whole `docs/` tree.
- Keep questions short; move durable answers into CONTEXT so the chat does not become the ledger.

## Tactics

| Signal | Move |
|--------|------|
| Word fights glossary | Cite glossary; ask user to adopt, extend, or amend it |
| Hand-wavy noun | Offer two crisp meanings; pick labels |
| “How it works” | Verify in code or label as unchecked assumption |

## Tone

Warm, rigorous, sparing with adjectives. Recommend a default answer when you pose a fork so the user can react quickly.
