#!/usr/bin/env python3
"""
XGBoost Model Training Script for Commercial Real Estate Risk Assessment
=========================================================================

This script trains an XGBoost classifier to predict loan default risk based on
commercial real estate deal characteristics.

Usage:
    python train_model.py --data historical_deals.csv --output models/risk_model.pkl

Requirements:
    - Historical deals data with features and labels
    - Minimum 500 deals recommended
    - Labels: 0 = no default, 1 = default

Author: Underwrite Pro ML Team
Date: November 2025
"""

import argparse
import json
import os
import pickle
from datetime import datetime
from typing import Dict, Tuple

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report
)
import matplotlib.pyplot as plt


class RiskModelTrainer:
    """
    Trainer for commercial real estate loan risk assessment model
    """
    
    def __init__(self, random_state: int = 42):
        """
        Initialize trainer
        
        Args:
            random_state: Random seed for reproducibility
        """
        self.random_state = random_state
        self.model = None
        self.scaler = None
        self.feature_names = [
            'ltv_ratio',
            'dscr',
            'loan_amount',
            'property_value',
            'interest_rate',
            'term_months',
            'property_type_encoded',
            'location_score',
            'borrower_credit_score',
            'occupancy_rate',
            'noi',
            'cap_rate'
        ]
        self.training_metrics = {}
    
    def load_data(self, filepath: str) -> pd.DataFrame:
        """
        Load training data from CSV
        
        Args:
            filepath: Path to CSV file
            
        Returns:
            DataFrame with training data
        """
        print(f"\n[INFO] Loading data from {filepath}...")
        
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Data file not found: {filepath}")
        
        df = pd.read_csv(filepath)
        print(f"[INFO] Loaded {len(df)} records")
        print(f"[INFO] Columns: {list(df.columns)}")
        
        return df
    
    def prepare_features(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, np.ndarray]:
        """
        Prepare features and labels from raw data
        
        Args:
            df: Raw dataframe
            
        Returns:
            Tuple of (features_df, labels_array)
        """
        print("\n[INFO] Preparing features...")
        
        # Property type encoding
        property_type_map = {
            'multifamily': 1,
            'retail': 2,
            'office': 3,
            'industrial': 4,
            'mhp': 5,
            'mixed_use': 6,
            'land': 7
        }
        
        # Create feature dataframe
        features = pd.DataFrame()
        
        # Direct features
        features['ltv_ratio'] = df['ltv'] if 'ltv' in df.columns else df['requested_ltv']
        features['loan_amount'] = df['loan_amount']
        features['interest_rate'] = df['rate'] if 'rate' in df.columns else df['requested_rate']
        features['term_months'] = df['term_months'] if 'term_months' in df.columns else df['requested_term_months']
        
        # Property type encoding
        if 'asset_type' in df.columns:
            features['property_type_encoded'] = df['asset_type'].str.lower().map(property_type_map).fillna(1)
        elif 'property_type' in df.columns:
            features['property_type_encoded'] = df['property_type'].str.lower().map(property_type_map).fillna(1)
        else:
            features['property_type_encoded'] = 1  # Default to multifamily
        
        # Calculate property value from LTV
        features['property_value'] = features['loan_amount'] / (features['ltv_ratio'] / 100)
        
        # Borrower credit score
        features['borrower_credit_score'] = df['credit_score'] if 'credit_score' in df.columns else 720
        
        # Occupancy rate
        features['occupancy_rate'] = df['occupancy'] if 'occupancy' in df.columns else 90.0
        
        # Location score (if available, otherwise default)
        features['location_score'] = df['location_score'] if 'location_score' in df.columns else 70.0
        
        # Calculate NOI (Net Operating Income)
        if 'noi' in df.columns:
            features['noi'] = df['noi']
        else:
            # Estimate NOI as 6% of property value
            features['noi'] = features['property_value'] * 0.06
        
        # Calculate DSCR (Debt Service Coverage Ratio)
        if 'dscr' in df.columns:
            features['dscr'] = df['dscr']
        else:
            # Calculate DSCR = NOI / Annual Debt Service
            monthly_rate = features['interest_rate'] / 100 / 12
            num_payments = features['term_months']
            
            # Monthly payment calculation
            monthly_payment = features['loan_amount'] * (
                monthly_rate * (1 + monthly_rate) ** num_payments
            ) / ((1 + monthly_rate) ** num_payments - 1)
            
            annual_debt_service = monthly_payment * 12
            features['dscr'] = features['noi'] / annual_debt_service
            features['dscr'] = features['dscr'].fillna(1.0)
        
        # Calculate Cap Rate
        if 'cap_rate' in df.columns:
            features['cap_rate'] = df['cap_rate']
        else:
            features['cap_rate'] = (features['noi'] / features['property_value']) * 100
            features['cap_rate'] = features['cap_rate'].fillna(6.0)
        
        # Extract labels
        if 'default' in df.columns:
            labels = df['default'].values
        elif 'defaulted' in df.columns:
            labels = df['defaulted'].values
        elif 'outcome' in df.columns:
            labels = (df['outcome'] == 'default').astype(int).values
        else:
            raise ValueError("No label column found. Expected 'default', 'defaulted', or 'outcome'")
        
        # Handle missing values
        features = features.fillna(features.median())
        
        print(f"[INFO] Prepared {len(features)} samples with {len(features.columns)} features")
        print(f"[INFO] Default rate: {labels.mean():.2%}")
        
        return features, labels
    
    def train(
        self,
        X: pd.DataFrame,
        y: np.ndarray,
        test_size: float = 0.2,
        cv_folds: int = 5
    ) -> Dict:
        """
        Train XGBoost model with cross-validation
        
        Args:
            X: Feature dataframe
            y: Labels array
            test_size: Fraction of data for testing
            cv_folds: Number of cross-validation folds
            
        Returns:
            Dictionary with training metrics
        """
        print("\n[INFO] Training XGBoost model...")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=self.random_state, stratify=y
        )
        
        print(f"[INFO] Training set: {len(X_train)} samples")
        print(f"[INFO] Test set: {len(X_test)} samples")
        
        # Scale features
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Initialize model
        self.model = xgb.XGBClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            objective='binary:logistic',
            eval_metric='auc',
            random_state=self.random_state,
            use_label_encoder=False
        )
        
        # Train model
        print("[INFO] Training in progress...")
        self.model.fit(
            X_train_scaled,
            y_train,
            eval_set=[(X_test_scaled, y_test)],
            verbose=False
        )
        
        # Cross-validation
        print(f"[INFO] Running {cv_folds}-fold cross-validation...")
        cv_scores = cross_val_score(
            self.model,
            X_train_scaled,
            y_train,
            cv=cv_folds,
            scoring='roc_auc'
        )
        
        # Predictions
        y_pred = self.model.predict(X_test_scaled)
        y_pred_proba = self.model.predict_proba(X_test_scaled)[:, 1]
        
        # Calculate metrics
        metrics = {
            'accuracy': accuracy_score(y_test, y_pred),
            'precision': precision_score(y_test, y_pred),
            'recall': recall_score(y_test, y_pred),
            'f1_score': f1_score(y_test, y_pred),
            'roc_auc': roc_auc_score(y_test, y_pred_proba),
            'cv_mean': cv_scores.mean(),
            'cv_std': cv_scores.std(),
            'train_samples': len(X_train),
            'test_samples': len(X_test),
            'default_rate': y.mean()
        }
        
        self.training_metrics = metrics
        
        # Print results
        print("\n" + "="*60)
        print("TRAINING RESULTS")
        print("="*60)
        print(f"Accuracy:      {metrics['accuracy']:.4f}")
        print(f"Precision:     {metrics['precision']:.4f}")
        print(f"Recall:        {metrics['recall']:.4f}")
        print(f"F1 Score:      {metrics['f1_score']:.4f}")
        print(f"ROC AUC:       {metrics['roc_auc']:.4f}")
        print(f"CV Mean AUC:   {metrics['cv_mean']:.4f} (+/- {metrics['cv_std']:.4f})")
        print("="*60)
        
        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        print("\nConfusion Matrix:")
        print(f"TN: {cm[0,0]:4d}  FP: {cm[0,1]:4d}")
        print(f"FN: {cm[1,0]:4d}  TP: {cm[1,1]:4d}")
        
        # Classification report
        print("\nClassification Report:")
        print(classification_report(y_test, y_pred, target_names=['No Default', 'Default']))
        
        # Feature importance
        feature_importance = pd.DataFrame({
            'feature': self.feature_names,
            'importance': self.model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print("\nTop 5 Most Important Features:")
        for idx, row in feature_importance.head(5).iterrows():
            print(f"  {row['feature']:25s}: {row['importance']:.4f}")
        
        return metrics
    
    def save_model(self, output_path: str):
        """
        Save trained model to disk
        
        Args:
            output_path: Path to save model file
        """
        print(f"\n[INFO] Saving model to {output_path}...")
        
        # Create directory if needed
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Package model data
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'training_metrics': self.training_metrics,
            'trained_at': datetime.now().isoformat(),
            'version': '1.0.0'
        }
        
        # Save to pickle
        with open(output_path, 'wb') as f:
            pickle.dump(model_data, f)
        
        print(f"[SUCCESS] Model saved successfully")
        
        # Save metrics to JSON
        metrics_path = output_path.replace('.pkl', '_metrics.json')
        with open(metrics_path, 'w') as f:
            json.dump(self.training_metrics, f, indent=2)
        
        print(f"[INFO] Metrics saved to {metrics_path}")
    
    def plot_feature_importance(self, output_path: str = None):
        """
        Plot feature importance
        
        Args:
            output_path: Path to save plot (optional)
        """
        if self.model is None:
            print("[WARNING] No trained model available")
            return
        
        feature_importance = pd.DataFrame({
            'feature': self.feature_names,
            'importance': self.model.feature_importances_
        }).sort_values('importance', ascending=True)
        
        plt.figure(figsize=(10, 6))
        plt.barh(feature_importance['feature'], feature_importance['importance'])
        plt.xlabel('Importance')
        plt.title('Feature Importance - Risk Assessment Model')
        plt.tight_layout()
        
        if output_path:
            plt.savefig(output_path, dpi=300, bbox_inches='tight')
            print(f"[INFO] Feature importance plot saved to {output_path}")
        else:
            plt.show()


def main():
    """Main training pipeline"""
    parser = argparse.ArgumentParser(
        description='Train XGBoost model for commercial real estate risk assessment'
    )
    parser.add_argument(
        '--data',
        type=str,
        required=True,
        help='Path to training data CSV file'
    )
    parser.add_argument(
        '--output',
        type=str,
        default='models/risk_model.pkl',
        help='Path to save trained model (default: models/risk_model.pkl)'
    )
    parser.add_argument(
        '--test-size',
        type=float,
        default=0.2,
        help='Fraction of data for testing (default: 0.2)'
    )
    parser.add_argument(
        '--cv-folds',
        type=int,
        default=5,
        help='Number of cross-validation folds (default: 5)'
    )
    parser.add_argument(
        '--random-state',
        type=int,
        default=42,
        help='Random seed for reproducibility (default: 42)'
    )
    parser.add_argument(
        '--plot',
        action='store_true',
        help='Generate feature importance plot'
    )
    
    args = parser.parse_args()
    
    # Initialize trainer
    trainer = RiskModelTrainer(random_state=args.random_state)
    
    # Load data
    df = trainer.load_data(args.data)
    
    # Prepare features
    X, y = trainer.prepare_features(df)
    
    # Train model
    metrics = trainer.train(X, y, test_size=args.test_size, cv_folds=args.cv_folds)
    
    # Save model
    trainer.save_model(args.output)
    
    # Plot feature importance
    if args.plot:
        plot_path = args.output.replace('.pkl', '_feature_importance.png')
        trainer.plot_feature_importance(plot_path)
    
    print("\n[SUCCESS] Training complete!")
    print(f"[INFO] Model saved to: {args.output}")
    print(f"[INFO] ROC AUC Score: {metrics['roc_auc']:.4f}")


if __name__ == '__main__':
    main()
