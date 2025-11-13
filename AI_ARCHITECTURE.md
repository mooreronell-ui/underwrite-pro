# 🤖 AI Feature Architecture - Underwrite Pro
**Date:** November 13, 2025  
**Status:** ✅ Foundation Complete - Ready for ML/LLM Integration  
**Version:** 1.0.0

---

## 📊 Overview

The AI Intelligence layer provides three core capabilities to transform Underwrite Pro from a manual underwriting tool into an intelligent decision support system:

1. **Predictive Risk Assessment** - ML-powered risk scoring and stress testing
2. **Human-Centric Communication** - NLP/LLM-based summarization and Q&A
3. **Proactive Broker Guidance** - Automated validation and pricing optimization

---

## 🏗️ Architecture

### API Endpoint Structure

```
/api/ai/
├── health                    # Service health check
├── risk-score/:dealId        # ML risk prediction
├── stress-test/:dealId       # What-if scenario testing
├── summary/:dealId           # Executive summary generation
├── query-deal/:dealId        # RAG-based Q&A
├── health-check              # Pre-submission validation
└── pricing/:dealId           # Optimized pricing suggestions
```

### Authentication & Security

- ✅ All endpoints protected by `supabaseAuth` middleware
- ✅ JWT token required in `Authorization` header
- ✅ User context available via `req.userId`, `req.userEmail`
- ✅ Organization context available via `req.orgId`

---

## 🎯 Feature 1: Predictive Risk Assessment

### 1.1 Risk Score Endpoint

**Endpoint:** `GET /api/ai/risk-score/:dealId`

**Purpose:** Provide ML-powered risk assessment with sensitivity analysis

**Response Structure:**
```json
{
  "dealId": "uuid",
  "score": 78.5,
  "risk_level": "moderate",
  "sensitivity": {
    "dscr": "high",
    "ltv": "medium",
    "occupancy": "low"
  },
  "anomalies": [],
  "confidence": 0.87,
  "generated_at": "2025-11-13T08:00:00Z"
}
```

**Implementation Roadmap:**
1. Train ML model on historical deal data
2. Feature engineering (DSCR, LTV, occupancy, market trends)
3. Implement sensitivity analysis algorithms
4. Add anomaly detection (outlier identification)
5. Deploy model with versioning

**Data Requirements:**
- Historical deal outcomes (approved/rejected/defaulted)
- Property characteristics
- Market data
- Economic indicators

---

### 1.2 Stress Test Endpoint

**Endpoint:** `POST /api/ai/stress-test/:dealId`

**Purpose:** Run what-if scenarios to test deal resilience

**Request Body:**
```json
{
  "scenarios": {
    "rate_hike": { "increase_bps": 100 },
    "vacancy_increase": { "percentage": 10 },
    "value_decline": { "percentage": 15 }
  }
}
```

**Response Structure:**
```json
{
  "dealId": "uuid",
  "baseline": {
    "dscr": 1.35,
    "ltv": 65,
    "noi": 450000
  },
  "scenarios": {
    "rate_hike": {
      "new_dscr": 1.15,
      "status": "pass",
      "threshold": 1.10
    }
  },
  "generated_at": "2025-11-13T08:00:00Z"
}
```

**Implementation Roadmap:**
1. Build financial calculation engine
2. Define stress test scenarios
3. Implement threshold checks
4. Add visualization data
5. Create comparison reports

---

## 💬 Feature 2: Human-Centric Communication

### 2.1 Executive Summary Endpoint

**Endpoint:** `GET /api/ai/summary/:dealId`

**Purpose:** Generate human-readable deal summaries using LLM

**Response Structure:**
```json
{
  "dealId": "uuid",
  "summary_text": "The deal represents a conservative...",
  "key_points": [
    "Conservative LTV at 65%",
    "Strong historical occupancy"
  ],
  "tone": "professional",
  "word_count": 67,
  "generated_at": "2025-11-13T08:00:00Z"
}
```

**Implementation Roadmap:**
1. Choose LLM provider (OpenAI, Anthropic, or self-hosted)
2. Design prompt templates
3. Implement context gathering from deal data
4. Add tone/style controls
5. Implement caching for performance

**LLM Integration Options:**
- **OpenAI GPT-4** - Best quality, higher cost
- **Anthropic Claude** - Strong reasoning, good balance
- **Open Source (Llama 3)** - Lower cost, self-hosted

---

### 2.2 Document Q&A Endpoint

**Endpoint:** `POST /api/ai/query-deal/:dealId`

**Purpose:** Answer questions about deal using RAG (Retrieval Augmented Generation)

**Request Body:**
```json
{
  "question": "What was the historical NOI?"
}
```

**Response Structure:**
```json
{
  "dealId": "uuid",
  "question": "What was the historical NOI?",
  "answer": "The historical NOI averaged $450,000...",
  "source": "Financials_2024.pdf, page 12",
  "confidence": 0.92,
  "relevant_passages": [
    {
      "text": "Net Operating Income: $450,000 (2024)",
      "source": "Financials_2024.pdf",
      "page": 12
    }
  ],
  "generated_at": "2025-11-13T08:00:00Z"
}
```

**Implementation Roadmap:**
1. Set up document processing pipeline
2. Implement vector embeddings (OpenAI, Cohere, or sentence-transformers)
3. Choose vector database (Pinecone, Weaviate, or pgvector)
4. Build RAG pipeline
5. Add citation tracking

**RAG Architecture:**
```
Document Upload → Text Extraction → Chunking → Embedding → Vector DB
                                                              ↓
User Question → Embedding → Similarity Search → Context → LLM → Answer
```

---

## 🎯 Feature 3: Proactive Broker Guidance

### 3.1 Health Check Endpoint

**Endpoint:** `POST /api/ai/health-check`

**Purpose:** Validate deal against lender criteria before submission

**Request Body:**
```json
{
  "dealData": {
    "ltv": 65,
    "dscr": 1.20,
    "loan_amount": 5000000
  }
}
```

**Response Structure:**
```json
{
  "status": "FAIL",
  "overall_score": 72,
  "checks": {
    "ltv": {
      "status": "PASS",
      "value": 65,
      "requirement": "< 75%"
    },
    "dscr": {
      "status": "FAIL",
      "value": 1.20,
      "requirement": ">= 1.35",
      "reason": "DSCR (1.20) below 1.35 requirement"
    }
  },
  "recommendations": [
    "Increase equity to improve DSCR",
    "Consider longer amortization period"
  ],
  "generated_at": "2025-11-13T08:00:00Z"
}
```

**Implementation Roadmap:**
1. Define lender criteria database
2. Build validation rule engine
3. Implement recommendation system
4. Add documentation gap detection
5. Create actionable improvement suggestions

---

### 3.2 Pricing Suggestion Endpoint

**Endpoint:** `GET /api/ai/pricing/:dealId`

**Purpose:** Suggest competitive pricing based on risk and market data

**Response Structure:**
```json
{
  "dealId": "uuid",
  "suggested_rate": 6.25,
  "confidence": 0.90,
  "range": {
    "min": 5.75,
    "max": 6.75
  },
  "factors": {
    "risk_score": 78.5,
    "market_rate": 6.50,
    "lender_appetite": "high",
    "property_quality": "excellent"
  },
  "comparable_deals": [
    {
      "rate": 6.00,
      "similarity": 0.85,
      "date": "2025-10-15"
    }
  ],
  "generated_at": "2025-11-13T08:00:00Z"
}
```

**Implementation Roadmap:**
1. Build comparable deals database
2. Implement similarity scoring algorithm
3. Add market rate tracking
4. Build pricing model (regression or ML)
5. Add confidence intervals

---

## 🔧 Implementation Guide

### Phase 1: Foundation (✅ COMPLETE)
- ✅ Create API endpoint structure
- ✅ Wire authentication middleware
- ✅ Define response schemas
- ✅ Deploy placeholder endpoints

### Phase 2: Risk Assessment (Next)
**Timeline:** 2-3 weeks
**Requirements:**
- Historical deal data (100+ deals)
- Python ML environment
- Model training infrastructure
- Model serving API

**Steps:**
1. Data collection and cleaning
2. Feature engineering
3. Model training (Random Forest, XGBoost, or Neural Network)
4. Model evaluation and validation
5. API integration
6. Testing and monitoring

### Phase 3: Summarization (Next)
**Timeline:** 1-2 weeks
**Requirements:**
- LLM API access (OpenAI or Anthropic)
- Prompt engineering
- Context management
- Rate limiting

**Steps:**
1. Choose LLM provider
2. Design prompt templates
3. Implement context gathering
4. Add caching layer
5. Testing and refinement

### Phase 4: Document Q&A (Next)
**Timeline:** 3-4 weeks
**Requirements:**
- Document processing pipeline
- Vector database
- Embedding model
- RAG framework

**Steps:**
1. Set up document processing
2. Implement vector embeddings
3. Deploy vector database
4. Build RAG pipeline
5. Add citation tracking
6. Testing and optimization

### Phase 5: Guidance Features (Next)
**Timeline:** 2-3 weeks
**Requirements:**
- Lender criteria database
- Validation rule engine
- Comparable deals data
- Pricing model

**Steps:**
1. Define validation rules
2. Build health check engine
3. Collect comparable deals
4. Train pricing model
5. Testing and refinement

---

## 📊 Success Metrics

### Risk Assessment
- **Accuracy:** >85% prediction accuracy on test set
- **Calibration:** Predicted probabilities match actual outcomes
- **Latency:** <500ms response time

### Summarization
- **Quality:** Human evaluation score >4/5
- **Relevance:** Key points capture 90%+ of critical information
- **Latency:** <3s response time

### Document Q&A
- **Accuracy:** >90% answer accuracy (human evaluated)
- **Citation:** 100% answers include source citations
- **Latency:** <5s response time

### Guidance
- **Precision:** >95% validation accuracy
- **Recall:** Catch 90%+ of submission issues
- **Pricing:** Within 25 bps of actual market rates

---

## 🔐 Security Considerations

### Data Privacy
- ✅ All endpoints require authentication
- ✅ User can only access their organization's deals
- ⚠️ TODO: Add data encryption at rest
- ⚠️ TODO: Implement audit logging for AI operations

### Model Security
- ⚠️ TODO: Implement model versioning
- ⚠️ TODO: Add model performance monitoring
- ⚠️ TODO: Implement fallback mechanisms
- ⚠️ TODO: Add rate limiting per user

### LLM Safety
- ⚠️ TODO: Implement prompt injection protection
- ⚠️ TODO: Add content filtering
- ⚠️ TODO: Implement output validation
- ⚠️ TODO: Add PII detection and redaction

---

## 💰 Cost Estimates

### LLM Costs (OpenAI GPT-4)
- **Summary Generation:** ~$0.03 per deal
- **Document Q&A:** ~$0.10 per query
- **Monthly (100 deals, 500 queries):** ~$53

### Vector Database (Pinecone)
- **Starter Plan:** $70/month (100K vectors)
- **Growth Plan:** $200/month (1M vectors)

### ML Infrastructure
- **Model Training:** One-time $500-1000
- **Model Serving:** $50-100/month (serverless)

**Total Monthly Cost (Estimated):** $150-400 depending on usage

---

## 🚀 Deployment Status

### Current Status
- ✅ API endpoints deployed and accessible
- ✅ Authentication working
- ✅ Response schemas defined
- ✅ Documentation complete

### Next Steps
1. Choose ML/LLM providers
2. Set up development environment
3. Begin Phase 2 implementation (Risk Assessment)
4. Create integration tests
5. Add monitoring and logging

---

## 📞 Support & Resources

### Documentation
- API Endpoint Reference: `/backend/routes/ai.js`
- Testing Report: `/FINAL_TEST_REPORT.md`
- Setup Instructions: `/SETUP_INSTRUCTIONS.md`

### External Resources
- OpenAI API: https://platform.openai.com/docs
- Anthropic Claude: https://docs.anthropic.com
- Pinecone Vector DB: https://docs.pinecone.io
- LangChain (RAG): https://python.langchain.com

---

**Document Version:** 1.0.0  
**Last Updated:** November 13, 2025  
**Status:** ✅ Foundation Complete - Ready for Integration
