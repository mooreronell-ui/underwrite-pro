#!/usr/bin/env python3
"""
ML Risk Assessment Model for Commercial Real Estate Loans
==========================================================
Predicts default risk score (0-100) based on deal characteristics

Features:
- Loan-to-Value (LTV) ratio
- Debt Service Coverage Ratio (DSCR)
- Property type
- Loan amount
- Location metrics
- Borrower credit history

Model: Gradient Boosting Classifier (XGBoost)
Output: Risk score (0-100) + confidence interval
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
import json
import os

# For production, install: pip install xgboost scikit-learn
try:
    import xgboost as xgb
    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import train_test_split
    HAS_ML_LIBS = True
except ImportError:
    HAS_ML_LIBS = False
    print("[WARNING] ML libraries not installed. Install with: pip install xgboost scikit-learn")


class RiskAssessmentModel:
    """
    Commercial real estate loan risk assessment model
    """
    
    def __init__(self, model_path: str = None):
        """
        Initialize risk assessment model
        
        Args:
            model_path: Path to saved model file (optional)
        """
        self.model = None
        self.scaler = None
        self.model_version = '1.0.0'
        
        # Try to load trained model by default
        if model_path is None:
            default_path = os.path.join(os.path.dirname(__file__), 'risk_model_trained.pkl')
            if os.path.exists(default_path):
                model_path = default_path
        
        if model_path and os.path.exists(model_path):
            self.load_model(model_path)
        self.feature_names = [
            'ltv_ratio',           # Loan-to-Value %
            'dscr',                # Debt Service Coverage Ratio
            'loan_amount',         # Loan amount in dollars
            'property_value',      # Property value in dollars
            'interest_rate',       # Interest rate %
            'term_months',         # Loan term in months
            'property_type_encoded', # Property type (encoded)
            'location_score',      # Location quality score (0-100)
            'borrower_credit_score', # Borrower credit score
            'occupancy_rate',      # Property occupancy %
            'noi',                 # Net Operating Income
            'cap_rate'             # Capitalization rate %
        ]
        
        if model_path and os.path.exists(model_path):
            self.load_model(model_path)
        elif HAS_ML_LIBS:
            # Initialize with default model
            self._init_default_model()
    
    def _init_default_model(self):
        """Initialize a default model with reasonable parameters"""
        if not HAS_ML_LIBS:
            return
        
        self.model = xgb.XGBClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            objective='binary:logistic',
            random_state=42
        )
        self.scaler = StandardScaler()
    
    def prepare_features(self, deal_data: Dict) -> np.ndarray:
        """
        Extract and prepare features from deal data
        
        Args:
            deal_data: Dictionary containing deal information
            
        Returns:
            Feature array ready for prediction
        """
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
        
        # Extract features with defaults
        ltv = deal_data.get('requested_ltv', 75.0)
        loan_amount = deal_data.get('loan_amount', 0)
        property_value = loan_amount / (ltv / 100) if ltv > 0 else loan_amount * 1.5
        interest_rate = deal_data.get('requested_rate', 7.5)
        term_months = deal_data.get('requested_term_months', 36)
        property_type = deal_data.get('asset_type', 'multifamily').lower()
        property_type_encoded = property_type_map.get(property_type, 1)
        
        # Calculate derived metrics
        # DSCR = NOI / Annual Debt Service
        noi = property_value * 0.06  # Assume 6% NOI if not provided
        annual_debt_service = self._calculate_annual_debt_service(
            loan_amount, interest_rate, term_months
        )
        dscr = noi / annual_debt_service if annual_debt_service > 0 else 1.0
        
        # Cap rate = NOI / Property Value
        cap_rate = (noi / property_value * 100) if property_value > 0 else 6.0
        
        # Location score (simplified - in production, use actual market data)
        location_score = 70.0  # Default medium score
        
        # Borrower credit score (default if not provided)
        borrower_credit_score = 720  # Default good credit
        
        # Occupancy rate (default if not provided)
        occupancy_rate = 90.0  # Default 90% occupied
        
        # Build feature vector matching trained model
        # Trained model expects: loan_amount, ltv, dscr, borrower_credit_score, occupancy_rate, property_age
        
        # Get values from deal_data with fallbacks
        borrower_credit = deal_data.get('borrower_credit_score', borrower_credit_score)
        occupancy = deal_data.get('occupancy_rate', occupancy_rate / 100)  # Convert to decimal if needed
        if occupancy > 1:  # If provided as percentage
            occupancy = occupancy / 100
        property_age = deal_data.get('property_age', 15)  # Default 15 years
        
        features = np.array([
            loan_amount,
            ltv / 100 if ltv > 1 else ltv,  # Ensure decimal format
            dscr,
            borrower_credit,
            occupancy,
            property_age
        ]).reshape(1, -1)
        
        return features
    
    def _calculate_annual_debt_service(
        self, 
        loan_amount: float, 
        interest_rate: float, 
        term_months: int
    ) -> float:
        """Calculate annual debt service for a loan"""
        if term_months == 0:
            return 0
        
        monthly_rate = interest_rate / 100 / 12
        num_payments = term_months
        
        if monthly_rate == 0:
            monthly_payment = loan_amount / num_payments
        else:
            monthly_payment = loan_amount * (
                monthly_rate * (1 + monthly_rate) ** num_payments
            ) / ((1 + monthly_rate) ** num_payments - 1)
        
        return monthly_payment * 12
    
    def predict_risk_score(self, deal_data: Dict) -> Dict:
        """
        Predict risk score for a deal
        
        Args:
            deal_data: Dictionary containing deal information
            
        Returns:
            Dictionary with risk_score, confidence, and risk_factors
        """
        if not HAS_ML_LIBS or self.model is None:
            # Fallback to rule-based scoring if ML not available
            return self._rule_based_scoring(deal_data)
        
        try:
            # Prepare features
            features = self.prepare_features(deal_data)
            
            # Scale features
            if self.scaler is not None:
                features_scaled = self.scaler.transform(features)
            else:
                features_scaled = features
            
            # Predict probability of default
            prob_default = self.model.predict_proba(features_scaled)[0][1]
            
            # Convert to risk score (0-100, higher = more risky)
            risk_score = int(prob_default * 100)
            
            # Calculate confidence
            confidence = max(prob_default, 1 - prob_default)
            
            # Identify key risk factors
            risk_factors = self._identify_risk_factors(deal_data, features[0])
            
            return {
                'risk_score': risk_score,
                'confidence': round(confidence * 100, 2),
                'risk_level': self._get_risk_level(risk_score),
                'risk_factors': risk_factors,
                'model_version': '1.0.0'
            }
        
        except Exception as e:
            print(f"[ERROR] Risk prediction failed: {e}")
            return self._rule_based_scoring(deal_data)
    
    def _rule_based_scoring(self, deal_data: Dict) -> Dict:
        """
        Fallback rule-based risk scoring when ML model is not available
        """
        risk_score = 50  # Start with neutral score
        risk_factors = []
        
        # LTV risk
        ltv = deal_data.get('requested_ltv', 75)
        if ltv > 80:
            risk_score += 15
            risk_factors.append({
                'factor': 'High LTV',
                'value': f'{ltv}%',
                'impact': 'high'
            })
        elif ltv > 75:
            risk_score += 8
            risk_factors.append({
                'factor': 'Elevated LTV',
                'value': f'{ltv}%',
                'impact': 'medium'
            })
        elif ltv < 65:
            risk_score -= 10
        
        # Interest rate risk
        rate = deal_data.get('requested_rate', 7.5)
        if rate > 10:
            risk_score += 10
            risk_factors.append({
                'factor': 'High Interest Rate',
                'value': f'{rate}%',
                'impact': 'medium'
            })
        
        # Loan amount risk
        loan_amount = deal_data.get('loan_amount', 0)
        if loan_amount > 10_000_000:
            risk_score += 5
            risk_factors.append({
                'factor': 'Large Loan Amount',
                'value': f'${loan_amount:,.0f}',
                'impact': 'low'
            })
        
        # Property type risk
        property_type = deal_data.get('asset_type', '').lower()
        high_risk_types = ['land', 'mixed_use']
        if property_type in high_risk_types:
            risk_score += 12
            risk_factors.append({
                'factor': 'Higher Risk Property Type',
                'value': property_type.title(),
                'impact': 'high'
            })
        
        # Ensure score is in valid range
        risk_score = max(0, min(100, risk_score))
        
        return {
            'risk_score': risk_score,
            'confidence': 75.0,  # Medium confidence for rule-based
            'risk_level': self._get_risk_level(risk_score),
            'risk_factors': risk_factors,
            'model_version': '1.0.0-rules'
        }
    
    def _identify_risk_factors(self, deal_data: Dict, features: np.ndarray) -> List[Dict]:
        """Identify key risk factors from features"""
        risk_factors = []
        
        # Features: loan_amount, ltv, dscr, borrower_credit_score, occupancy_rate, property_age
        loan_amount, ltv, dscr, credit_score, occupancy, property_age = features
        
        # Convert to percentages if needed
        ltv_pct = ltv * 100 if ltv <= 1 else ltv
        occupancy_pct = occupancy * 100 if occupancy <= 1 else occupancy
        
        # High LTV
        if ltv_pct > 80:
            risk_factors.append({
                'factor': 'High Loan-to-Value Ratio',
                'value': f'{ltv_pct:.1f}%',
                'impact': 'high'
            })
        
        # Low DSCR
        if dscr < 1.25:
            risk_factors.append({
                'factor': 'Low Debt Service Coverage',
                'value': f'{dscr:.2f}x',
                'impact': 'high'
            })
        
        # Low credit score
        if credit_score < 680:
            risk_factors.append({
                'factor': 'Below Average Credit Score',
                'value': f'{int(credit_score)}',
                'impact': 'medium'
            })
        
        # Low occupancy
        if occupancy_pct < 85:
            risk_factors.append({
                'factor': 'Low Occupancy Rate',
                'value': f'{occupancy_pct:.1f}%',
                'impact': 'medium'
            })
        
        # Old property
        if property_age > 30:
            risk_factors.append({
                'factor': 'Older Property',
                'value': f'{int(property_age)} years',
                'impact': 'low'
            })
        
        return risk_factors[:5]  # Return top 5 factors
    
    def _get_risk_level(self, risk_score: int) -> str:
        """Convert risk score to risk level category"""
        if risk_score < 30:
            return 'low'
        elif risk_score < 50:
            return 'moderate'
        elif risk_score < 70:
            return 'elevated'
        else:
            return 'high'
    
    def train(self, training_data: pd.DataFrame, labels: np.ndarray):
        """
        Train the risk assessment model
        
        Args:
            training_data: DataFrame with feature columns
            labels: Binary labels (0 = no default, 1 = default)
        """
        if not HAS_ML_LIBS:
            raise ImportError("ML libraries required for training")
        
        # Scale features
        X_scaled = self.scaler.fit_transform(training_data[self.feature_names])
        
        # Train model
        self.model.fit(X_scaled, labels)
        
        print(f"[INFO] Model trained on {len(training_data)} samples")
    
    def save_model(self, path: str):
        """Save model to disk"""
        if not HAS_ML_LIBS:
            return
        
        import pickle
        
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'feature_names': self.feature_names
        }
        
        with open(path, 'wb') as f:
            pickle.dump(model_data, f)
        
        print(f"[INFO] Model saved to {path}")
    
    def load_model(self, path: str):
        """Load model from disk"""
        if not HAS_ML_LIBS:
            return
        
        import pickle
        
        with open(path, 'rb') as f:
            model_data = pickle.load(f)
        
        self.model = model_data['model']
        self.scaler = model_data['scaler']
        self.feature_names = model_data['feature_names']
        self.model_version = model_data.get('version', '1.0.0')
        
        print(f"[INFO] Model loaded from {path}")
        print(f"[INFO] Model version: {self.model_version}")


# Global model instance
_model_instance = None

def get_model() -> RiskAssessmentModel:
    """Get or create global model instance"""
    global _model_instance
    if _model_instance is None:
        _model_instance = RiskAssessmentModel()
    return _model_instance


if __name__ == '__main__':
    # Test the model
    test_deal = {
        'loan_amount': 5000000,
        'requested_ltv': 75,
        'requested_rate': 7.5,
        'requested_term_months': 36,
        'asset_type': 'multifamily'
    }
    
    model = get_model()
    result = model.predict_risk_score(test_deal)
    
    print("\n=== Risk Assessment Result ===")
    print(json.dumps(result, indent=2))
