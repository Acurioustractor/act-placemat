/**
 * Admin Module Index
 * 
 * Exports for the Financial Intelligence Admin UI with consent management,
 * attestations, cultural protocols, and audit capabilities
 */

// Types
export * from './types';

// Services
export { ConsentService } from './services/ConsentService';
export { AttestationService } from './services/AttestationService';
export { CulturalProtocolService } from './services/CulturalProtocolService';
export { AuditService } from './services/AuditService';
export { DigitalSigningService } from './services/DigitalSigningService';

// Components
export { ConsentDashboard } from './components/ConsentDashboard';
export { ConsentDetailView } from './components/ConsentDetailView';
export { AttestationManager } from './components/AttestationManager';
export { AuditTrailViewer } from './components/AuditTrailViewer';
export { IndigenousDataControls } from './components/IndigenousDataControls';

// Component props interfaces for external use
export type {
  ConsentDashboardProps,
  ConsentDetailViewProps,
  AttestationManagerProps,
  AuditTrailViewerProps,
  IndigenousDataControlsProps
} from './components/ConsentDashboard';