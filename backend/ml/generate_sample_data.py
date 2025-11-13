#!/usr/bin/env python3
"""
Generate Sample Training Data for Model Development
====================================================

This script generates synthetic training data for developing and testing
the risk assessment model. Replace with real historical data for production.

Usage:
    python generate_sample_data.py --output sample_data.csv --samples 1000

Author: Underwrite Pro ML Team
"""

import argparse
import numpy as np
import pandas as pd
from datetime import datetime, timedelta


def generate_sample_data(n_samples: int = 1000, default_rate: float = 0.15) -> pd.DataFrame:
    """
    Generate synthetic commercial real estate loan data
    
    Args:
        n_samples: Number of samples to generate
        default_rate: Target default rate (0-1)
        
    Returns:
        DataFrame with synthetic deal data
    """
    np.random.seed(42)
    
    print(f"[INFO] Generating {n_samples} synthetic deals...")
    
    # Property types
    property_types = ['multifamily', 'retail', 'office', 'industrial', 'mhp', 'mixed_use', 'land']
    property_weights = [0.35, 0.20, 0.15, 0.15, 0.05, 0.08, 0.02]
    
    # Generate base features
    data = {
        'deal_id': [f'DEAL-{i:05d}' for i in range(n_samples)],
        'asset_type': np.random.choice(property_types, n_samples, p=property_weights),
        'loan_amount': np.random.lognormal(15, 0.8, n_samples) * 100000,  # $1M-$50M range
        'requested_ltv': np.random.normal(70, 10, n_samples),  # Mean 70%, std 10%
        'requested_rate': np.random.normal(7.5, 1.5, n_samples),  # Mean 7.5%, std 1.5%
        'requested_term_months': np.random.choice([24, 36, 48, 60, 84, 120], n_samples),
        'credit_score': np.random.normal(720, 50, n_samples),  # Mean 720, std 50
        'occupancy': np.random.normal(90, 8, n_samples),  # Mean 90%, std 8%
        'location_score': np.random.normal(70, 15, n_samples),  # Mean 70, std 15
    }
    
    df = pd.DataFrame(data)
    
    # Clip values to realistic ranges
    df['requested_ltv'] = df['requested_ltv'].clip(50, 95)
    df['requested_rate'] = df['requested_rate'].clip(4.0, 15.0)
    df['credit_score'] = df['credit_score'].clip(600, 850).astype(int)
    df['occupancy'] = df['occupancy'].clip(60, 100)
    df['location_score'] = df['location_score'].clip(30, 100)
    
    # Calculate derived features
    df['property_value'] = df['loan_amount'] / (df['requested_ltv'] / 100)
    df['noi'] = df['property_value'] * np.random.normal(0.06, 0.015, n_samples)  # 6% +/- 1.5%
    df['noi'] = df['noi'].clip(0, None)
    
    # Calculate monthly payment and DSCR
    monthly_rate = df['requested_rate'] / 100 / 12
    num_payments = df['requested_term_months']
    
    monthly_payment = df['loan_amount'] * (
        monthly_rate * (1 + monthly_rate) ** num_payments
    ) / ((1 + monthly_rate) ** num_payments - 1)
    
    annual_debt_service = monthly_payment * 12
    df['dscr'] = df['noi'] / annual_debt_service
    df['dscr'] = df['dscr'].clip(0.5, 3.0)
    
    df['cap_rate'] = (df['noi'] / df['property_value']) * 100
    
    # Generate default labels based on risk factors
    # Higher risk = higher probability of default
    risk_score = (
        (df['requested_ltv'] - 70) * 0.02 +  # LTV above 70% increases risk
        (1.35 - df['dscr']) * 0.15 +  # DSCR below 1.35 increases risk
        (720 - df['credit_score']) * 0.0005 +  # Lower credit increases risk
        (90 - df['occupancy']) * 0.01 +  # Lower occupancy increases risk
        (df['requested_rate'] - 7.5) * 0.03  # Higher rate increases risk
    )
    
    # Add property type risk
    property_risk = {
        'multifamily': 0,
        'retail': 0.05,
        'office': 0.03,
        'industrial': 0.02,
        'mhp': 0.01,
        'mixed_use': 0.08,
        'land': 0.15
    }
    df['property_risk'] = df['asset_type'].map(property_risk)
    risk_score += df['property_risk'] * 10
    
    # Convert risk score to probability
    default_prob = 1 / (1 + np.exp(-risk_score))
    
    # Adjust to match target default rate
    threshold = np.percentile(default_prob, (1 - default_rate) * 100)
    df['default'] = (default_prob > threshold).astype(int)
    
    # Add some randomness
    flip_mask = np.random.random(n_samples) < 0.05  # 5% random flips
    df.loc[flip_mask, 'default'] = 1 - df.loc[flip_mask, 'default']
    
    # Add dates
    start_date = datetime(2020, 1, 1)
    df['origination_date'] = [
        start_date + timedelta(days=int(x))
        for x in np.random.uniform(0, 1800, n_samples)
    ]
    
    # Select final columns
    final_columns = [
        'deal_id',
        'origination_date',
        'asset_type',
        'loan_amount',
        'requested_ltv',
        'requested_rate',
        'requested_term_months',
        'credit_score',
        'occupancy',
        'location_score',
        'noi',
        'dscr',
        'cap_rate',
        'default'
    ]
    
    df = df[final_columns]
    
    # Print statistics
    print(f"\n[INFO] Data Generation Complete")
    print(f"  Total samples: {len(df)}")
    print(f"  Default rate: {df['default'].mean():.2%}")
    print(f"  Avg loan amount: ${df['loan_amount'].mean():,.0f}")
    print(f"  Avg LTV: {df['requested_ltv'].mean():.1f}%")
    print(f"  Avg DSCR: {df['dscr'].mean():.2f}")
    print(f"  Avg credit score: {df['credit_score'].mean():.0f}")
    
    print(f"\n[INFO] Property Type Distribution:")
    for ptype, count in df['asset_type'].value_counts().items():
        print(f"  {ptype:15s}: {count:4d} ({count/len(df)*100:.1f}%)")
    
    return df


def main():
    """Main data generation pipeline"""
    parser = argparse.ArgumentParser(
        description='Generate synthetic training data for risk assessment model'
    )
    parser.add_argument(
        '--output',
        type=str,
        default='sample_data.csv',
        help='Output CSV file path (default: sample_data.csv)'
    )
    parser.add_argument(
        '--samples',
        type=int,
        default=1000,
        help='Number of samples to generate (default: 1000)'
    )
    parser.add_argument(
        '--default-rate',
        type=float,
        default=0.15,
        help='Target default rate 0-1 (default: 0.15)'
    )
    
    args = parser.parse_args()
    
    # Generate data
    df = generate_sample_data(args.samples, args.default_rate)
    
    # Save to CSV
    df.to_csv(args.output, index=False)
    print(f"\n[SUCCESS] Data saved to {args.output}")
    print(f"[INFO] Ready for training with: python train_model.py --data {args.output}")


if __name__ == '__main__':
    main()
