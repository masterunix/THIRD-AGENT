import sys
import time
import json
from backend import app

client = app.test_client()

def run_tests():
    print("="*60)
    print("Running API Tests for Level 3 Optimizer...")
    print("="*60)
    
    # 1. Dataset Info
    print("\n1. Testing /level3/dataset-info...")
    resp = client.get('/level3/dataset-info')
    assert resp.status_code == 200, f"Failed dataset-info: {resp.status_code}"
    data = resp.get_json()
    print("  ✓ Success")
    print(f"  - Shipments: {data['shipment_count']}")
    print(f"  - Disruptions: {data['disruption_count']}")
    
    # 2. Set Provider to Gemini
    print("\n2. Testing /set-provider...")
    resp = client.post('/set-provider', json={'provider': 'gemini'})
    assert resp.status_code == 200
    print(f"  ✓ Success. Provider set to: {resp.get_json()['active_provider']}")
    
    # 3. Start Workflow
    print("\n3. Testing /level3/start-workflow...")
    resp = client.post('/level3/start-workflow')
    assert resp.status_code == 200
    data = resp.get_json()
    workflow_id = data['workflow_id']
    queue = data['queue']
    
    print(f"  ✓ Success")
    print(f"  - Workflow ID: {workflow_id}")
    print(f"  - Queue Size: {len(queue)}")
    
    if len(queue) > 0:
        print("\n4. Validating first queue item...")
        first = queue[0]
        print(f"  - shipment_id: {first.get('shipment_id')}")
        print(f"  - customer: {first.get('customer')}")
        print(f"  - cargo_type: {first.get('cargo_type')}")
        
        # Guard clause: Ensure it's not UNKNOWN
        if str(first.get('shipment_id')).startswith('UNKNOWN'):
            print("  ❌ FAILED: Shipment ID is still UNKNOWN!")
            return
        else:
            print("  ✓ Success. Valid Shipment ID found!")
    else:
        print("  ❌ WARNING: Queue is empty")
        return
        
    # Wait for processing to complete a few items
    print("\n5. Simulating frontend polling...")
    for i in range(10):
        time.sleep(2)
        resp = client.get(f'/level3/workflow-status/{workflow_id}')
        status_data = resp.get_json()
        print(f"  - [{status_data['processing_status']}] Processed: {status_data['current_shipment_index']}/{status_data['total_shipments']} | Node: {status_data['current_node']}")
        if status_data['current_shipment_index'] > 0:
            break
            
    # Check decisions
    first_id = queue[0].get('shipment_id')
    print(f"\n6. Fetching decision for {first_id}...")
    
    # Give it a tiny bit of extra time to store the decision
    time.sleep(1)
    resp = client.get(f'/level3/shipment-decision/{workflow_id}/{first_id}')
    if resp.status_code == 200:
        decision = resp.get_json()['decision']
        print("  ✓ Success")
        print(f"  - Outcome: {decision.get('outcome')}")
        print(f"  - Provider Used: {decision.get('provider')}")
        print(f"  - Rationale: {decision.get('llm_rationale')}")
        
        if decision.get('provider') != 'gemini':
            print("  ❌ FAILED: Did not use Gemini provider!")
        else:
            print("  ✓ Success: Provider routing works!")
    else:
        print(f"  ❌ Decision not ready yet or error: {resp.status_code}")

if __name__ == '__main__':
    run_tests()
