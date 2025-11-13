# XGBoost Model Training Guide

Complete guide for training the commercial real estate risk assessment model.

---

## Quick Start

### 1. Generate Sample Data (for testing)

```bash
cd /home/ubuntu/underwrite-pro/backend/ml

# Generate 1000 synthetic deals
python3 generate_sample_data.py --output sample_data.csv --samples 1000
```

### 2. Train Model

```bash
# Train on sample data
python3 train_model.py --data sample_data.csv --output models/risk_model.pkl --plot
```

### 3. Deploy Model

```bash
# Copy trained model to production location
cp models/risk_model.pkl risk_model_trained.pkl

# Update risk_model.py to load trained model by default
```

---

## Using Real Historical Data

### Data Requirements

**Minimum Requirements:**
- 500+ historical deals
- At least 50 defaults (10% default rate)
- Complete feature data

**Recommended:**
- 1000+ deals for better accuracy
- 2-5 years of historical data
- Balanced representation of property types

### Required Columns

Your CSV file must include these columns:

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `loan_amount` | float | Loan amount in dollars | 5000000 |
| `requested_ltv` or `ltv` | float | Loan-to-Value ratio % | 75.0 |
| `requested_rate` or `rate` | float | Interest rate % | 7.5 |
| `requested_term_months` or `term_months` | int | Loan term in months | 36 |
| `asset_type` or `property_type` | string | Property type | "multifamily" |
| `credit_score` | int | Borrower credit score | 720 |
| `occupancy` | float | Occupancy rate % | 92.0 |
| `default` or `defaulted` or `outcome` | int/string | 1/0 or "default"/"no_default" | 0 |

**Optional Columns** (will be calculated if missing):
- `noi` - Net Operating Income
- `dscr` - Debt Service Coverage Ratio
- `cap_rate` - Capitalization Rate
- `location_score` - Location quality score (0-100)

### Data Format Example

```csv
deal_id,loan_amount,requested_ltv,requested_rate,requested_term_months,asset_type,credit_score,occupancy,default
DEAL-001,5000000,75.0,7.5,36,multifamily,720,92.0,0
DEAL-002,3500000,80.0,8.2,24,retail,680,85.0,1
DEAL-003,8000000,70.0,7.0,60,office,750,95.0,0
```

---

## Training Process

### Step 1: Prepare Your Data

```bash
# If you have historical data in Excel
# Convert to CSV first using Excel or:
python3 -c "import pandas as pd; pd.read_excel('deals.xlsx').to_csv('deals.csv', index=False)"
```

### Step 2: Run Training Script

```bash
python3 train_model.py \
  --data your_historical_deals.csv \
  --output models/risk_model_v1.pkl \
  --test-size 0.2 \
  --cv-folds 5 \
  --plot
```

**Parameters:**
- `--data`: Path to your CSV file
- `--output`: Where to save trained model
- `--test-size`: Fraction for testing (default: 0.2 = 20%)
- `--cv-folds`: Cross-validation folds (default: 5)
- `--random-state`: Random seed for reproducibility (default: 42)
- `--plot`: Generate feature importance plot

### Step 3: Review Training Results

The script will output:

```
==============================================================
TRAINING RESULTS
==============================================================
Accuracy:      0.8750
Precision:     0.8235
Recall:        0.8000
F1 Score:      0.8116
ROC AUC:       0.9200
CV Mean AUC:   0.9100 (+/- 0.0250)
==============================================================

Confusion Matrix:
TN:  140  FP:   10
FN:   15  TP:   35

Top 5 Most Important Features:
  dscr                     : 0.2450
  ltv_ratio                : 0.1890
  borrower_credit_score    : 0.1520
  occupancy_rate           : 0.1230
  interest_rate            : 0.0980
```

### Step 4: Evaluate Model Quality

**Good Model Indicators:**
- ✅ ROC AUC > 0.85
- ✅ Precision > 0.80
- ✅ Recall > 0.75
- ✅ CV std < 0.05

**If metrics are low:**
- Collect more training data
- Check data quality
- Adjust hyperparameters
- Add more features

---

## Deploying Trained Model

### Option 1: Update Default Model

```bash
# Copy trained model to default location
cp models/risk_model_v1.pkl backend/ml/risk_model_default.pkl

# Update risk_model.py to load it
```

Edit `risk_model.py`:

```python
def __init__(self, model_path: str = None):
    if model_path is None:
        model_path = os.path.join(
            os.path.dirname(__file__),
            'risk_model_default.pkl'
        )
    
    if os.path.exists(model_path):
        self.load_model(model_path)
    # ...
```

### Option 2: Environment Variable

```bash
# Set environment variable
export RISK_MODEL_PATH=/path/to/models/risk_model_v1.pkl

# Update risk_model.py to check env var
```

### Option 3: Upload to S3/Cloud Storage

```bash
# Upload to S3
aws s3 cp models/risk_model_v1.pkl s3://your-bucket/models/

# Download in production
aws s3 cp s3://your-bucket/models/risk_model_v1.pkl /app/ml/
```

---

## Model Versioning

### Version Naming Convention

```
risk_model_v{major}.{minor}_{date}.pkl
```

Examples:
- `risk_model_v1.0_20251113.pkl` - Initial production model
- `risk_model_v1.1_20251120.pkl` - Minor update
- `risk_model_v2.0_20251201.pkl` - Major architecture change

### Track Model Performance

Create a model registry:

```csv
version,trained_date,samples,roc_auc,precision,recall,deployed_date,status
v1.0,2025-11-13,1000,0.92,0.82,0.80,2025-11-14,production
v1.1,2025-11-20,1500,0.94,0.85,0.83,2025-11-21,production
```

---

## Hyperparameter Tuning

### Basic Tuning

Edit `train_model.py` to adjust XGBoost parameters:

```python
self.model = xgb.XGBClassifier(
    n_estimators=100,      # Try: 50, 100, 200
    max_depth=6,           # Try: 4, 6, 8
    learning_rate=0.1,     # Try: 0.05, 0.1, 0.2
    min_child_weight=1,    # Try: 1, 3, 5
    subsample=0.8,         # Try: 0.7, 0.8, 0.9
    colsample_bytree=0.8,  # Try: 0.7, 0.8, 0.9
    objective='binary:logistic',
    eval_metric='auc',
    random_state=self.random_state
)
```

### Advanced Tuning with Grid Search

```python
from sklearn.model_selection import GridSearchCV

param_grid = {
    'n_estimators': [50, 100, 200],
    'max_depth': [4, 6, 8],
    'learning_rate': [0.05, 0.1, 0.2]
}

grid_search = GridSearchCV(
    xgb.XGBClassifier(),
    param_grid,
    cv=5,
    scoring='roc_auc',
    n_jobs=-1
)

grid_search.fit(X_train_scaled, y_train)
best_model = grid_search.best_estimator_
```

---

## Monitoring Model Performance

### Production Metrics to Track

1. **Prediction Distribution**
   - Are risk scores reasonable?
   - Any unusual patterns?

2. **Actual vs Predicted**
   - Track actual defaults
   - Compare to predictions
   - Calculate realized accuracy

3. **Feature Drift**
   - Are input features changing?
   - LTV, DSCR trends over time

### Retraining Schedule

**Recommended:**
- Retrain quarterly with new data
- Retrain immediately if accuracy drops
- Retrain after major market changes

---

## Troubleshooting

### Issue: Low Accuracy (< 0.80)

**Solutions:**
1. Collect more training data
2. Check for data quality issues
3. Add more features
4. Try different hyperparameters

### Issue: High Variance (CV std > 0.05)

**Solutions:**
1. Increase training data
2. Reduce model complexity (lower max_depth)
3. Increase regularization

### Issue: Overfitting (Train >> Test accuracy)

**Solutions:**
1. Reduce max_depth
2. Increase min_child_weight
3. Add more training data
4. Use regularization (alpha, lambda)

### Issue: Class Imbalance

If default rate < 5%:

```python
# Use scale_pos_weight
scale_pos_weight = (len(y) - y.sum()) / y.sum()

self.model = xgb.XGBClassifier(
    scale_pos_weight=scale_pos_weight,
    # ... other params
)
```

---

## Advanced Features

### Feature Engineering

Add custom features to improve accuracy:

```python
# Market indicators
df['market_cap_rate_spread'] = df['cap_rate'] - market_avg_cap_rate

# Time features
df['months_since_last_refi'] = ...
df['property_age'] = ...

# Interaction features
df['ltv_times_rate'] = df['ltv_ratio'] * df['interest_rate']
df['dscr_times_credit'] = df['dscr'] * df['credit_score']
```

### Ensemble Methods

Combine multiple models:

```python
from sklearn.ensemble import VotingClassifier

xgb_model = xgb.XGBClassifier(...)
rf_model = RandomForestClassifier(...)
lgb_model = LGBMClassifier(...)

ensemble = VotingClassifier([
    ('xgb', xgb_model),
    ('rf', rf_model),
    ('lgb', lgb_model)
], voting='soft')
```

---

## Production Checklist

Before deploying to production:

- [ ] Model trained on sufficient data (500+ deals)
- [ ] ROC AUC > 0.85
- [ ] Cross-validation performed
- [ ] Feature importance reviewed
- [ ] Model saved with version number
- [ ] Metrics documented
- [ ] Tested on holdout set
- [ ] Integrated with API
- [ ] Monitoring configured
- [ ] Rollback plan prepared

---

## Support

For questions or issues:
- Review this guide
- Check `ML_IMPLEMENTATION.md`
- Examine training logs
- Contact ML team

---

## Appendix

### Complete Training Command Reference

```bash
# Basic training
python3 train_model.py --data data.csv

# With all options
python3 train_model.py \
  --data historical_deals.csv \
  --output models/risk_model_v2.pkl \
  --test-size 0.25 \
  --cv-folds 10 \
  --random-state 42 \
  --plot

# Generate sample data
python3 generate_sample_data.py \
  --output sample_1000.csv \
  --samples 1000 \
  --default-rate 0.15
```

### File Locations

```
backend/ml/
├── train_model.py              # Training script
├── generate_sample_data.py     # Sample data generator
├── risk_model.py               # Model class
├── risk_model_api.py           # API wrapper
├── TRAINING_GUIDE.md           # This file
├── models/                     # Trained models
│   ├── risk_model_v1.pkl
│   └── risk_model_v1_metrics.json
└── data/                       # Training data
    └── historical_deals.csv
```

---

**Last Updated:** November 13, 2025  
**Version:** 1.0.0
