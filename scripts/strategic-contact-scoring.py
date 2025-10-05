#!/usr/bin/env python3
"""
Strategic Contact Scoring and Categorization System for Youth Justice Reform
===========================================================================

A sophisticated analysis system that scores and categorizes contacts for
strategic engagement in youth justice reform initiatives.

Author: ACT Placemat Strategic Intelligence
Created: 2025-09-13
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json
import re
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, asdict
from sklearn.ensemble import RandomForestRegressor
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

@dataclass
class ContactScore:
    """Container for all scoring metrics"""
    youth_justice_relevance: float
    influence_score: float
    accessibility_score: float
    timing_score: float
    strategic_value: float
    composite_priority: float
    risk_score: float
    ml_prediction: float = 0.0

@dataclass
class EngagementStrategy:
    """Strategic engagement recommendations"""
    tier: str
    category: str
    approach: List[str]
    campaign_segments: List[str]
    pathway: str
    success_probability: float
    resource_requirement: str
    timing_recommendation: str
    risks: List[str]

class YouthJusticeContactAnalyzer:
    """
    Advanced contact scoring and categorization system for youth justice reform
    """

    def __init__(self, data_directory: str = "/Users/benknight/Code/ACT Placemat/Docs/LinkedIn"):
        self.data_dir = Path(data_directory)
        self.contacts_df = None
        self.ml_model = None
        self.tfidf_vectorizer = None

        # Strategic scoring weights
        self.scoring_weights = {
            'youth_justice_relevance': 0.30,
            'influence_score': 0.25,
            'accessibility_score': 0.20,
            'timing_score': 0.15,
            'strategic_value': 0.10
        }

        # Youth justice keywords for relevance scoring
        self.youth_justice_keywords = {
            'high_relevance': [
                'youth justice', 'juvenile justice', 'youth detention', 'young offenders',
                'children\'s court', 'youth advocacy', 'juvenile reform', 'youth crime',
                'detention centre', 'first nations youth', 'indigenous youth',
                'children\'s ground', 'youth at risk', 'young people in custody'
            ],
            'medium_relevance': [
                'criminal justice', 'justice reform', 'social justice', 'human rights',
                'child protection', 'social work', 'community services', 'legal aid',
                'indigenous affairs', 'first nations', 'aboriginal', 'torres strait',
                'disadvantaged youth', 'at-risk youth', 'youth services'
            ],
            'low_relevance': [
                'policy', 'government', 'public service', 'research', 'academic',
                'social impact', 'community', 'nonprofit', 'philanthropy',
                'media', 'journalism', 'education', 'health'
            ]
        }

        # Influence indicators
        self.influence_indicators = {
            'high_influence': [
                'minister', 'secretary', 'director-general', 'ceo', 'chair',
                'commissioner', 'chief', 'president', 'premier', 'mp',
                'senator', 'judge', 'magistrate', 'professor', 'dean'
            ],
            'medium_influence': [
                'director', 'manager', 'head of', 'principal', 'coordinator',
                'senior', 'lead', 'executive', 'advisor', 'consultant',
                'journalist', 'editor', 'producer', 'researcher'
            ],
            'sector_influence': {
                'government': 3.0,
                'media': 2.5,
                'academic': 2.0,
                'nonprofit': 1.8,
                'legal': 2.2,
                'health': 1.5,
                'corporate': 1.3
            }
        }

    def load_and_consolidate_data(self) -> pd.DataFrame:
        """Load and consolidate contact data from multiple sources"""
        print("🔍 Loading and consolidating contact data...")

        all_contacts = []

        # Load LinkedIn connections
        for connections_file in self.data_dir.rglob("Connections.csv"):
            try:
                df = pd.read_csv(connections_file, skiprows=3)  # Skip the notes section
                df['source'] = 'linkedin_connections'
                df['source_file'] = str(connections_file)
                all_contacts.append(df)
                print(f"✅ Loaded {len(df)} contacts from {connections_file.name}")
            except Exception as e:
                print(f"⚠️ Error loading {connections_file}: {e}")

        # Load strategic contact files
        for strategic_file in self.data_dir.rglob("*Master_Contacts*.csv"):
            try:
                df = pd.read_csv(strategic_file)
                df['source'] = 'strategic_contacts'
                df['source_file'] = str(strategic_file)
                all_contacts.append(df)
                print(f"✅ Loaded {len(df)} strategic contacts from {strategic_file.name}")
            except Exception as e:
                print(f"⚠️ Error loading {strategic_file}: {e}")

        # Load Contained/Notion exports
        for contained_file in self.data_dir.rglob("*peopel*.csv"):
            try:
                df = pd.read_csv(contained_file)
                df['source'] = 'notion_export'
                df['source_file'] = str(contained_file)
                all_contacts.append(df)
                print(f"✅ Loaded {len(df)} contacts from {contained_file.name}")
            except Exception as e:
                print(f"⚠️ Error loading {contained_file}: {e}")

        if not all_contacts:
            raise ValueError("No contact data found!")

        # Consolidate all data - reset indices first to avoid conflicts
        for i, df in enumerate(all_contacts):
            all_contacts[i] = df.reset_index(drop=True)

        consolidated_df = pd.concat(all_contacts, ignore_index=True, sort=False)

        # Standardize column names
        consolidated_df = self._standardize_columns(consolidated_df)

        # Remove duplicates and clean data
        consolidated_df = self._clean_and_deduplicate(consolidated_df)

        print(f"📊 Consolidated {len(consolidated_df)} unique contacts")
        return consolidated_df

    def _standardize_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """Standardize column names across different data sources"""
        column_mapping = {
            'First Name': 'first_name',
            'Last Name': 'last_name',
            'Name': 'full_name',
            'URL': 'linkedin_url',
            'Email Address': 'email',
            'Company': 'organization',
            'Position': 'title',
            'Connected On': 'connected_date',
            'Title/Role': 'title',
            'Organization': 'organization',
            'Sector/Type': 'sector',
            'Location': 'location',
            'Relevance to CONX Campaign': 'campaign_relevance',
            'Public Contact Info': 'contact_info'
        }

        # Apply column mapping
        df = df.rename(columns=column_mapping)

        # Create full_name if not exists
        if 'full_name' not in df.columns and 'first_name' in df.columns and 'last_name' in df.columns:
            df['full_name'] = df['first_name'].fillna('') + ' ' + df['last_name'].fillna('')
            df['full_name'] = df['full_name'].str.strip()

        return df

    def _clean_and_deduplicate(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean and deduplicate contact data"""
        # Fill missing values
        df = df.fillna('')

        # Ensure required columns exist
        if 'full_name' not in df.columns:
            df['full_name'] = ''
        if 'organization' not in df.columns:
            df['organization'] = ''

        # Convert to string
        df['full_name'] = df['full_name'].astype(str)
        df['organization'] = df['organization'].astype(str)

        # Simple deduplication using apply
        df['name_org_key'] = df.apply(
            lambda row: f"{str(row['full_name']).lower()}|{str(row['organization']).lower()}",
            axis=1
        )

        # Remove duplicates, keeping the most complete record
        df['completeness_score'] = df.notna().sum(axis=1)
        df_final = df.sort_values('completeness_score', ascending=False).drop_duplicates('name_org_key')

        # Reset index
        df_final = df_final.reset_index(drop=True)
        df_final['contact_id'] = range(1, len(df_final) + 1)

        return df_final

    def calculate_youth_justice_relevance(self, contact: pd.Series) -> float:
        """Calculate youth justice relevance score (0-100)"""
        score = 0.0

        # Combine text fields for analysis
        text_fields = [
            str(contact.get('title', '')),
            str(contact.get('organization', '')),
            str(contact.get('sector', '')),
            str(contact.get('campaign_relevance', ''))
        ]
        combined_text = ' '.join(text_fields).lower()

        # High relevance keywords
        for keyword in self.youth_justice_keywords['high_relevance']:
            if keyword.lower() in combined_text:
                score += 25

        # Medium relevance keywords
        for keyword in self.youth_justice_keywords['medium_relevance']:
            if keyword.lower() in combined_text:
                score += 10

        # Low relevance keywords
        for keyword in self.youth_justice_keywords['low_relevance']:
            if keyword.lower() in combined_text:
                score += 5

        # Organization-specific bonuses
        org_text = str(contact.get('organization', '')).lower()
        if any(x in org_text for x in ['children\'s ground', 'justice', 'youth', 'juvenile']):
            score += 20

        # Sector-specific scoring
        sector = str(contact.get('sector', '')).lower()
        sector_scores = {
            'campaign leader': 40,
            'campaign partner': 30,
            'global expert': 35,
            'civil society': 20,
            'media': 25,
            'government': 30,
            'academic': 15,
            'legal': 25
        }

        for sector_key, sector_score in sector_scores.items():
            if sector_key in sector:
                score += sector_score

        return min(score, 100)  # Cap at 100

    def calculate_influence_score(self, contact: pd.Series) -> float:
        """Calculate influence score (0-100)"""
        score = 0.0

        title = str(contact.get('title', '')).lower()
        organization = str(contact.get('organization', '')).lower()
        sector = str(contact.get('sector', '')).lower()

        # Position-based influence
        for indicator in self.influence_indicators['high_influence']:
            if indicator in title:
                score += 30

        for indicator in self.influence_indicators['medium_influence']:
            if indicator in title:
                score += 15

        # Sector-based influence multiplier
        for sector_key, multiplier in self.influence_indicators['sector_influence'].items():
            if sector_key in sector or sector_key in organization:
                score *= multiplier
                break

        # Media reach indicators
        media_orgs = ['abc', 'sbs', 'guardian', 'age', 'smh', 'four corners', '60 minutes']
        if any(org in organization for org in media_orgs):
            score += 25

        # Government influence
        gov_indicators = ['minister', 'department', 'government', 'public service']
        if any(indicator in organization for indicator in gov_indicators):
            score += 20

        # Academic influence
        academic_indicators = ['university', 'professor', 'research', 'institute']
        if any(indicator in organization for indicator in academic_indicators):
            score += 15

        return min(score, 100)

    def calculate_accessibility_score(self, contact: pd.Series) -> float:
        """Calculate accessibility score (0-100)"""
        score = 50  # Base score

        # Contact information availability
        if contact.get('email', ''):
            score += 20
        if contact.get('linkedin_url', ''):
            score += 15
        if contact.get('contact_info', ''):
            score += 10

        # Public contact indicators
        contact_info = str(contact.get('contact_info', '')).lower()
        if 'public contact' in contact_info:
            score += 15
        if 'twitter' in contact_info or '@' in contact_info:
            score += 10

        # Organization accessibility
        org = str(contact.get('organization', '')).lower()
        accessible_orgs = ['abc', 'sbs', 'university', 'foundation', 'nonprofit']
        if any(org_type in org for org_type in accessible_orgs):
            score += 10

        # Sector accessibility
        sector = str(contact.get('sector', '')).lower()
        if 'media' in sector:
            score += 15
        elif 'civil society' in sector:
            score += 10
        elif 'government' in sector:
            score -= 10  # Typically less accessible

        return min(score, 100)

    def calculate_timing_score(self, contact: pd.Series) -> float:
        """Calculate timing score based on current engagement opportunities (0-100)"""
        score = 60  # Base score

        # Campaign relevance indicates current timing opportunity
        campaign_rel = str(contact.get('campaign_relevance', '')).lower()
        if 'launch' in campaign_rel or 'co-founder' in campaign_rel:
            score += 30
        elif 'keynote' in campaign_rel or 'speaker' in campaign_rel:
            score += 25
        elif 'partner' in campaign_rel:
            score += 20

        # Media timing opportunities
        sector = str(contact.get('sector', '')).lower()
        if 'media' in sector:
            score += 15  # Media always looking for stories

        # Connection recency (if available)
        connected_date = contact.get('connected_date', '')
        if connected_date and '2025' in str(connected_date):
            score += 10  # Recent connection

        return min(score, 100)

    def calculate_strategic_value(self, contact: pd.Series) -> float:
        """Calculate long-term strategic value (0-100)"""
        score = 0.0

        # Strategic position indicators
        campaign_rel = str(contact.get('campaign_relevance', '')).lower()
        title = str(contact.get('title', '')).lower()
        organization = str(contact.get('organization', '')).lower()

        # High strategic value indicators
        high_value_indicators = [
            'founder', 'ceo', 'director', 'minister', 'professor',
            'editor', 'columnist', 'commissioner', 'chair'
        ]

        for indicator in high_value_indicators:
            if indicator in title or indicator in campaign_rel:
                score += 20

        # Network effect potential
        if 'network' in campaign_rel or 'connects' in campaign_rel:
            score += 15

        # Lived experience value
        if 'lived experience' in campaign_rel:
            score += 25

        # International perspective
        if 'international' in campaign_rel or 'global' in campaign_rel:
            score += 20

        # Innovation and digital transformation
        if 'digital' in campaign_rel or 'innovation' in campaign_rel:
            score += 15

        return min(score, 100)

    def calculate_risk_score(self, contact: pd.Series) -> float:
        """Calculate engagement risk score (0-100, higher = more risky)"""
        risk = 0.0

        # Political risk indicators
        org = str(contact.get('organization', '')).lower()
        if 'liberal' in org or 'labor' in org or 'greens' in org:
            risk += 20  # Partisan political affiliation

        # Controversial topics
        campaign_rel = str(contact.get('campaign_relevance', '')).lower()
        if 'abuse' in campaign_rel or 'expose' in campaign_rel:
            risk += 10  # Sensitive topics

        # Media risk
        if 'investigative' in campaign_rel:
            risk += 15  # Could investigate us too

        # Government risk
        if 'government' in org and 'minister' not in str(contact.get('title', '')).lower():
            risk += 10  # Bureaucratic complications

        return min(risk, 100)

    def categorize_contact(self, scores: ContactScore) -> EngagementStrategy:
        """Categorize contact and determine engagement strategy"""

        # Determine tier based on composite score
        if scores.composite_priority >= 80:
            tier = "Tier 1: Immediate Priority"
        elif scores.composite_priority >= 65:
            tier = "Tier 2: Important Influencers"
        elif scores.composite_priority >= 50:
            tier = "Tier 3: Network Builders"
        else:
            tier = "Tier 4: Long-term Cultivation"

        # Determine strategic category
        if scores.youth_justice_relevance >= 70 and scores.influence_score >= 60:
            category = "Champions"
        elif scores.influence_score >= 70:
            category = "Gatekeepers"
        elif scores.accessibility_score >= 70 and scores.influence_score >= 50:
            category = "Amplifiers"
        elif scores.youth_justice_relevance >= 60:
            category = "Validators"
        elif scores.accessibility_score <= 40 or scores.risk_score >= 60:
            category = "Blockers"
        else:
            category = "Convincibles"

        # Determine engagement approaches
        approaches = []
        if scores.accessibility_score >= 70:
            approaches.append("Direct Approach")
        if scores.influence_score >= 60:
            approaches.extend(["Event Invitation", "Advisory Role"])
        if "media" in category.lower() or scores.influence_score >= 50:
            approaches.append("Media Collaboration")
        if scores.strategic_value >= 60:
            approaches.append("Research Partnership")

        # Determine campaign segments
        segments = []
        if scores.youth_justice_relevance >= 70:
            segments.append("Youth Justice Champions Campaign")
        if scores.influence_score >= 70:
            segments.append("Political Engagement Campaign")
        if "media" in category.lower():
            segments.append("Media Outreach Campaign")
        if scores.strategic_value >= 60:
            segments.append("Academic Alliance Campaign")

        # Determine pathway
        if scores.accessibility_score >= 80:
            pathway = "Direct Contact"
        elif scores.accessibility_score >= 60:
            pathway = "Social Media Engagement"
        elif scores.influence_score >= 70:
            pathway = "Formal Request"
        else:
            pathway = "Warm Introduction"

        # Calculate success probability
        success_prob = min((scores.accessibility_score + scores.timing_score +
                          (100 - scores.risk_score)) / 3, 95)

        # Resource requirement
        if scores.composite_priority >= 80:
            resource_req = "High Touch"
        elif scores.composite_priority >= 60:
            resource_req = "Medium Touch"
        else:
            resource_req = "Low Touch"

        # Timing recommendation
        if scores.timing_score >= 80:
            timing_rec = "Immediate (1-2 weeks)"
        elif scores.timing_score >= 60:
            timing_rec = "Short-term (1-2 months)"
        else:
            timing_rec = "Long-term (3-6 months)"

        # Risk assessment
        risks = []
        if scores.risk_score >= 60:
            risks.append("High reputation risk")
        if scores.risk_score >= 40:
            risks.append("Political sensitivities")
        if scores.accessibility_score <= 40:
            risks.append("Low response probability")

        return EngagementStrategy(
            tier=tier,
            category=category,
            approach=approaches,
            campaign_segments=segments,
            pathway=pathway,
            success_probability=success_prob,
            resource_requirement=resource_req,
            timing_recommendation=timing_rec,
            risks=risks
        )

    def train_ml_model(self, df: pd.DataFrame) -> None:
        """Train ML model for predictive scoring"""
        print("🤖 Training machine learning model...")

        # Prepare features
        features = []
        for idx, contact in df.iterrows():
            feature_vector = [
                len(str(contact.get('title', ''))),
                len(str(contact.get('organization', ''))),
                1 if contact.get('email', '') else 0,
                1 if contact.get('linkedin_url', '') else 0,
                len(str(contact.get('campaign_relevance', ''))),
            ]
            features.append(feature_vector)

        X = np.array(features)

        # Create synthetic target based on manual scoring
        y = []
        for idx, contact in df.iterrows():
            manual_score = (
                self.calculate_youth_justice_relevance(contact) * 0.3 +
                self.calculate_influence_score(contact) * 0.3 +
                self.calculate_accessibility_score(contact) * 0.2 +
                self.calculate_timing_score(contact) * 0.2
            )
            y.append(manual_score)

        # Train model
        self.ml_model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.ml_model.fit(X, y)

        print("✅ ML model trained successfully")

    def generate_analytics_dashboard(self, df: pd.DataFrame, output_dir: str) -> None:
        """Generate comprehensive analytics dashboard"""
        print("📊 Generating analytics dashboard...")

        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)

        # Set style for better visualizations
        try:
            plt.style.use('seaborn-v0_8')
        except:
            try:
                plt.style.use('seaborn')
            except:
                pass  # Use default style
        sns.set_palette("husl")

        # Create figure with subplots
        fig = plt.figure(figsize=(20, 24))

        # 1. Contact Distribution by Tier
        ax1 = plt.subplot(4, 3, 1)
        tier_counts = df['tier'].value_counts()
        plt.pie(tier_counts.values, labels=tier_counts.index, autopct='%1.1f%%')
        plt.title('Contact Distribution by Engagement Tier', fontsize=14, fontweight='bold')

        # 2. Category Distribution
        ax2 = plt.subplot(4, 3, 2)
        category_counts = df['category'].value_counts()
        plt.bar(range(len(category_counts)), category_counts.values)
        plt.xticks(range(len(category_counts)), category_counts.index, rotation=45, ha='right')
        plt.title('Strategic Category Distribution', fontsize=14, fontweight='bold')
        plt.ylabel('Number of Contacts')

        # 3. Composite Score Distribution
        ax3 = plt.subplot(4, 3, 3)
        plt.hist(df['composite_priority'], bins=20, alpha=0.7, edgecolor='black')
        plt.title('Composite Priority Score Distribution', fontsize=14, fontweight='bold')
        plt.xlabel('Score')
        plt.ylabel('Frequency')
        plt.axvline(df['composite_priority'].mean(), color='red', linestyle='--',
                   label=f'Mean: {df["composite_priority"].mean():.1f}')
        plt.legend()

        # 4. Score Correlation Matrix
        ax4 = plt.subplot(4, 3, 4)
        score_columns = ['youth_justice_relevance', 'influence_score', 'accessibility_score',
                        'timing_score', 'strategic_value']
        correlation_matrix = df[score_columns].corr()
        sns.heatmap(correlation_matrix, annot=True, cmap='coolwarm', center=0,
                   square=True, linewidths=0.5)
        plt.title('Score Correlation Matrix', fontsize=14, fontweight='bold')

        # 5. Success Probability vs Priority Score
        ax5 = plt.subplot(4, 3, 5)
        plt.scatter(df['composite_priority'], df['success_probability'],
                   alpha=0.6, s=50)
        plt.xlabel('Composite Priority Score')
        plt.ylabel('Success Probability')
        plt.title('Success Probability vs Priority Score', fontsize=14, fontweight='bold')

        # Add trend line
        z = np.polyfit(df['composite_priority'], df['success_probability'], 1)
        p = np.poly1d(z)
        plt.plot(df['composite_priority'], p(df['composite_priority']),
                "r--", alpha=0.8)

        # 6. Risk Score Distribution
        ax6 = plt.subplot(4, 3, 6)
        plt.hist(df['risk_score'], bins=15, alpha=0.7, color='orange', edgecolor='black')
        plt.title('Risk Score Distribution', fontsize=14, fontweight='bold')
        plt.xlabel('Risk Score')
        plt.ylabel('Frequency')

        # 7. Top Organizations by Contact Count
        ax7 = plt.subplot(4, 3, 7)
        top_orgs = df['organization'].value_counts().head(10)
        plt.barh(range(len(top_orgs)), top_orgs.values)
        plt.yticks(range(len(top_orgs)), top_orgs.index)
        plt.title('Top Organizations by Contact Count', fontsize=14, fontweight='bold')
        plt.xlabel('Number of Contacts')

        # 8. Campaign Segment Distribution
        ax8 = plt.subplot(4, 3, 8)
        # Flatten campaign segments for counting
        all_segments = []
        for segments in df['campaign_segments']:
            if isinstance(segments, list):
                all_segments.extend(segments)
            elif isinstance(segments, str) and segments.strip():
                all_segments.append(segments)

        if all_segments:
            segment_counts = pd.Series(all_segments).value_counts()
            plt.bar(range(len(segment_counts)), segment_counts.values)
            plt.xticks(range(len(segment_counts)), segment_counts.index, rotation=45, ha='right')
            plt.title('Campaign Segment Distribution', fontsize=14, fontweight='bold')
            plt.ylabel('Number of Contacts')

        # 9. Pathway Recommendations
        ax9 = plt.subplot(4, 3, 9)
        pathway_counts = df['pathway'].value_counts()
        plt.pie(pathway_counts.values, labels=pathway_counts.index, autopct='%1.1f%%')
        plt.title('Recommended Engagement Pathways', fontsize=14, fontweight='bold')

        # 10. Resource Requirements
        ax10 = plt.subplot(4, 3, 10)
        resource_counts = df['resource_requirement'].value_counts()
        colors = ['red', 'orange', 'green']
        plt.bar(resource_counts.index, resource_counts.values, color=colors)
        plt.title('Resource Requirements Distribution', fontsize=14, fontweight='bold')
        plt.ylabel('Number of Contacts')

        # 11. Timing Recommendations
        ax11 = plt.subplot(4, 3, 11)
        timing_counts = df['timing_recommendation'].value_counts()
        plt.bar(timing_counts.index, timing_counts.values)
        plt.title('Timing Recommendations', fontsize=14, fontweight='bold')
        plt.ylabel('Number of Contacts')
        plt.xticks(rotation=45, ha='right')

        # 12. Score Comparison by Tier
        ax12 = plt.subplot(4, 3, 12)
        tier_scores = df.groupby('tier')[score_columns].mean()
        tier_scores.plot(kind='bar', ax=ax12)
        plt.title('Average Scores by Engagement Tier', fontsize=14, fontweight='bold')
        plt.ylabel('Average Score')
        plt.xticks(rotation=45, ha='right')
        plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')

        plt.tight_layout()
        plt.savefig(output_path / 'strategic_contact_analytics_dashboard.png',
                   dpi=300, bbox_inches='tight')
        plt.close()

        print(f"✅ Analytics dashboard saved to {output_path / 'strategic_contact_analytics_dashboard.png'}")

    def export_strategic_reports(self, df: pd.DataFrame, output_dir: str) -> None:
        """Export strategic reports and contact lists"""
        print("📋 Exporting strategic reports...")

        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)

        # 1. Master scored dataset
        master_file = output_path / 'strategic_contacts_master_scored.csv'
        df.to_csv(master_file, index=False)
        print(f"✅ Master scored dataset: {master_file}")

        # 2. Tier-based contact lists
        for tier in df['tier'].unique():
            tier_contacts = df[df['tier'] == tier]
            tier_file = output_path / f'contacts_{tier.lower().replace(" ", "_").replace(":", "")}.csv'
            tier_contacts.to_csv(tier_file, index=False)
            print(f"✅ {tier} contacts: {tier_file}")

        # 3. Campaign-specific contact sheets
        campaign_segments = ['Media Outreach Campaign', 'Political Engagement Campaign',
                           'Academic Alliance Campaign', 'Youth Justice Champions Campaign']

        for campaign in campaign_segments:
            campaign_contacts = df[df['campaign_segments'].astype(str).str.contains(campaign, na=False)]
            if not campaign_contacts.empty:
                campaign_file = output_path / f'campaign_{campaign.lower().replace(" ", "_")}.csv'
                campaign_contacts[['full_name', 'title', 'organization', 'email', 'linkedin_url',
                                'composite_priority', 'success_probability', 'pathway',
                                'timing_recommendation']].to_csv(campaign_file, index=False)
                print(f"✅ {campaign} contacts: {campaign_file}")

        # 4. High-priority immediate action list
        immediate_action = df[
            (df['tier'].str.contains('Tier 1')) |
            (df['timing_recommendation'].str.contains('Immediate'))
        ].sort_values('composite_priority', ascending=False)

        immediate_file = output_path / 'immediate_priority_contacts.csv'
        immediate_action[['full_name', 'title', 'organization', 'email', 'linkedin_url',
                         'composite_priority', 'pathway', 'campaign_segments',
                         'contact_info']].to_csv(immediate_file, index=False)
        print(f"✅ Immediate priority contacts: {immediate_file}")

        # 5. Risk assessment report
        high_risk = df[df['risk_score'] >= 40].sort_values('risk_score', ascending=False)
        risk_file = output_path / 'high_risk_contacts_assessment.csv'
        high_risk[['full_name', 'title', 'organization', 'risk_score', 'risks',
                  'category', 'composite_priority']].to_csv(risk_file, index=False)
        print(f"✅ High-risk contacts assessment: {risk_file}")

        # 6. Engagement strategy summary
        strategy_summary = {
            'total_contacts': len(df),
            'tier_distribution': df['tier'].value_counts().to_dict(),
            'category_distribution': df['category'].value_counts().to_dict(),
            'avg_scores': {
                'composite_priority': df['composite_priority'].mean(),
                'youth_justice_relevance': df['youth_justice_relevance'].mean(),
                'influence_score': df['influence_score'].mean(),
                'accessibility_score': df['accessibility_score'].mean(),
                'success_probability': df['success_probability'].mean()
            },
            'high_priority_count': len(df[df['composite_priority'] >= 80]),
            'immediate_action_count': len(df[df['timing_recommendation'].str.contains('Immediate', na=False)]),
            'high_risk_count': len(df[df['risk_score'] >= 60])
        }

        strategy_file = output_path / 'engagement_strategy_summary.json'
        with open(strategy_file, 'w') as f:
            json.dump(strategy_summary, f, indent=2, default=str)
        print(f"✅ Strategy summary: {strategy_file}")

    def process_contacts(self, output_dir: str = "/Users/benknight/Code/ACT Placemat/exports/strategic_analysis") -> pd.DataFrame:
        """Main processing function"""
        print("🚀 Starting Strategic Contact Analysis...")
        print("=" * 60)

        # Load data
        self.contacts_df = self.load_and_consolidate_data()

        # Calculate all scores
        print("\n📊 Calculating scoring metrics...")
        scores_data = []

        for idx, contact in self.contacts_df.iterrows():
            # Calculate individual scores
            youth_justice_score = self.calculate_youth_justice_relevance(contact)
            influence_score = self.calculate_influence_score(contact)
            accessibility_score = self.calculate_accessibility_score(contact)
            timing_score = self.calculate_timing_score(contact)
            strategic_value_score = self.calculate_strategic_value(contact)
            risk_score = self.calculate_risk_score(contact)

            # Calculate composite score
            composite_score = (
                youth_justice_score * self.scoring_weights['youth_justice_relevance'] +
                influence_score * self.scoring_weights['influence_score'] +
                accessibility_score * self.scoring_weights['accessibility_score'] +
                timing_score * self.scoring_weights['timing_score'] +
                strategic_value_score * self.scoring_weights['strategic_value']
            )

            # Create ContactScore object
            contact_scores = ContactScore(
                youth_justice_relevance=youth_justice_score,
                influence_score=influence_score,
                accessibility_score=accessibility_score,
                timing_score=timing_score,
                strategic_value=strategic_value_score,
                composite_priority=composite_score,
                risk_score=risk_score
            )

            # Determine engagement strategy
            strategy = self.categorize_contact(contact_scores)

            # Add scores and strategy to contact record
            contact_data = contact.to_dict()
            contact_data.update(asdict(contact_scores))
            contact_data.update(asdict(strategy))

            scores_data.append(contact_data)

        # Create final DataFrame
        final_df = pd.DataFrame(scores_data)

        # Train ML model for future predictions
        self.train_ml_model(final_df)

        # Generate analytics and reports
        self.generate_analytics_dashboard(final_df, output_dir)
        self.export_strategic_reports(final_df, output_dir)

        # Print summary statistics
        print("\n📈 ANALYSIS SUMMARY")
        print("=" * 60)
        print(f"Total Contacts Analyzed: {len(final_df)}")
        print(f"Average Composite Score: {final_df['composite_priority'].mean():.1f}")
        print(f"High Priority Contacts (80+): {len(final_df[final_df['composite_priority'] >= 80])}")
        print(f"Medium Priority Contacts (60-79): {len(final_df[(final_df['composite_priority'] >= 60) & (final_df['composite_priority'] < 80)])}")
        print(f"Immediate Action Required: {len(final_df[final_df['timing_recommendation'].str.contains('Immediate', na=False)])}")
        print(f"High Risk Contacts: {len(final_df[final_df['risk_score'] >= 60])}")

        print("\n🎯 TOP 10 PRIORITY CONTACTS")
        print("-" * 60)
        top_contacts = final_df.nlargest(10, 'composite_priority')
        for idx, contact in top_contacts.iterrows():
            print(f"{contact['full_name']:<25} | {contact['organization']:<30} | Score: {contact['composite_priority']:.1f}")

        print(f"\n✅ Analysis complete! Results saved to: {output_dir}")

        return final_df

def main():
    """Main execution function"""
    # Initialize analyzer
    analyzer = YouthJusticeContactAnalyzer()

    # Process contacts
    results_df = analyzer.process_contacts()

    print("\n🎉 Strategic Contact Analysis Complete!")
    print("=" * 60)
    print("Next steps:")
    print("1. Review immediate priority contacts list")
    print("2. Plan engagement campaigns based on tier analysis")
    print("3. Monitor risk assessments for sensitive contacts")
    print("4. Use ML predictions for future contact scoring")

    return results_df

if __name__ == "__main__":
    main()