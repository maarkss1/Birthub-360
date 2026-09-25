import express from 'express';
import authRoutes from './auth.routes';
import workflowRoutes from './workflow.routes';
import callLogRoutes from './callLog.routes';
import onboardingRoutes from './onboarding.routes';
import brandColorRoutes from './brandColor.routes';
import voiceRuntimeRoutes from './voiceRuntime.routes';
import voiceOutboundRoutes from './voiceOutbound.routes';
import metricsRoutes from './metrics.routes';
import sessionRoutes from './session.routes';
import settingsRoutes from './settings.routes';
import agentRoutes from './agent.routes';
import organizationRoutes from './organization.routes';
import userRoutes from './user.routes';
import aiRoutes from './ai.routes';
import observabilityRoutes from './observability.routes';
import auditLogRoutes from './auditLog.routes';
import billingRoutes from './billing.routes';
import notificationRoutes from './notification.routes';
import apiKeyRoutes from './apiKey.routes';
import webhookEndpointRoutes from './webhookEndpoint.routes';
// atlasgrRoutes is intentionally NOT mounted here — it is a server-to-server webhook
// (authenticated by shared secret, not by session cookie) and is mounted directly in server.ts
// before csrfProtection, the same way telephonyRoutes is. See server.ts for the rationale.

const router = express.Router();

router.use(authRoutes);
router.use(workflowRoutes);
router.use(callLogRoutes);
router.use(onboardingRoutes);
router.use(brandColorRoutes);
router.use(voiceRuntimeRoutes);
router.use(voiceOutboundRoutes);
router.use(metricsRoutes);
router.use(sessionRoutes);
router.use(settingsRoutes);
router.use(agentRoutes);
router.use(organizationRoutes);
router.use(userRoutes);
router.use(aiRoutes);
router.use(observabilityRoutes);
router.use(auditLogRoutes);
router.use(billingRoutes);
router.use(notificationRoutes);
router.use(apiKeyRoutes);
router.use(webhookEndpointRoutes);

export default router;
