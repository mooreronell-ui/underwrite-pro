#!/usr/bin/env python3
"""
Generate Synthetic Commercial Loan Data for XGBoost Training
=============================================================

This script uses standard Python libraries (NumPy and Pandas) to create 1,000 
realistic, structured commercial loan records, including the necessary binary 
outcome (default_outcome) for training your model.

Usage:
    python3 generate_synthetic_data.py

Environment Variables:
    DATA_PATH: Output file path (default: ../data/historical_deals.csv)

Author: Underwrite Pro ML Team
"""

import pandas as pd
import numpy as np
import os
import uuid

# --- Configuration ---
NUM_SAMPLES = 1000
OUTPUT_FILE = os.environ.get('DATA_PATH', '../data/historical_deals.csv')
np.random.seed(42)

def generate_synthetic_data(n_samples):
    """Generates synthetic commercial loan data for XGBoost model training."""

    print(f"Generating {n_samples} synthetic loan records...")

    # 1. Financial & Property Features (Designed to be predictors)
    data = {
        # Loan Metrics (Crucial for risk)
        'loan_amount': np.random.lognormal(mean=14.5, sigma=1.0, size=n_samples).round(0), # $2M to $20M range
        'ltv': np.random.uniform(low=0.45, high=0.85, size=n_samples).round(4), # Loan-to-Value
        'dscr': np.random.uniform(low=0.8, high=2.0, size=n_samples).round(4), # Debt Service Coverage Ratio
        'noi_cushion': np.random.normal(loc=0.3, scale=0.15, size=n_samples).clip(0.05, 0.8), # NOI / Debt Service - 1
        
        # Borrower / Market Features
        'borrower_credit_score': np.random.normal(loc=680, scale=40, size=n_samples).clip(550, 780).astype(int),
        'occupancy_rate': np.random.normal(loc=0.9, scale=0.08, size=n_samples).clip(0.6, 1.0).round(4),
        'loan_term_months': np.random.choice([120, 180, 240, 300], size=n_samples),
        'property_age': np.random.randint(5, 50, size=n_samples),
        'market_trend_index': np.random.normal(loc=0.0, scale=0.05, size=n_samples).round(4) # Mock economic factor
    }

    df = pd.DataFrame(data)
    
    # 2. Risk Outcome (Target Variable)
    # Define a simplified risk function: high LTV, low DSCR, and low credit score increase default probability.
    
    # Create a base probability of default (PD)
    # High risk if LTV > 0.75 OR DSCR < 1.2 OR Credit < 600
    risk_factor = (df['ltv'] * 1.5) + (1.5 / df['dscr']) - (df['borrower_credit_score'] / 750)
    
    # Scale risk factor to be a probability (0 to 1)
    # Add a small random noise element
    base_pd = (risk_factor - risk_factor.min()) / (risk_factor.max() - risk_factor.min())
    base_pd = base_pd * 0.4 + 0.05 # Scale between 5% and ~45% PD
    
    # Assign default outcome (1 for default, 0 for success)
    df['default_outcome'] = (np.random.rand(n_samples) < base_pd).astype(int)

    # 3. Add Administrative Columns
    df['deal_id'] = [str(uuid.uuid4()) for _ in range(n_samples)]
    df['org_id'] = [str(uuid.uuid4()) for _ in range(n_samples)]
    df['created_at'] = pd.to_datetime('today') - pd.to_timedelta(np.random.randint(1, 365, n_samples), unit='D')
    
    # Clean up and reorder columns
    df = df[['deal_id', 'org_id', 'loan_amount', 'ltv', 'dscr', 'borrower_credit_score', 
             'occupancy_rate', 'property_age', 'default_outcome', 'created_at']]
    
    # Print statistics
    print(f"\n📊 Data Statistics:")
    print(f"  Total records: {len(df)}")
    print(f"  Default rate: {df['default_outcome'].mean():.2%}")
    print(f"  Avg loan amount: ${df['loan_amount'].mean():,.0f}")
    print(f"  Avg LTV: {df['ltv'].mean():.2%}")
    print(f"  Avg DSCR: {df['dscr'].mean():.2f}")
    print(f"  Avg credit score: {df['borrower_credit_score'].mean():.0f}")

    return df

# --- Main Execution ---
if __name__ == "__main__":
    synthetic_data = generate_synthetic_data(NUM_SAMPLES)
    if synthetic_data is not None:
        # Ensure directory exists
        output_path = os.path.abspath(OUTPUT_FILE)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        synthetic_data.to_csv(output_path, index=False)
        print(f"\n✅ Data generation complete. Saved {len(synthetic_data)} records to: {output_path}")
        print(f"\n📋 Next Step: Train model with:")
        print(f"   python3 train_model.py --data {output_path}")
