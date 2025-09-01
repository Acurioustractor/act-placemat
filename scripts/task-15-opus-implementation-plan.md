# Task 15: Project Recommendation Engine - Opus-Level Implementation Plan

## Executive Summary
Implement AI-driven project recommendation algorithms using community data and user feedback with Python ML stack, FastAPI integration, and Supabase storage.

**Complexity Score: 9/10**  
**Priority: High**  
**Dependencies: Task 14 (Complete)**

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend UI   │◄──►│   FastAPI ML     │◄──►│   Supabase DB   │
│   (React/TS)    │    │   Backend        │    │   (PostgreSQL)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   ML Pipeline    │
                       │   (Python)       │
                       │   - scikit-learn │ 
                       │   - XGBoost      │
                       │   - pandas       │
                       └──────────────────┘
```

## Phase 1: Data Infrastructure & Schema Design (2-3 days)

### 1.1 Supabase Schema Extensions
```sql
-- User behavior tracking
CREATE TABLE user_project_interactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  project_id INTEGER REFERENCES projects(id),
  interaction_type VARCHAR(50) NOT NULL, -- view, like, share, apply, bookmark
  interaction_weight DECIMAL(3,2) DEFAULT 1.0,
  session_id UUID,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Project features for ML
CREATE TABLE project_features (
  project_id INTEGER PRIMARY KEY REFERENCES projects(id),
  category_vector DECIMAL[] NOT NULL, -- One-hot encoded categories
  location_vector DECIMAL[] NOT NULL, -- Geographic features
  skill_requirements TEXT[], -- Skills needed
  collaboration_score DECIMAL(3,2), -- Team/solo preference
  impact_score DECIMAL(3,2), -- Social impact rating
  complexity_score DECIMAL(3,2), -- Technical complexity
  time_commitment INTEGER, -- Hours per week
  remote_friendly BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preference profiles
CREATE TABLE user_preference_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  category_preferences DECIMAL[] NOT NULL, -- Learned category weights
  location_preferences DECIMAL[] NOT NULL, -- Geographic preferences
  skill_preferences TEXT[], -- Preferred skills
  impact_preference DECIMAL(3,2), -- Impact vs other factors
  collaboration_preference DECIMAL(3,2), -- Team vs solo
  time_availability INTEGER, -- Available hours per week
  experience_level INTEGER, -- 1-5 scale
  diversity_boost DECIMAL(3,2) DEFAULT 1.0, -- Diversity algorithm weight
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Recommendation feedback
CREATE TABLE recommendation_feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  project_id INTEGER REFERENCES projects(id),
  recommendation_score DECIMAL(3,2) NOT NULL,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  feedback_type VARCHAR(20) NOT NULL, -- explicit, implicit, negative
  recommendation_reason TEXT[], -- Why this was recommended
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  algorithm_version VARCHAR(20) NOT NULL
);

-- Model performance tracking
CREATE TABLE ml_model_performance (
  id BIGSERIAL PRIMARY KEY,
  model_version VARCHAR(20) NOT NULL,
  training_date TIMESTAMPTZ NOT NULL,
  validation_accuracy DECIMAL(5,4),
  diversity_score DECIMAL(3,2),
  impact_alignment_score DECIMAL(3,2),
  a_b_test_group VARCHAR(10), -- A, B, control
  performance_metrics JSONB NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.2 Data Migration & Feature Engineering
```python
# /apps/ml-engine/src/data/feature_engineering.py
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder
from typing import Dict, List, Tuple

class ProjectFeatureEngineer:
    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.category_encoder = LabelEncoder()
        self.scaler = StandardScaler()
        
    def extract_project_features(self) -> pd.DataFrame:
        """Extract and engineer features from project data"""
        # 1. Base project data
        projects = self.supabase.table('projects').select('*').execute()
        df = pd.DataFrame(projects.data)
        
        # 2. Category encoding (one-hot)
        categories = df['category'].unique()
        category_columns = pd.get_dummies(df['category'], prefix='cat')
        
        # 3. Geographic features
        location_features = self._engineer_location_features(df)
        
        # 4. Skill requirements parsing
        skill_features = self._extract_skill_features(df)
        
        # 5. Impact scoring
        impact_scores = self._calculate_impact_scores(df)
        
        # 6. Collaboration features
        collaboration_features = self._extract_collaboration_features(df)
        
        # Combine all features
        feature_df = pd.concat([
            df[['id', 'title', 'description']],
            category_columns,
            location_features,
            skill_features,
            impact_scores,
            collaboration_features
        ], axis=1)
        
        return feature_df
    
    def _engineer_location_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create geographic feature vectors"""
        # Australian state/territory encoding
        states = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']
        location_features = pd.get_dummies(df['location'].str.split(',').str[0], prefix='loc')
        
        # Remote work capability
        location_features['remote_capable'] = df['description'].str.contains(
            'remote|online|virtual', case=False, na=False
        ).astype(int)
        
        return location_features
    
    def _extract_skill_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Extract skill requirements from project descriptions"""
        # Common ACT ecosystem skills
        skill_keywords = {
            'python': r'\bpython\b',
            'javascript': r'\bjavascript\b|\bjs\b|\bnode\b',
            'react': r'\breact\b',
            'design': r'\bdesign\b|\bui\b|\bux\b',
            'writing': r'\bwriting\b|\bcontent\b|\bblog\b',
            'research': r'\bresearch\b|\banalysis\b',
            'community': r'\bcommunity\b|\bengagement\b',
            'sustainability': r'\bsustainable\b|\benvironmental\b',
            'indigenous': r'\bindigenous\b|\baboriginal\b',
            'data': r'\bdata\b|\banalytics\b|\bvisualization\b'
        }
        
        skill_features = pd.DataFrame()
        for skill, pattern in skill_keywords.items():
            skill_features[f'skill_{skill}'] = df['description'].str.contains(
                pattern, case=False, na=False
            ).astype(int)
        
        return skill_features
```

## Phase 2: ML Algorithm Implementation (4-5 days)

### 2.1 Collaborative Filtering Engine
```python
# /apps/ml-engine/src/algorithms/collaborative_filtering.py
from sklearn.decomposition import TruncatedSVD
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from scipy.sparse import csr_matrix

class CollaborativeRecommender:
    def __init__(self, n_components=50, diversity_weight=0.3):
        self.svd = TruncatedSVD(n_components=n_components, random_state=42)
        self.diversity_weight = diversity_weight
        self.user_project_matrix = None
        self.user_embeddings = None
        self.project_embeddings = None
        
    def fit(self, interaction_data: pd.DataFrame):
        """Train collaborative filtering model"""
        # Create user-project interaction matrix
        self.user_project_matrix = self._create_interaction_matrix(interaction_data)
        
        # Apply SVD for dimensionality reduction
        self.user_embeddings = self.svd.fit_transform(self.user_project_matrix)
        self.project_embeddings = self.svd.components_.T
        
        return self
    
    def predict_user_preferences(self, user_id: str, top_k: int = 10) -> List[Dict]:
        """Generate project recommendations for user"""
        if user_id not in self.user_index:
            return self._cold_start_recommendations(user_id, top_k)
        
        user_idx = self.user_index[user_id]
        user_embedding = self.user_embeddings[user_idx]
        
        # Calculate similarity with all projects
        similarities = cosine_similarity([user_embedding], self.project_embeddings)[0]
        
        # Apply diversity boost
        diversified_scores = self._apply_diversity_boost(similarities)
        
        # Get top-k recommendations
        top_indices = np.argsort(diversified_scores)[::-1][:top_k]
        
        recommendations = []
        for idx in top_indices:
            project_id = self.project_index_to_id[idx]
            score = diversified_scores[idx]
            confidence = self._calculate_confidence(user_embedding, idx)
            
            recommendations.append({
                'project_id': project_id,
                'score': float(score),
                'confidence': float(confidence),
                'algorithm': 'collaborative_filtering',
                'reasons': self._generate_recommendation_reasons(user_idx, idx)
            })
        
        return recommendations
    
    def _apply_diversity_boost(self, similarities: np.ndarray) -> np.ndarray:
        """Apply diversity algorithm to reduce filter bubble"""
        # Get user's interaction history
        user_categories = self._get_user_category_history()
        
        # Boost underrepresented categories
        category_diversity_multiplier = self._calculate_category_diversity(user_categories)
        
        # Apply diversity boost
        boosted_scores = similarities * (1 + self.diversity_weight * category_diversity_multiplier)
        
        return boosted_scores
```

### 2.2 Content-Based Filtering
```python
# /apps/ml-engine/src/algorithms/content_based.py
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import xgboost as xgb

class ContentBasedRecommender:
    def __init__(self, impact_weight=0.4, diversity_weight=0.3):
        self.tfidf = TfidfVectorizer(max_features=5000, stop_words='english')
        self.xgb_model = xgb.XGBRegressor(random_state=42)
        self.impact_weight = impact_weight
        self.diversity_weight = diversity_weight
        
    def fit(self, project_features: pd.DataFrame, user_feedback: pd.DataFrame):
        """Train content-based model"""
        # 1. Text feature extraction
        project_text = project_features['title'] + ' ' + project_features['description']
        self.text_features = self.tfidf.fit_transform(project_text)
        
        # 2. Train XGBoost for preference learning
        X_train, y_train = self._prepare_training_data(project_features, user_feedback)
        self.xgb_model.fit(X_train, y_train)
        
        return self
    
    def predict_for_user(self, user_id: str, user_profile: Dict, top_k: int = 10) -> List[Dict]:
        """Generate content-based recommendations"""
        # Get user preference vector
        user_preferences = self._extract_user_preferences(user_profile)
        
        # Calculate content similarity scores
        content_scores = self._calculate_content_scores(user_preferences)
        
        # Apply impact alignment
        impact_aligned_scores = self._apply_impact_alignment(content_scores, user_profile)
        
        # Apply diversity boost
        final_scores = self._apply_diversity_boost(impact_aligned_scores, user_profile)
        
        # Generate recommendations
        top_indices = np.argsort(final_scores)[::-1][:top_k]
        
        recommendations = []
        for idx in top_indices:
            project_id = self.project_ids[idx]
            score = final_scores[idx]
            
            recommendations.append({
                'project_id': project_id,
                'score': float(score),
                'confidence': self._calculate_content_confidence(idx, user_preferences),
                'algorithm': 'content_based',
                'reasons': self._generate_content_reasons(idx, user_preferences)
            })
        
        return recommendations
    
    def _apply_impact_alignment(self, scores: np.ndarray, user_profile: Dict) -> np.ndarray:
        """Boost recommendations based on impact alignment"""
        user_impact_preference = user_profile.get('impact_preference', 0.5)
        project_impact_scores = self.project_features['impact_score'].values
        
        # Calculate impact alignment bonus
        impact_bonus = user_impact_preference * project_impact_scores * self.impact_weight
        
        return scores + impact_bonus
```

## Phase 3: FastAPI Integration Layer (2-3 days)

### 3.1 ML Backend Service
```python
# /apps/ml-engine/src/api/recommendation_service.py
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import asyncio
from ..algorithms.collaborative_filtering import CollaborativeRecommender
from ..algorithms.content_based import ContentBasedRecommender
from ..algorithms.hybrid_ensemble import HybridRecommender

app = FastAPI(title="ACT Recommendation Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RecommendationRequest(BaseModel):
    user_id: str
    num_recommendations: int = 10
    algorithm: Optional[str] = "hybrid"  # collaborative, content_based, hybrid
    diversity_boost: Optional[float] = 0.3
    impact_weight: Optional[float] = 0.4

class RecommendationResponse(BaseModel):
    recommendations: List[Dict]
    algorithm_used: str
    confidence: float
    diversity_score: float
    processing_time_ms: int

@app.post("/api/v1/recommendations", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    """Generate personalized project recommendations"""
    start_time = time.time()
    
    try:
        # Load user profile and interaction history
        user_profile = await get_user_profile(request.user_id)
        interaction_history = await get_user_interactions(request.user_id)
        
        # Select recommendation algorithm
        if request.algorithm == "collaborative":
            recommender = app.state.collaborative_model
        elif request.algorithm == "content_based":
            recommender = app.state.content_model
        else:  # hybrid
            recommender = app.state.hybrid_model
        
        # Generate recommendations
        recommendations = await recommender.predict_for_user(
            user_id=request.user_id,
            user_profile=user_profile,
            top_k=request.num_recommendations,
            diversity_boost=request.diversity_boost,
            impact_weight=request.impact_weight
        )
        
        # Calculate metrics
        diversity_score = calculate_diversity_score(recommendations)
        confidence = calculate_overall_confidence(recommendations)
        processing_time = int((time.time() - start_time) * 1000)
        
        # Log recommendation for feedback learning
        await log_recommendation_event(request.user_id, recommendations, request.algorithm)
        
        return RecommendationResponse(
            recommendations=recommendations,
            algorithm_used=request.algorithm,
            confidence=confidence,
            diversity_score=diversity_score,
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation generation failed: {str(e)}")

@app.post("/api/v1/feedback")
async def record_feedback(feedback: RecommendationFeedback):
    """Record user feedback for model improvement"""
    try:
        # Store feedback in database
        await store_recommendation_feedback(feedback)
        
        # Trigger model retraining if threshold reached
        feedback_count = await get_new_feedback_count()
        if feedback_count >= app.state.retrain_threshold:
            background_tasks.add_task(retrain_models)
        
        return {"status": "success", "message": "Feedback recorded"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Feedback recording failed: {str(e)}")

@app.get("/api/v1/model/status")
async def get_model_status():
    """Get current model performance and status"""
    return {
        "collaborative_model": {
            "version": app.state.collaborative_model.version,
            "accuracy": app.state.collaborative_model.last_accuracy,
            "training_date": app.state.collaborative_model.training_date
        },
        "content_model": {
            "version": app.state.content_model.version,
            "accuracy": app.state.content_model.last_accuracy,
            "training_date": app.state.content_model.training_date
        },
        "hybrid_model": {
            "version": app.state.hybrid_model.version,
            "accuracy": app.state.hybrid_model.last_accuracy,
            "training_date": app.state.hybrid_model.training_date
        }
    }

async def retrain_models():
    """Background task to retrain models with new feedback"""
    logger.info("Starting model retraining...")
    
    # Fetch latest training data
    training_data = await fetch_training_data()
    
    # Retrain models
    app.state.collaborative_model.retrain(training_data)
    app.state.content_model.retrain(training_data)
    app.state.hybrid_model.retrain(training_data)
    
    # Update model performance metrics
    await update_model_performance_metrics()
    
    logger.info("Model retraining completed")
```

### 3.2 Frontend Integration Components
```typescript
// /apps/frontend/src/components/ProjectRecommendations.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { RecommendationService } from '../services/recommendationService';

interface Recommendation {
  project_id: number;
  score: number;
  confidence: number;
  algorithm: string;
  reasons: string[];
  project?: Project;
}

export const ProjectRecommendations: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [algorithm, setAlgorithm] = useState<'collaborative' | 'content_based' | 'hybrid'>('hybrid');
  const [diversityBoost, setDiversityBoost] = useState(0.3);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadRecommendations();
    }
  }, [user, algorithm, diversityBoost]);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const response = await RecommendationService.getRecommendations({
        user_id: user.id,
        num_recommendations: 10,
        algorithm,
        diversity_boost: diversityBoost,
        impact_weight: 0.4
      });
      
      // Enrich with project details
      const enrichedRecommendations = await Promise.all(
        response.recommendations.map(async (rec) => ({
          ...rec,
          project: await ProjectService.getProject(rec.project_id)
        }))
      );
      
      setRecommendations(enrichedRecommendations);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (projectId: number, rating: number) => {
    try {
      await RecommendationService.recordFeedback({
        project_id: projectId,
        user_rating: rating,
        feedback_type: 'explicit'
      });
      
      // Refresh recommendations after feedback
      loadRecommendations();
    } catch (error) {
      console.error('Failed to record feedback:', error);
    }
  };

  return (
    <div className="recommendation-container">
      <div className="recommendation-controls">
        <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value as any)}>
          <option value="hybrid">Hybrid (Recommended)</option>
          <option value="collaborative">Community-Based</option>
          <option value="content_based">Content-Based</option>
        </select>
        
        <label>
          Diversity Boost: {diversityBoost}
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={diversityBoost}
            onChange={(e) => setDiversityBoost(parseFloat(e.target.value))}
          />
        </label>
      </div>

      {loading ? (
        <div className="loading-skeleton">Loading recommendations...</div>
      ) : (
        <div className="recommendation-grid">
          {recommendations.map((rec) => (
            <RecommendationCard
              key={rec.project_id}
              recommendation={rec}
              onFeedback={handleFeedback}
            />
          ))}
        </div>
      )}
    </div>
  );
};
```

## Phase 4: A/B Testing & Feedback Loop (2-3 days)

### 4.1 A/B Testing Framework
```python
# /apps/ml-engine/src/testing/ab_testing.py
import random
from typing import Dict, List
from enum import Enum

class ABTestGroup(Enum):
    CONTROL = "control"
    ALGORITHM_A = "algorithm_a"  # Collaborative-heavy
    ALGORITHM_B = "algorithm_b"  # Content-heavy
    ALGORITHM_C = "algorithm_c"  # Impact-optimized

class ABTestManager:
    def __init__(self, test_config: Dict):
        self.test_config = test_config
        self.active_tests = {}
        
    def assign_user_to_group(self, user_id: str, test_name: str) -> ABTestGroup:
        """Consistently assign user to A/B test group"""
        # Use deterministic hash for consistent assignment
        hash_input = f"{user_id}_{test_name}_{self.test_config['test_seed']}"
        hash_value = hash(hash_input) % 100
        
        # Get group thresholds from config
        thresholds = self.test_config[test_name]['group_thresholds']
        
        if hash_value < thresholds['control']:
            return ABTestGroup.CONTROL
        elif hash_value < thresholds['control'] + thresholds['algorithm_a']:
            return ABTestGroup.ALGORITHM_A
        elif hash_value < thresholds['control'] + thresholds['algorithm_a'] + thresholds['algorithm_b']:
            return ABTestGroup.ALGORITHM_B
        else:
            return ABTestGroup.ALGORITHM_C
    
    def get_recommendation_config(self, user_id: str) -> Dict:
        """Get recommendation configuration based on A/B test assignment"""
        test_group = self.assign_user_to_group(user_id, "recommendation_algorithm_test")
        
        config_map = {
            ABTestGroup.CONTROL: {
                "algorithm": "hybrid",
                "collaborative_weight": 0.5,
                "content_weight": 0.5,
                "diversity_boost": 0.3,
                "impact_weight": 0.4
            },
            ABTestGroup.ALGORITHM_A: {
                "algorithm": "hybrid",
                "collaborative_weight": 0.7,
                "content_weight": 0.3,
                "diversity_boost": 0.3,
                "impact_weight": 0.4
            },
            ABTestGroup.ALGORITHM_B: {
                "algorithm": "hybrid", 
                "collaborative_weight": 0.3,
                "content_weight": 0.7,
                "diversity_boost": 0.3,
                "impact_weight": 0.4
            },
            ABTestGroup.ALGORITHM_C: {
                "algorithm": "hybrid",
                "collaborative_weight": 0.4,
                "content_weight": 0.4,
                "diversity_boost": 0.5,
                "impact_weight": 0.6
            }
        }
        
        return config_map[test_group]
    
    async def track_conversion_event(self, user_id: str, event_type: str, project_id: int):
        """Track conversion events for A/B test analysis"""
        test_group = self.assign_user_to_group(user_id, "recommendation_algorithm_test")
        
        conversion_data = {
            "user_id": user_id,
            "test_group": test_group.value,
            "event_type": event_type,  # view, apply, bookmark, share
            "project_id": project_id,
            "timestamp": datetime.utcnow()
        }
        
        await self.store_conversion_event(conversion_data)
```

### 4.2 Performance Monitoring
```python
# /apps/ml-engine/src/monitoring/performance_tracker.py
import numpy as np
from typing import Dict, List

class RecommendationPerformanceTracker:
    def __init__(self, supabase_client):
        self.supabase = supabase_client
        
    async def calculate_algorithm_performance(self, algorithm_version: str, time_period: int = 7) -> Dict:
        """Calculate comprehensive performance metrics"""
        
        # 1. Recommendation Accuracy (CTR, Conversion Rate)
        accuracy_metrics = await self._calculate_accuracy_metrics(algorithm_version, time_period)
        
        # 2. Diversity Metrics
        diversity_metrics = await self._calculate_diversity_metrics(algorithm_version, time_period)
        
        # 3. Impact Alignment Score
        impact_alignment = await self._calculate_impact_alignment(algorithm_version, time_period)
        
        # 4. User Satisfaction (Explicit Feedback)
        satisfaction_metrics = await self._calculate_satisfaction_metrics(algorithm_version, time_period)
        
        # 5. Coverage and Catalog Penetration
        coverage_metrics = await self._calculate_coverage_metrics(algorithm_version, time_period)
        
        return {
            "algorithm_version": algorithm_version,
            "time_period_days": time_period,
            "accuracy": accuracy_metrics,
            "diversity": diversity_metrics,
            "impact_alignment": impact_alignment,
            "user_satisfaction": satisfaction_metrics,
            "coverage": coverage_metrics,
            "overall_score": self._calculate_overall_score(accuracy_metrics, diversity_metrics, impact_alignment, satisfaction_metrics)
        }
    
    async def _calculate_diversity_metrics(self, algorithm_version: str, time_period: int) -> Dict:
        """Calculate recommendation diversity across multiple dimensions"""
        
        # Fetch recommendations from time period
        recommendations = await self._fetch_recommendations(algorithm_version, time_period)
        
        # Category diversity (Herfindahl-Hirschman Index)
        category_diversity = self._calculate_category_diversity(recommendations)
        
        # Geographic diversity
        location_diversity = self._calculate_location_diversity(recommendations)
        
        # Skill diversity
        skill_diversity = self._calculate_skill_diversity(recommendations)
        
        # Impact type diversity
        impact_diversity = self._calculate_impact_diversity(recommendations)
        
        return {
            "category_diversity": category_diversity,
            "location_diversity": location_diversity,
            "skill_diversity": skill_diversity,
            "impact_diversity": impact_diversity,
            "overall_diversity": np.mean([category_diversity, location_diversity, skill_diversity, impact_diversity])
        }
```

## Phase 5: Production Deployment & Monitoring (2 days)

### 5.1 Docker Configuration
```dockerfile
# /apps/ml-engine/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/
COPY models/ ./models/

# Environment variables
ENV PYTHONPATH=/app
ENV MODEL_PATH=/app/models
ENV API_PORT=8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8001/health || exit 1

# Run application
CMD ["uvicorn", "src.api.recommendation_service:app", "--host", "0.0.0.0", "--port", "8001"]
```

### 5.2 Model Deployment Pipeline
```python
# /apps/ml-engine/src/deployment/model_deployer.py
import pickle
import boto3
import joblib
from pathlib import Path

class ModelDeployer:
    def __init__(self, model_storage_path: str, backup_storage: str):
        self.model_path = Path(model_storage_path)
        self.backup_storage = backup_storage
        
    async def deploy_new_model(self, model_artifact: str, model_version: str):
        """Deploy new model version with rollback capability"""
        
        # 1. Validate model artifact
        if not await self._validate_model(model_artifact):
            raise ValueError("Model validation failed")
        
        # 2. Backup current model
        await self._backup_current_model()
        
        # 3. Deploy new model
        await self._deploy_model(model_artifact, model_version)
        
        # 4. Run smoke tests
        if not await self._run_smoke_tests():
            await self._rollback_model()
            raise RuntimeError("Smoke tests failed, rolling back")
        
        # 5. Update model registry
        await self._update_model_registry(model_version)
        
        return {"status": "success", "version": model_version}
    
    async def _validate_model(self, model_artifact: str) -> bool:
        """Validate model artifact before deployment"""
        try:
            # Load model
            model = joblib.load(model_artifact)
            
            # Check required methods exist
            required_methods = ['predict', 'predict_proba']
            for method in required_methods:
                if not hasattr(model, method):
                    return False
            
            # Test prediction on sample data
            sample_data = await self._get_sample_data()
            predictions = model.predict(sample_data)
            
            # Validate prediction format
            if len(predictions) != len(sample_data):
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Model validation failed: {e}")
            return False
```

## Testing Strategy & Quality Assurance

### Unit Tests
```python
# /apps/ml-engine/tests/test_collaborative_filtering.py
import pytest
import pandas as pd
import numpy as np
from src.algorithms.collaborative_filtering import CollaborativeRecommender

class TestCollaborativeRecommender:
    
    @pytest.fixture
    def sample_interaction_data(self):
        return pd.DataFrame({
            'user_id': ['user1', 'user1', 'user2', 'user2', 'user3'],
            'project_id': [1, 2, 1, 3, 2],
            'interaction_weight': [1.0, 0.8, 1.0, 0.9, 0.7],
            'interaction_type': ['apply', 'view', 'apply', 'bookmark', 'view']
        })
    
    def test_model_training(self, sample_interaction_data):
        recommender = CollaborativeRecommender(n_components=2)
        recommender.fit(sample_interaction_data)
        
        assert recommender.user_embeddings is not None
        assert recommender.project_embeddings is not None
        assert recommender.user_embeddings.shape[1] == 2
    
    def test_recommendation_generation(self, sample_interaction_data):
        recommender = CollaborativeRecommender(n_components=2)
        recommender.fit(sample_interaction_data)
        
        recommendations = recommender.predict_user_preferences('user1', top_k=5)
        
        assert len(recommendations) <= 5
        assert all('project_id' in rec for rec in recommendations)
        assert all('score' in rec for rec in recommendations)
        assert all('confidence' in rec for rec in recommendations)
    
    def test_diversity_boost(self, sample_interaction_data):
        recommender = CollaborativeRecommender(n_components=2, diversity_weight=0.5)
        recommender.fit(sample_interaction_data)
        
        diverse_recs = recommender.predict_user_preferences('user1', top_k=3)
        
        # Test that diversity boost affects recommendations
        assert len(diverse_recs) == 3
        
        # Test diversity score calculation
        diversity_score = recommender._calculate_diversity_score(diverse_recs)
        assert 0 <= diversity_score <= 1
```

### Integration Tests  
```python
# /apps/ml-engine/tests/test_api_integration.py
import pytest
from fastapi.testclient import TestClient
from src.api.recommendation_service import app

@pytest.fixture
def test_client():
    return TestClient(app)

def test_recommendation_endpoint(test_client):
    response = test_client.post("/api/v1/recommendations", json={
        "user_id": "test_user_123",
        "num_recommendations": 5,
        "algorithm": "hybrid"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "recommendations" in data
    assert len(data["recommendations"]) <= 5
    assert "algorithm_used" in data
    assert "diversity_score" in data

def test_feedback_endpoint(test_client):
    response = test_client.post("/api/v1/feedback", json={
        "user_id": "test_user_123", 
        "project_id": 1,
        "user_rating": 4,
        "feedback_type": "explicit"
    })
    
    assert response.status_code == 200
    assert response.json()["status"] == "success"
```

## Performance Targets & Success Metrics

### Technical Performance
- **Response Time**: < 200ms for recommendation generation
- **Throughput**: Handle 1000 concurrent users
- **Accuracy**: > 85% user satisfaction rating
- **Diversity Score**: > 0.7 across all dimensions
- **Coverage**: Recommend 80%+ of active projects over 30 days

### Business Impact Metrics
- **Engagement**: 25% increase in project application rate
- **Discovery**: 40% increase in cross-category exploration  
- **Retention**: 15% improvement in user return rate
- **Community Growth**: 20% increase in project collaboration

## Risk Mitigation & Contingency Plans

### Technical Risks
1. **Model Performance Degradation**: Automated monitoring with alert thresholds
2. **Cold Start Problem**: Fallback to popularity-based recommendations
3. **Data Sparsity**: Hybrid approach with content-based fallback
4. **Scalability Issues**: Horizontal scaling with load balancers

### Business Risks  
1. **User Privacy Concerns**: Transparent data usage, opt-out options
2. **Algorithm Bias**: Regular bias audits, diversity requirements
3. **Filter Bubble**: Mandatory diversity constraints in all algorithms
4. **Community Resistance**: Gradual rollout with user education

## Timeline Summary

**Total Duration: 11-16 days**

- **Phase 1**: Data Infrastructure (2-3 days)
- **Phase 2**: ML Implementation (4-5 days)
- **Phase 3**: API Integration (2-3 days)
- **Phase 4**: A/B Testing (2-3 days)
- **Phase 5**: Deployment (2 days)

## Next Steps After Completion

1. **Monitor Performance**: Track all success metrics daily
2. **Iterate on Algorithms**: Improve based on user feedback
3. **Expand Features**: Add collaborative filtering for team formation
4. **Scale Infrastructure**: Optimize for growing user base
5. **Research Advanced Techniques**: Explore deep learning approaches

---

*This Opus-level implementation plan provides comprehensive, step-by-step guidance for building a world-class recommendation engine that aligns with ACT's values of community impact, diversity, and transparency.*