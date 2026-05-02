# AI-Fortnight 2026 - Intellithon Challenge Level 3

# The Route Optimizer


## Scenario
GlobalFreight's logistics network is about to have its worst morning of the year. At 06:00 on 15 June 2025, six crises land simultaneously: dock workers at JNPT Mumbai and Rotterdam walk off the job in a coordinated strike, Air France Cargo suspends all operations for 24 hours, Cyclone Shakti strengthens to Category 3 over the Bay of Bengal, and a blizzard reduces Frankfurt and Hamburg airports to 40% capacity. Fifteen active shipments — ranging from temperature-sensitive vaccines and pharmaceutical APIs worth hundreds of thousands of dollars to furniture containers and zinc ingots — are caught in the middle of this. Some are already airborne, some are sitting at struck ports, and some are still on the ground watching their departure window close.

Your task is to build a multi-step AI workflow that acts as an emergency routing desk. It must work through all fifteen shipments in the right order — Platinum-tier shipments first, grounded shipments before delayed ones — assessing the impact of each disruption event, scoring the available alternative carriers and routes, and producing a decision for every single shipment. Some decisions will be straightforward: a confirmed cold-chain slot on Singapore Airlines is available for the grounded Apollo Hospitals pharmaceutical shipment, and the workflow should take it without hesitation. Others are genuinely hard: Dr Reddy's pharma APIs are stuck in a Canadian regulatory hold that no carrier change can resolve, so the correct decision is escalation, not rerouting. And a handful sit in a grey area where the best available option doesn't quite meet normal constraints — the workflow must recognise this, try again with relaxed criteria such as accepting a longer transit window, and only escalate after two unsuccessful attempts.


## **Success Criteria**

* Workflow must:

  * Handle all shipments systematically
  * Make **context-aware, policy-driven decisions**
  * Correctly interpret SLA rules
  * Balance:

    * Speed
    * Accuracy
    * Compliance



## Survive the Day of Disruption — re-route 15 shipments using a stateful graph
At 06:00, six crises hit the GlobalFreight network simultaneously: three port strikes, one airline cancellation, and two weather events. Fifteen active shipments are affected. A single linear agent cannot handle this — the decisions are conditional, retriable, and must prioritise by SLA tier. You need a graph.

# The disruption scenario
JNPT Mumbai and Rotterdam ports on strike. Air France Cargo suspended for 24 hours. Cyclone Shakti (Category 3) in the Bay of Bengal. Central European blizzard reducing Frankfurt and Hamburg airports to 40% capacity. All six events hit within 4 hours of each other.



## What's in this folder

| File | Description |
|---|---|
| `shipments_dataset.xlsx` | 15 shipments · 6 disruptions · 25 alternative routes · SLA reference · scoring guide (5 sheets) |
| `README.md` | This file |

## Quick Start

```bash
pip install langgraph langchain langchain-openai openpyxl pandas

```

## Dataset Sheets

| Sheet | Contents |
|---|---|
| `Active_Shipments` | 15 active shipments with ID, tier, status, delay hours, SLA tolerance, SLA status, and context notes |
| `Disruption_Events` | 6 simultaneous disruption events with affected shipment IDs, severity, SLA clock ruling, and recommended action |
| `Alternative_Routes` | 25 alternative routing options across all affected shipments — scored with availability, surcharge, and a recommendation flag |
| `SLA_Reference` | SLA tier rules: delay tolerances, compensation rates, which delay codes pause the SLA clock |
|


