#!/usr/bin/env python3
"""
Risk Model API Wrapper
======================
Standalone script that can be called from Node.js
Accepts JSON input via command line and outputs JSON result
"""

import sys
import json
from risk_model import get_model

def main():
    try:
        # Read deal data from command line argument
        if len(sys.argv) < 2:
            print(json.dumps({
                'error': 'No deal data provided',
                'usage': 'python risk_model_api.py \'{"loan_amount": 5000000, ...}\''
            }))
            sys.exit(1)
        
        deal_data_json = sys.argv[1]
        deal_data = json.loads(deal_data_json)
        
        # Get model and predict
        model = get_model()
        result = model.predict_risk_score(deal_data)
        
        # Output JSON result
        print(json.dumps(result))
        sys.exit(0)
        
    except json.JSONDecodeError as e:
        print(json.dumps({
            'error': 'Invalid JSON input',
            'message': str(e)
        }))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            'error': 'Risk assessment failed',
            'message': str(e)
        }))
        sys.exit(1)

if __name__ == '__main__':
    main()
