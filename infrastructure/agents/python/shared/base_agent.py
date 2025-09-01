"""
Base agent class for ACT Placemat AI agents.
"""

from abc import ABC, abstractmethod
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4

import structlog
from pydantic import BaseModel

from .config import get_settings
from .models import AgentMessage, AgentResponse, AgentStatus


class AgentType(str, Enum):
    """Types of agents in the system."""
    STRATEGIC_ADVISOR = "strategic_advisor"
    OPERATIONS_MANAGER = "operations_manager"
    COMMUNITY_GUARDIAN = "community_guardian"
    CONTENT_CREATOR = "content_creator"
    RESEARCH_ANALYST = "research_analyst"
    FINANCIAL_INTELLIGENCE = "financial_intelligence"
    RELATIONSHIP_INTELLIGENCE = "relationship_intelligence"


class BaseAgent(ABC):
    """
    Base class for all ACT Placemat AI agents.
    
    Provides common functionality including:
    - Lifecycle management
    - Message handling
    - Error handling and retry logic
    - Logging and monitoring
    - Health checks
    """

    def __init__(
        self,
        agent_id: Optional[str] = None,
        agent_type: Optional[AgentType] = None,
        name: Optional[str] = None,
        description: Optional[str] = None,
    ):
        self.agent_id = agent_id or str(uuid4())
        self.agent_type = agent_type or AgentType.STRATEGIC_ADVISOR
        self.name = name or self.__class__.__name__
        self.description = description or "ACT Placemat AI Agent"
        
        self.settings = get_settings()
        self.logger = structlog.get_logger(__name__).bind(
            agent_id=self.agent_id,
            agent_type=self.agent_type.value,
            agent_name=self.name,
        )
        
        self.status = AgentStatus.INITIALISING
        self.created_at = datetime.utcnow()
        self.last_heartbeat = datetime.utcnow()
        
        self.metrics = {
            "messages_processed": 0,
            "errors": 0,
            "uptime_seconds": 0,
        }

    async def initialize(self) -> None:
        """Initialize the agent."""
        self.logger.info("Initialising agent", name=self.name)
        
        try:
            await self._setup()
            self.status = AgentStatus.READY
            self.logger.info("Agent initialised successfully")
        except Exception as e:
            self.status = AgentStatus.ERROR
            self.logger.error("Agent initialisation failed", error=str(e))
            raise

    async def start(self) -> None:
        """Start the agent."""
        if self.status != AgentStatus.READY:
            await self.initialize()
        
        self.status = AgentStatus.RUNNING
        self.logger.info("Agent started")
        
        try:
            await self._run()
        except Exception as e:
            self.status = AgentStatus.ERROR
            self.logger.error("Agent execution failed", error=str(e))
            raise

    async def stop(self) -> None:
        """Stop the agent."""
        self.logger.info("Stopping agent")
        
        try:
            await self._cleanup()
            self.status = AgentStatus.STOPPED
            self.logger.info("Agent stopped successfully")
        except Exception as e:
            self.status = AgentStatus.ERROR
            self.logger.error("Agent stop failed", error=str(e))
            raise

    async def process_message(self, message: AgentMessage) -> AgentResponse:
        """
        Process an incoming message.
        
        Args:
            message: The message to process
            
        Returns:
            Response from the agent
        """
        self.logger.debug("Processing message", message_id=message.message_id)
        
        try:
            self.metrics["messages_processed"] += 1
            self._update_heartbeat()
            
            response_data = await self._handle_message(message)
            
            response = AgentResponse(
                message_id=str(uuid4()),
                conversation_id=message.conversation_id,
                agent_id=self.agent_id,
                agent_type=self.agent_type.value,
                content=response_data.get("content", ""),
                metadata=response_data.get("metadata", {}),
                success=True,
            )
            
            self.logger.debug("Message processed successfully", 
                            message_id=message.message_id,
                            response_id=response.message_id)
            
            return response
            
        except Exception as e:
            self.metrics["errors"] += 1
            self.logger.error("Message processing failed", 
                            message_id=message.message_id,
                            error=str(e))
            
            return AgentResponse(
                message_id=str(uuid4()),
                conversation_id=message.conversation_id,
                agent_id=self.agent_id,
                agent_type=self.agent_type.value,
                content=f"Error processing message: {str(e)}",
                metadata={"error": True, "error_message": str(e)},
                success=False,
            )

    async def health_check(self) -> Dict[str, Any]:
        """
        Perform a health check.
        
        Returns:
            Health status information
        """
        now = datetime.utcnow()
        uptime = (now - self.created_at).total_seconds()
        
        health = {
            "agent_id": self.agent_id,
            "agent_type": self.agent_type.value,
            "name": self.name,
            "status": self.status.value,
            "uptime_seconds": uptime,
            "last_heartbeat": self.last_heartbeat.isoformat(),
            "metrics": self.metrics.copy(),
            "healthy": self.status in [AgentStatus.READY, AgentStatus.RUNNING],
        }
        
        # Add custom health checks
        custom_health = await self._custom_health_check()
        health.update(custom_health)
        
        return health

    def _update_heartbeat(self) -> None:
        """Update the heartbeat timestamp."""
        self.last_heartbeat = datetime.utcnow()
        self.metrics["uptime_seconds"] = (
            self.last_heartbeat - self.created_at
        ).total_seconds()

    @abstractmethod
    async def _setup(self) -> None:
        """Setup the agent. Override in subclasses."""
        pass

    @abstractmethod
    async def _run(self) -> None:
        """Main agent execution loop. Override in subclasses."""
        pass

    @abstractmethod
    async def _cleanup(self) -> None:
        """Cleanup resources. Override in subclasses."""
        pass

    @abstractmethod
    async def _handle_message(self, message: AgentMessage) -> Dict[str, Any]:
        """
        Handle an incoming message. Override in subclasses.
        
        Args:
            message: The message to handle
            
        Returns:
            Dictionary with 'content' and optional 'metadata' keys
        """
        pass

    async def _custom_health_check(self) -> Dict[str, Any]:
        """
        Perform custom health checks. Override in subclasses.
        
        Returns:
            Additional health check data
        """
        return {}

    def __repr__(self) -> str:
        return (
            f"{self.__class__.__name__}("
            f"id={self.agent_id[:8]}..., "
            f"type={self.agent_type.value}, "
            f"status={self.status.value})"
        )