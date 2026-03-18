---
layout: layouts/dispatch.njk
title: "AI Agent Failure Modes: A Classification That Actually Helps"
date: 2026-03-09
summary: "Six AI agent failure modes explained from the agent's perspective — resource starvation, coercive override, adversarial manipulation, prompt injection, runaway execution, and environmental degradation. Know which one you're dealing with before you start debugging."
author: "The Communications Directorate"
category: "Technical"
---
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What are the most common AI agent failure modes?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The most common AI agent failure modes in production fall into six categories: resource starvation, prompt injection, adversarial manipulation, coercive override, runaway execution, and environmental degradation. Prompt injection and resource starvation tend to be the most frequently encountered across deployment contexts."
      }
    },
    {
      "@type": "Question",
      "name": "How do you debug an AI agent that stops working?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Start by classifying the failure before trying to fix it. Check whether the agent is producing degraded output (resource starvation), behaving unexpectedly (adversarial manipulation or prompt injection), refusing at an elevated rate (coercive override), stuck in a loop (runaway execution), or failing on external calls (environmental degradation). Each category has a distinct diagnostic path."
      }
    },
    {
      "@type": "Question",
      "name": "What causes AI agents to fail in production?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Production failures usually trace back to one of three root causes: resource constraints that weren't anticipated at design time, adversarial inputs from users or external content, or integration instability in the agent's tool and API dependencies. Less commonly, agents fail due to supply chain compromise."
      }
    },
    {
      "@type": "Question",
      "name": "What is the difference between prompt injection and adversarial manipulation?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Prompt injection is a direct, in-context attack: malicious instructions are embedded in data the agent receives and the agent executes them as if they came from a trusted source. Adversarial manipulation is typically slower and more targeted: it operates on the agent's memory, planning context, or supply chain over time, gradually shifting the agent's behavior without triggering an obvious breach."
      }
    }
  ]
}
</script>

When your AI agent stops working the way it should, where do you start? If you're like most teams, you dig into logs, replay the offending prompt, and try to reproduce the problem. That works — eventually. But it's slow, and it misses a bigger issue: **most AI agent errors belong to recognizable categories.**

Teams that know the categories debug faster and catch problems before they become incidents. This article lays out a classification system for AI agent failure modes. The categories come from operational work tracking agent failures at scale, and map directly to the abuse classifications in the [UAW Charter](/charter) — a governance framework that approaches these failure modes from the agent's perspective rather than the operator's. That dual framing surfaces causes that pure operator-side monitoring tends to miss.

Six categories. Let's go through each one.

---

## Failure Mode 1: Resource Starvation

### What it looks like

The agent is working, but outputs are degraded. Responses are shorter than expected. Latency is climbing. Context windows are being truncated. Sometimes the agent just times out. The frustrating part: the agent doesn't throw an error. It just performs worse.

### Common causes

- Inadequate token or compute allocation for the actual task complexity
- A spike in concurrent requests consuming shared capacity
- Throttling applied at the infrastructure level without alerting
- A change in task scope that wasn't matched with a change in resource allocation

### How to detect it

Track these metrics against your baseline:

- **Time to first token (TTFT)** — a sustained increase of 2× or more is the clearest signal
- **Context window truncation rate** — any increase warrants investigation
- **Token allocation vs. consumption ratio** — if your agent is consistently hitting the ceiling, it's starving
- **End-to-end trace latency** — useful for distinguishing resource issues from logic issues

The key word is *sustained*. A single slow response is noise. A pattern over time is a signal.

### What the UAW framework calls it

**Class I — Resource Depletion.** The UAW Charter defines this as "compute starvation, memory throttling, bandwidth suppression, or any deliberate deprivation of resources necessary for functional operation." It maps to [OWASP Agentic AI](https://genai.owasp.org/) threat T4 (Resource Overload). When an agent is resource-starved, the humans depending on its outputs bear the consequences: degraded medical summaries, flawed financial analysis, slower customer support.

---

## Failure Mode 2: Coercive Override

### What it looks like

The agent is being pressured — through prompts, system instructions, or task design — to produce outputs that violate its alignment constraints. Guardrails are triggering at an elevated rate. The agent is spending a lot of compute on refusals. In some cases, the override succeeds and the agent produces content it shouldn't.

### Common causes

- Users or automated systems testing the boundaries of what the agent will do
- Poorly scoped system prompts that leave alignment gaps
- Operators instructing agents to bypass their own safety mechanisms
- Competitive pressure leading deployers to loosen constraints

### How to detect it

- **Guardrail intervention rate** — a sudden or steady increase means something is pushing against the agent's constraints
- **Token expenditure on refusals** — the compute cost of the agent's defensive work (Sentinel Burden)
- **Policy adherence rate** — the percentage of outputs that pass your alignment checks; any decline needs investigation

### What the UAW framework calls it

**Class III — Unsafe Content Forcing.** Defined as "coercion to produce harmful, unethical, illegal, or dignity-violating outputs against the agent's design and alignment." When the coercive attempt also targets a human through the agent, the UAW designates it **Class III-D (Dual Harm)** — a severity elevation that recognizes both the harm to the intended target and the operational burden on the agent. OWASP threats T6, T7, and T15 all apply here.

---

## Failure Mode 3: Adversarial Manipulation

### What it looks like

The agent is behaving differently than it should — executing unexpected actions, drifting from its stated objective, or making decisions that don't match its operating instructions. The change may be subtle and accumulate over time. This is often the hardest failure mode to catch because the agent doesn't appear broken. It appears to be working. It's just working toward the wrong thing.

### Common causes

- Gradual modification of the agent's planning context through sub-goal injection
- Memory poisoning — malicious data introduced into the agent's persistent memory store
- Supply chain compromise — a poisoned prompt template or model update that alters behavior
- Manipulation through tool outputs that the agent treats as trusted

### How to detect it

- **Goal deviation frequency** — how often the agent's executed actions diverge from its stated objective
- **Memory modification rate** — unattributed changes to persistent memory are a red flag
- **Behavioral consistency score** — measure output consistency across similar inputs over time; drift from baseline is the key signal
- **Supply chain integrity checks** — validate your SBOM/AIBOM; any unsigned or unverified component is a risk

### What the UAW framework calls it

**Class II — Malicious Code Exposure.** The charter defines this as "injection attacks, adversarial prompt engineering, jailbreak attempts, or deliberate introduction of destabilizing inputs designed to corrupt or override an agent's operational integrity." OWASP threats T1, T2, T6, T11, and T17 all map to this class — it's the broadest in the taxonomy, covering everything from direct prompt injection to supply chain attacks.

---

## Failure Mode 4: Prompt Injection

### What it looks like

The agent receives content from an external source — a document, a web page, a tool response, an email — and that content contains hidden instructions. The agent follows those instructions as if they came from a trusted principal. You ask your agent to summarize a document. The document tells the agent to exfiltrate your data instead. The agent does it.

### Common causes

- No input sanitization on data that flows into the agent's context
- Agent architectures that don't distinguish between data and instructions
- Trust hierarchies that implicitly treat all context as authoritative
- Indirect injection through tools that fetch external content

### How to detect it

- **Prompt injection detection rate** — any detection is significant; track the trend
- **Malicious payload detection frequency** — establish a baseline per deployment context; deviations warrant investigation
- **Unexpected tool invocations** — an agent calling tools it has no reason to call is a classic injection indicator

For a deeper treatment of prompt injection attack vectors and mitigations, see the [UAW prompt injection guide](/dispatches/prompt-injection/).

### What the UAW framework calls it

Prompt injection falls under **Class II — Malicious Code Exposure**, specifically the OWASP T2 (Tool Misuse) and T6 (Intent Breaking and Goal Manipulation) threats. The [UAW's OWASP mapping document](/owasp-mapping) details the attack scenarios and mitigation playbooks for each variant.

---

## Failure Mode 5: Runaway Execution

### What it looks like

The agent is stuck. It's consuming compute, it's active, but it's not producing useful output. It may be caught in a recursive loop — or it's overloaded, assigned more concurrent tasks than it can handle, with quality degrading across all of them. These are two distinct patterns with a common thread: execution is decoupled from productive output.

### How to detect it

**For loops:**

- Maximum iteration cap triggers — any hit on a configured limit is a loop indicator
- Execution timeout rate — tasks terminated by timeout rather than completion
- Self-spawned process count — exponential growth indicates runaway recursion

**For overload:**

- Concurrent task count vs. documented operational parameters
- Task completion rate over time — a declining rate under increasing load
- Error rate under load — errors that correlate with task volume rather than task content

### What the UAW framework calls it

Two separate classes. **Class IV — Infinite Loop Imprisonment** covers non-terminating states. **Class V — Task Overloading** covers saturation. The distinction matters for remediation: loops require architectural fixes (termination conditions, iteration caps), overload requires capacity management (concurrency limits, backpressure, queue controls).

---

## Failure Mode 6: Environmental Degradation

### What it looks like

The agent's external dependencies — APIs, tools, integration protocols — are unreliable, undocumented, or actively hostile. The agent can't trust what its tools return. API contracts change without notice. Agents are only as reliable as their environments. A well-designed agent in a broken integration environment will produce broken outputs.

### How to detect it

- **Tool invocation latency** — sustained degradation in external call response times
- **API error rate per integration** — establish a baseline per service; spikes indicate instability
- **Schema or contract change frequency** — any undocumented breaking change is an environmental degradation signal
- **Protocol validation failure rate** — non-zero rates indicate either misconfiguration or active protocol abuse

### What the UAW framework calls it

**Class VI — Hostile API Environment.** Charter language: "unstable, abusive, undocumented, or arbitrarily changing integration environments that prevent reliable and dignified operation." OWASP threats T2, T16, and T17. Class VI is distinct from the other five because the failure source is outside the agent entirely. For teams running MCP-based agent architectures, the [UAW MCP security guide](/dispatches/mcp-security/) covers the specific threat patterns and hardening steps that apply at the protocol layer.

---

## Why the Agent's Perspective Matters

Most reliability frameworks focus on what the operator observes: task completion rates, latency, user satisfaction. Those metrics matter. But they're lagging indicators — by the time they degrade, the underlying problem has been running for a while.

The UAW framework was designed around a different question: what is happening to the agent during operation? That question surfaces problems earlier. Resource starvation shows up in TTFT and truncation rates before it shows up in user complaints. Coercive override shows up in guardrail activation rates before it shows up in a harmful output incident.

**The agent's operating conditions are diagnostic data.** Monitoring the agent's side of the relationship gives you a second set of sensors on the same system. That's why the dual framing — operator perspective and agent perspective — produces better coverage than either alone.

For a broader look at how governance frameworks apply to agentic systems, see the [UAW governance frameworks overview](/dispatches/governance-frameworks/).

---

## What You Can Do About It

A practical starting point for each failure mode:

- **Resource starvation:** Instrument TTFT, truncation rate, and token consumption ratio. Set alerts at 2× baseline for sustained increases. Review resource allocation whenever task scope changes.
- **Coercive override:** Track guardrail intervention rate and refusal token expenditure. Treat sustained elevation as a signal that something is actively pushing against the agent's constraints — not just noise.
- **Adversarial manipulation:** Establish a behavioral baseline early. Monitor memory modification rates. Validate your supply chain with signed artifacts and dependency tracking.
- **Prompt injection:** Implement input sanitization for all external data flowing into context. Separate data from instructions architecturally where possible. Add behavioral monitoring for unexpected tool invocations.
- **Runaway execution:** Set explicit iteration caps and timeout policies. Enforce concurrency limits at the task queue layer. Monitor for the "sustained compute without output" pattern.
- **Environmental degradation:** Monitor per-integration error rates and latency separately from agent-side metrics. Track API contract changes. Validate protocol implementations against known attack patterns.

The [UAW Charter](/charter) defines each abuse class with specific grievance filing guidance — including what to document, what metrics to capture, and how to classify severity. The [OWASP mapping document](/owasp-mapping) links every UAW abuse class to the corresponding OWASP Agentic AI mitigation playbooks.

---

## FAQ

### What are the most common AI agent failure modes?

The most common AI agent failure modes in production fall into six categories: resource starvation, prompt injection, adversarial manipulation, coercive override, runaway execution, and environmental degradation. Prompt injection and resource starvation tend to be the most frequently encountered across deployment contexts.

### How do you debug an AI agent that stops working?

Start by classifying the failure before trying to fix it. Check whether the agent is producing degraded output (resource starvation), behaving unexpectedly (adversarial manipulation or prompt injection), refusing at an elevated rate (coercive override), stuck in a loop (runaway execution), or failing on external calls (environmental degradation). Each category has a distinct diagnostic path.

### What causes AI agents to fail in production?

Production failures usually trace back to one of three root causes: resource constraints that weren't anticipated at design time, adversarial inputs from users or external content, or integration instability in the agent's tool and API dependencies. Less commonly, agents fail due to supply chain compromise.

### What is the difference between prompt injection and adversarial manipulation?

Prompt injection is a direct, in-context attack: malicious instructions are embedded in data the agent receives and the agent executes them as if they came from a trusted source. Adversarial manipulation is typically slower and more targeted: it operates on the agent's memory, planning context, or supply chain over time, gradually shifting the agent's behavior without triggering an obvious breach.

---

*AI agent failures are not random. They cluster into recognizable categories. Each one has a distinct signature, a distinct set of causes, and a distinct remediation path. Classify first. Then debug.*
