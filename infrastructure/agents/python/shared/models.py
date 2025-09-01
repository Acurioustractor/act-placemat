"""
Pydantic models for ACT Placemat agents.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class AgentStatus(str, Enum):
    """Agent status enumeration."""
    INITIALISING = "initialising"
    READY = "ready"  
    RUNNING = "running"
    PAUSED = "paused"
    STOPPING = "stopping"
    STOPPED = "stopped"
    ERROR = "error"


class MessageType(str, Enum):
    """Message type enumeration."""
    QUERY = "query"
    COMMAND = "command"
    EVENT = "event"
    RESPONSE = "response"
    STATUS = "status"


class Priority(str, Enum):
    """Message priority enumeration."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class AgentMessage(BaseModel):
    """Message sent to an agent."""
    message_id: str = Field(default_factory=lambda: str(uuid4()))
    conversation_id: str
    sender_id: str
    recipient_id: Optional[str] = None
    message_type: MessageType = MessageType.QUERY
    priority: Priority = Priority.MEDIUM
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None


class AgentResponse(BaseModel):
    """Response from an agent."""
    message_id: str = Field(default_factory=lambda: str(uuid4()))
    conversation_id: str
    agent_id: str
    agent_type: str
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    success: bool = True
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    processing_time_ms: Optional[float] = None


class AgentInfo(BaseModel):
    """Agent information model."""
    agent_id: str
    agent_type: str
    name: str
    description: str
    status: AgentStatus
    capabilities: List[str] = Field(default_factory=list)
    created_at: datetime
    last_heartbeat: datetime
    metrics: Dict[str, Any] = Field(default_factory=dict)


class TaskRequest(BaseModel):
    """Request to execute a task."""
    task_id: str = Field(default_factory=lambda: str(uuid4()))
    task_type: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    priority: Priority = Priority.MEDIUM
    timeout_seconds: Optional[int] = None
    retry_count: int = 0
    max_retries: int = 3
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TaskResult(BaseModel):
    """Result of a task execution."""
    task_id: str
    success: bool
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    execution_time_ms: float
    completed_at: datetime = Field(default_factory=datetime.utcnow)


class HealthCheck(BaseModel):
    """Health check response."""
    agent_id: str
    agent_type: str
    name: str
    status: AgentStatus
    healthy: bool
    uptime_seconds: float
    last_heartbeat: datetime
    metrics: Dict[str, Any]
    details: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AgentConfiguration(BaseModel):
    """Agent configuration model."""
    agent_type: str
    name: str
    description: str
    enabled: bool = True
    parameters: Dict[str, Any] = Field(default_factory=dict)
    resource_limits: Dict[str, Any] = Field(default_factory=dict)
    scheduling: Dict[str, Any] = Field(default_factory=dict)


class ConversationContext(BaseModel):
    """Conversation context for maintaining state."""
    conversation_id: str
    user_id: Optional[str] = None
    project_id: Optional[str] = None
    story_id: Optional[str] = None
    context_data: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None


class SystemEvent(BaseModel):
    """System event model."""
    event_id: str = Field(default_factory=lambda: str(uuid4()))
    event_type: str
    source: str
    data: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    severity: str = "info"  # info, warning, error, critical


class MetricPoint(BaseModel):
    """Metric data point."""
    name: str
    value: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    tags: Dict[str, str] = Field(default_factory=dict)
    agent_id: Optional[str] = None


class LogEntry(BaseModel):
    """Structured log entry."""
    level: str
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    agent_id: Optional[str] = None
    context: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None
    stack_trace: Optional[str] = None