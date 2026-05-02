import time
import requests

def run_tests():
    BASE_URL = 'http://127.0.0.1:5001'
    print("="*60)
    print("Running API Tests against Live Backend...")
    print("="*60)
    
    # 1. Dataset Info
    print("\n1. Testing /level3/dataset-info...")
    resp = requests.get(f'{BASE_URL}/level3/dataset-info')
    if resp.status_code != 200:
        print(f"FAILED: {resp.status_code}")
        return
    data = resp.json()
    print("  ✓ Success")
    print(f"  - Shipments: {data['shipment_count']}")
    
    # 2. Set Provider to Gemini
    print("\n2. Testing /set-provider...")
    resp = requests.post(f'{BASE_URL}/set-provider', json={'provider': 'gemini'})
    if resp.status_code != 200:
        print(f"FAILED: {resp.status_code}")
        return
    print(f"  ✓ Success. Provider set to: {resp.json()['active_provider']}")
    
    # 3. Start Workflow
    print("\n3. Testing /level3/start-workflow...")
    resp = requests.post(f'{BASE_URL}/level3/start-workflow')
    if resp.status_code != 200:
        print(f"FAILED: {resp.status_code}")
        return
    data = resp.json()
    workflow_id = data['workflow_id']
    queue = data['queue']
    
    print(f"  ✓ Success")
    print(f"  - Workflow ID: {workflow_id}")
    print(f"  - Queue Size: {len(queue)}")
    
    if len(queue) > 0:
        print("\n4. Validating first queue item...")
        first = queue[0]
        sh_id = first.get('shipment_id')
        print(f"  - shipment_id: {sh_id}")
        
        if str(sh_id).startswith('UNKNOWN'):
            print("  ❌ FAILED: Shipment ID is still UNKNOWN!")
            return
        else:
            print("  ✓ Success. Valid Shipment ID found!")
    else:
        print("  ❌ WARNING: Queue is empty")
        return
        
    # Wait for processing
    print("\n5. Polling for results...")
    for i in range(10):
        time.sleep(2)
        resp = requests.get(f'{BASE_URL}/level3/workflow-status/{workflow_id}')
        status_data = resp.json()
        print(f"  - [{status_data['processing_status']}] Processed: {status_data['current_shipment_index']}/{status_data['total_shipments']}")
        if status_data['current_shipment_index'] > 0:
            break
            
    # Check decisions
    print(f"\n6. Fetching decision for {sh_id}...")
    time.sleep(1)
    resp = requests.get(f'{BASE_URL}/level3/shipment-decision/{workflow_id}/{sh_id}')
    if resp.status_code == 200:
        decision = resp.json()['decision']
        print("  ✓ Success")
        print(f"  - Outcome: {decision.get('outcome')}")
        print(f"  - Provider Used: {decision.get('provider')}")
        
        if decision.get('provider') != 'gemini':
            print("  ❌ FAILED: Did not use Gemini provider!")
        else:
            print("  ✓ Success: Provider routing works!")
    else:
        print(f"  ❌ Decision not ready yet or error: {resp.status_code}")

if __name__ == '__main__':
    run_tests()
