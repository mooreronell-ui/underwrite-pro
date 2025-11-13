#!/usr/bin/env python3
"""
Train XGBoost Risk Assessment Model
====================================

Trains an XGBoost classifier on synthetic commercial loan data.

Usage:
    python3 train_risk_model.py

Author: Underwrite Pro ML Team
"""

import os
import json
import pickle
from datetime import datetime

import pandas as pd
import numpy as np
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

# Configuration
DATA_FILE = '../data/historical_deals.csv'
MODEL_OUTPUT = '../ml/risk_model_trained.pkl'
METRICS_OUTPUT = '../ml/risk_model_metrics.json'

def load_and_prepare_data(filepath):
    """Load and prepare training data"""
    print(f"\n[INFO] Loading data from {filepath}...")
    df = pd.read_csv(filepath)
    print(f"[INFO] Loaded {len(df)} records")
    
    # Features
    feature_cols = [
        'loan_amount',
        'ltv',
        'dscr',
        'borrower_credit_score',
        'occupancy_rate',
        'property_age'
    ]
    
    X = df[feature_cols]
    y = df['default_outcome']
    
    print(f"[INFO] Features: {list(X.columns)}")
    print(f"[INFO] Default rate: {y.mean():.2%}")
    
    return X, y, feature_cols

def train_model(X, y, feature_names):
    """Train XGBoost classifier"""
    print("\n[INFO] Training XGBoost model...")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"[INFO] Training set: {len(X_train)} samples")
    print(f"[INFO] Test set: {len(X_test)} samples")
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train model
    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        objective='binary:logistic',
        eval_metric='auc',
        random_state=42,
        use_label_encoder=False
    )
    
    print("[INFO] Training in progress...")
    model.fit(
        X_train_scaled,
        y_train,
        eval_set=[(X_test_scaled, y_test)],
        verbose=False
    )
    
    # Cross-validation
    print("[INFO] Running 5-fold cross-validation...")
    cv_scores = cross_val_score(
        model,
        X_train_scaled,
        y_train,
        cv=5,
        scoring='roc_auc'
    )
    
    # Predictions
    y_pred = model.predict(X_test_scaled)
    y_pred_proba = model.predict_proba(X_test_scaled)[:, 1]
    
    # Calculate metrics
    metrics = {
        'accuracy': float(accuracy_score(y_test, y_pred)),
        'precision': float(precision_score(y_test, y_pred)),
        'recall': float(recall_score(y_test, y_pred)),
        'f1_score': float(f1_score(y_test, y_pred)),
        'roc_auc': float(roc_auc_score(y_test, y_pred_proba)),
        'cv_mean': float(cv_scores.mean()),
        'cv_std': float(cv_scores.std()),
        'train_samples': len(X_train),
        'test_samples': len(X_test),
        'default_rate': float(y.mean()),
        'trained_at': datetime.now().isoformat(),
        'version': '1.0.0'
    }
    
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
        'feature': feature_names,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\nFeature Importance:")
    for idx, row in feature_importance.iterrows():
        print(f"  {row['feature']:25s}: {row['importance']:.4f}")
    
    return model, scaler, metrics, feature_names

def save_model(model, scaler, metrics, feature_names, model_path, metrics_path):
    """Save trained model and metrics"""
    print(f"\n[INFO] Saving model to {model_path}...")
    
    # Create directory
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    
    # Package model data
    model_data = {
        'model': model,
        'scaler': scaler,
        'feature_names': feature_names,
        'training_metrics': metrics,
        'trained_at': datetime.now().isoformat(),
        'version': '1.0.0'
    }
    
    # Save model
    with open(model_path, 'wb') as f:
        pickle.dump(model_data, f)
    
    print(f"[SUCCESS] Model saved successfully")
    
    # Save metrics
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=2)
    
    print(f"[INFO] Metrics saved to {metrics_path}")

def main():
    """Main training pipeline"""
    print("="*60)
    print("XGBoost Risk Assessment Model Training")
    print("="*60)
    
    # Load data
    X, y, feature_names = load_and_prepare_data(DATA_FILE)
    
    # Train model
    model, scaler, metrics, feature_names = train_model(X, y, feature_names)
    
    # Save model
    save_model(model, scaler, metrics, feature_names, MODEL_OUTPUT, METRICS_OUTPUT)
    
    print("\n" + "="*60)
    print("✅ TRAINING COMPLETE!")
    print("="*60)
    print(f"Model saved to: {MODEL_OUTPUT}")
    print(f"Metrics saved to: {METRICS_OUTPUT}")
    print(f"ROC AUC Score: {metrics['roc_auc']:.4f}")
    print("\n📋 Next Step: Deploy model to production")
    print("="*60)

if __name__ == '__main__':
    main()
