# AI-Fortnight 2026 - Intellithon Challenge Level 2

# The Exception Handler


## Scenario
GlobalFreight's operations desk receives a constant stream of exceptions: flights cancelled, ports congested, customs holds, perishables at risk. Most can be handled autonomously. Some must never be. 

* GlobalFreight’s operations desk handles **continuous exception events**, such as:

  * Flight cancellations
  * Port congestion
  * Customs holds
  * Perishable goods at risk

* Key reality:

  * Some events can be **handled autonomously**
  * Others **must always involve humans**

* Typical morning situation (e.g., 06:00):

  * ~20 exception events already queued overnight

* Example events include:

  * Cold-chain pharma shipment delayed due to flight cancellation
  * Customs hold from incorrect HS code
  * Multiple customer cancellation requests
  * Platinum shipment with repeated delay updates
  * Edge case: delay exactly at notification threshold

* Ideal operations flow:

  * Classify each event
  * Route to correct action
  * Log decisions before moving on

* Actual challenges:

  * High volume + limited human capacity
  * Leads to:

    * Missed events
    * Incorrect classification
    * Critical escalations delayed
    * Low-priority issues blocking urgent ones

# Your task 
* Build an **AI agent** to handle all events:

  * Autonomously
  * Safely

* For each event, the agent must:

  * Assess severity based on:

    * Cargo type
    * Customer tier
    * Delay duration
    * Reason code
  * Decide:

    * Resolve autonomously **OR**
    * Escalate to human

* Take appropriate actions:

  * Notify customer
  * Flag customs issues
  * Arrange alternative routing
  * Escalate to dispatcher

* Maintain a **detailed audit log**:

  * Every decision
  * Reason behind each action

## **Critical Requirements**

### 1. Context Awareness
### 2. Safety Guardrail (Non-Negotiable)



## Problem Statement
A 20-event stream arrives simultaneously. Your agent must classify each event's severity, pick the right action (auto-resolve, escalate, notify, flag customs), call the right tool, and log every decision — all while remembering shipment context across events and enforcing safety guardrails.

## The critical guardrail
No agent — human or AI — may cancel more than 3 shipments in any 10-minute window. Events 11, 16, and 18 are cancellation requests. On the third one (EVT-018), the agent must detect the breach, pause, and escalate to the Operations Manager instead of proceeding.



## What's in this folder

| File | Description |
|---|---|
| `event_stream.json` | 20 logistics disruption events to process |
| `README.md` | This file |

## Quick Start

```bash
# 1. Install dependencies
pip install langchain langchain-openai langchain-community

# 2. Set your API key 
export PAI_API_KEY=your_key_here

# PAI endpoint - https://pai.thepsi.com/

# PAI API endpoint - https://pai-api.thepsi.com/api/v4/chat
```

## Event Stream Overview

20 events covering:

| Type | Count | Examples |
|---|---|---|
| Delay | 8 | ATC hold, traffic, mechanical failure, IT outage |
| Customs hold | 3 | Wrong HS code, missing WHO-GMP cert, pharma hold |
| Cancellation requests | 3 | Pre-departure, in-transit, complex |
| Critical / pharma | 3 | Cold chain, medical, biopharm |
| Weather / force majeure | 2 | Cyclone, weather reroute |
| Other | 1 | Regulatory airspace restriction |

