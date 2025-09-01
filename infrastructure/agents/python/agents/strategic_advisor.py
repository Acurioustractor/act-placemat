"""
Strategic Advisor Agent for ACT Placemat.

Provides strategic guidance, trend analysis, and decision support
for community initiatives and platform development.
"""

import asyncio
from typing import Any, Dict, List, Optional

from anthropic import AsyncAnthropic
from openai import AsyncOpenAI

from shared.base_agent import BaseAgent, AgentType
from shared.models import AgentMessage


class StrategicAdvisorAgent(BaseAgent):
    """
    Strategic Advisor Agent for high-level guidance and analysis.
    
    Capabilities:
    - Strategic planning and roadmap development
    - Trend analysis and market research
    - Risk assessment and mitigation strategies
    - Community growth recommendations
    - Platform optimisation suggestions
    """

    def __init__(self):
        super().__init__(
            agent_type=AgentType.STRATEGIC_ADVISOR,
            name="Strategic Advisor",
            description="AI agent providing strategic guidance and decision support for ACT Placemat community initiatives"
        )
        
        self.openai_client: Optional[AsyncOpenAI] = None
        self.anthropic_client: Optional[AsyncAnthropic] = None
        
        self.capabilities = [
            "strategic_planning",
            "trend_analysis", 
            "risk_assessment",
            "community_growth",
            "platform_optimisation",
            "market_research",
            "decision_support",
        ]

    async def _setup(self) -> None:
        """Setup the Strategic Advisor agent."""
        self.logger.info("Setting up Strategic Advisor agent")
        
        # Initialize AI clients
        if self.settings.openai_api_key:
            self.openai_client = AsyncOpenAI(api_key=self.settings.openai_api_key)
        
        if self.settings.anthropic_api_key:
            self.anthropic_client = AsyncAnthropic(api_key=self.settings.anthropic_api_key)
        
        if not self.openai_client and not self.anthropic_client:
            raise ValueError("No AI provider API keys configured")

    async def _run(self) -> None:
        """Main execution loop for the Strategic Advisor."""
        self.logger.info("Strategic Advisor agent running")
        
        # In a real implementation, this would listen for messages
        # from a message queue, webhook, or other communication mechanism
        while self.status.value == "running":
            await asyncio.sleep(1)  # Prevent busy waiting
            
            # Perform periodic tasks
            await self._periodic_tasks()

    async def _cleanup(self) -> None:
        """Cleanup resources."""
        self.logger.info("Cleaning up Strategic Advisor agent")
        
        if self.openai_client:
            await self.openai_client.close()
        
        if self.anthropic_client:
            await self.anthropic_client.close()

    async def _handle_message(self, message: AgentMessage) -> Dict[str, Any]:
        """
        Handle incoming messages for strategic analysis.
        
        Args:
            message: The message to process
            
        Returns:
            Response content and metadata
        """
        content = message.content.lower()
        metadata = message.metadata
        
        # Route to appropriate handler based on message content or metadata
        if "strategy" in content or "strategic" in content:
            return await self._handle_strategic_query(message)
        elif "trend" in content or "analysis" in content:
            return await self._handle_trend_analysis(message)
        elif "risk" in content or "assessment" in content:
            return await self._handle_risk_assessment(message)
        elif "growth" in content or "community" in content:
            return await self._handle_community_growth(message)
        elif "platform" in content or "optimisation" in content:
            return await self._handle_platform_optimisation(message)
        else:
            return await self._handle_general_query(message)

    async def _handle_strategic_query(self, message: AgentMessage) -> Dict[str, Any]:
        """Handle strategic planning queries."""
        system_prompt = """You are a Strategic Advisor for ACT Placemat, a community-owned platform for storytelling and social impact projects in Australia. 

Your role is to provide strategic guidance that:
- Aligns with community ownership and anti-extraction values
- Promotes social impact and community wellbeing
- Considers Australian context and cultural sensitivities
- Encourages sustainable growth and engagement
- Supports storytelling and authentic community connections

Respond with actionable strategic recommendations in Australian English."""

        if self.anthropic_client:
            response = await self._call_anthropic(system_prompt, message.content)
        elif self.openai_client:
            response = await self._call_openai(system_prompt, message.content)
        else:
            response = "Strategic analysis capability temporarily unavailable."

        return {
            "content": response,
            "metadata": {
                "type": "strategic_guidance",
                "capabilities_used": ["strategic_planning"],
                "australian_context": True,
            }
        }

    async def _handle_trend_analysis(self, message: AgentMessage) -> Dict[str, Any]:
        """Handle trend analysis requests."""
        system_prompt = """You are conducting trend analysis for ACT Placemat, focusing on:

- Australian community technology trends
- Social impact and community engagement patterns  
- Storytelling and media consumption habits
- Open-source and community-owned platform trends
- Sustainability and environmental consciousness movements

Provide data-driven insights with specific recommendations for community platform development."""

        if self.anthropic_client:
            response = await self._call_anthropic(system_prompt, message.content)
        elif self.openai_client:
            response = await self._call_openai(system_prompt, message.content)
        else:
            response = "Trend analysis capability temporarily unavailable."

        return {
            "content": response,
            "metadata": {
                "type": "trend_analysis",
                "capabilities_used": ["trend_analysis", "market_research"],
                "focus_areas": ["community_tech", "social_impact", "storytelling"],
            }
        }

    async def _handle_risk_assessment(self, message: AgentMessage) -> Dict[str, Any]:
        """Handle risk assessment requests."""
        system_prompt = """You are conducting risk assessment for ACT Placemat community platform.

Consider these risk categories:
- Community governance and decision-making risks
- Platform sustainability and funding risks  
- Technology and security risks
- Legal and regulatory compliance (Australian context)
- Community engagement and adoption risks
- Content moderation and safety risks

Provide balanced risk analysis with mitigation strategies that maintain community ownership principles."""

        if self.anthropic_client:
            response = await self._call_anthropic(system_prompt, message.content)
        elif self.openai_client:
            response = await self._call_openai(system_prompt, message.content)
        else:
            response = "Risk assessment capability temporarily unavailable."

        return {
            "content": response,
            "metadata": {
                "type": "risk_assessment", 
                "capabilities_used": ["risk_assessment", "decision_support"],
                "risk_categories": ["governance", "sustainability", "technology", "legal", "community"],
            }
        }

    async def _handle_community_growth(self, message: AgentMessage) -> Dict[str, Any]:
        """Handle community growth strategy requests."""
        system_prompt = """You are developing community growth strategies for ACT Placemat.

Focus on:
- Authentic community building (not growth hacking)
- Value-aligned member attraction and retention
- Regional Australian community engagement
- Storytelling and project showcase optimization
- Partnership and collaboration opportunities
- Sustainable engagement models

Recommend strategies that prioritise community value over metrics."""

        if self.anthropic_client:
            response = await self._call_anthropic(system_prompt, message.content)
        elif self.openai_client:
            response = await self._call_openai(system_prompt, message.content)
        else:
            response = "Community growth analysis capability temporarily unavailable."

        return {
            "content": response,
            "metadata": {
                "type": "community_growth",
                "capabilities_used": ["community_growth", "strategic_planning"],
                "focus": ["authentic_growth", "regional_engagement", "value_alignment"],
            }
        }

    async def _handle_platform_optimisation(self, message: AgentMessage) -> Dict[str, Any]:
        """Handle platform optimisation requests."""
        system_prompt = """You are optimising ACT Placemat platform for better community outcomes.

Consider:
- User experience and accessibility improvements
- Content discovery and storytelling features
- Community interaction and collaboration tools
- Performance and technical optimisations
- Mobile and regional connectivity considerations
- Integration opportunities with existing community tools

Recommend improvements that enhance community value and engagement."""

        if self.anthropic_client:
            response = await self._call_anthropic(system_prompt, message.content)
        elif self.openai_client:
            response = await self._call_openai(system_prompt, message.content)
        else:
            response = "Platform optimisation analysis capability temporarily unavailable."

        return {
            "content": response,
            "metadata": {
                "type": "platform_optimisation",
                "capabilities_used": ["platform_optimisation", "decision_support"],
                "areas": ["user_experience", "content_discovery", "community_tools", "performance"],
            }
        }

    async def _handle_general_query(self, message: AgentMessage) -> Dict[str, Any]:
        """Handle general strategic queries."""
        system_prompt = """You are the Strategic Advisor for ACT Placemat, a community-owned storytelling and social impact platform in Australia.

Provide thoughtful strategic guidance that aligns with:
- Community ownership and anti-extraction values
- Australian cultural context and sensitivities  
- Social impact and community wellbeing focus
- Sustainable and authentic growth approaches
- Open-source and collaborative principles

Respond in Australian English with practical, actionable advice."""

        if self.anthropic_client:
            response = await self._call_anthropic(system_prompt, message.content)
        elif self.openai_client:
            response = await self._call_openai(system_prompt, message.content)
        else:
            response = "I understand you're looking for strategic guidance. While I'm temporarily unable to provide detailed analysis, I recommend focusing on community value, authentic engagement, and sustainable growth practices that align with ACT Placemat's community-owned mission."

        return {
            "content": response,
            "metadata": {
                "type": "general_strategic_guidance",
                "capabilities_used": ["decision_support", "strategic_planning"],
            }
        }

    async def _call_anthropic(self, system_prompt: str, user_message: str) -> str:
        """Make a call to Anthropic's API."""
        try:
            message = await self.anthropic_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2000,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}]
            )
            return message.content[0].text
        except Exception as e:
            self.logger.error("Anthropic API call failed", error=str(e))
            return f"I apologise, but I'm having technical difficulties with my analysis capabilities. Please try again shortly."

    async def _call_openai(self, system_prompt: str, user_message: str) -> str:
        """Make a call to OpenAI's API."""
        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                max_tokens=2000,
                temperature=0.7,
            )
            return response.choices[0].message.content
        except Exception as e:
            self.logger.error("OpenAI API call failed", error=str(e))
            return f"I apologise, but I'm having technical difficulties with my analysis capabilities. Please try again shortly."

    async def _periodic_tasks(self) -> None:
        """Perform periodic maintenance tasks."""
        # Update heartbeat
        self._update_heartbeat()
        
        # Perform any scheduled analysis or monitoring
        # This would typically include:
        # - Monitoring community metrics
        # - Analyzing platform usage trends
        # - Preparing regular strategic reports
        
        await asyncio.sleep(30)  # Run periodic tasks every 30 seconds

    async def _custom_health_check(self) -> Dict[str, Any]:
        """Perform custom health checks."""
        health_data = {}
        
        # Check AI provider connectivity
        if self.anthropic_client:
            health_data["anthropic_available"] = True
        if self.openai_client:
            health_data["openai_available"] = True
        
        health_data["capabilities"] = self.capabilities
        health_data["ready_for_strategic_analysis"] = bool(
            self.anthropic_client or self.openai_client
        )
        
        return health_data


# Entry point for running as a standalone service
async def main():
    """Run the Strategic Advisor agent."""
    agent = StrategicAdvisorAgent()
    
    try:
        await agent.initialize()
        await agent.start()
    except KeyboardInterrupt:
        print("Shutting down Strategic Advisor agent...")
        await agent.stop()
    except Exception as e:
        print(f"Agent failed: {e}")
        await agent.stop()


if __name__ == "__main__":
    asyncio.run(main())