const fs = require('fs');
let code = fs.readFileSync('backend/src/services/sla.service.js', 'utf8');

const regex = /await tx\.conversation\.update\(\{[\s\S]*?where: \{ id: conversationId \},[\s\S]*?data: \{[\s\S]*?status: 'ACTIVE',[\s\S]*?statusUpdatedAt: new Date\(\),[\s\S]*?onHoldReason: null,[\s\S]*?onHoldExpiration: null,[\s\S]*?scheduledAt: null,[\s\S]*?lastMessageAt: new Date\(\)[\s\S]*?\}[\s\S]*?\}\);/m;

const replacement = `const now = new Date();
      let pausedMins = 0;
      try {
        const { getBusinessMinutesElapsed } = require('../utils/date');
        const statusUpdatedTime = new Date(conversation.statusUpdatedAt).getTime();
        // We need tenant for business hours, fetch it if not present
        const convWithTenant = await tx.conversation.findUnique({ where: { id: conversationId }, include: { tenant: true } });
        if (convWithTenant?.tenant?.businessHours) {
          pausedMins = getBusinessMinutesElapsed(statusUpdatedTime, now, convWithTenant.tenant.businessHours);
        } else {
          pausedMins = Math.floor((now.getTime() - statusUpdatedTime) / 60000);
        }
      } catch(e) {
        console.error('[SLA-SERVICE] Error calculating paused SLA minutes:', e);
      }

      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          status: 'ACTIVE',
          statusUpdatedAt: now,
          onHoldReason: null,
          onHoldExpiration: null,
          scheduledAt: null,
          lastMessageAt: now,
          slaPausedMins: { increment: Math.floor(Math.max(0, pausedMins)) }
        }
      });`;

if (code.match(regex)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('backend/src/services/sla.service.js', code);
  console.log('Fixed SLA Service transitionToActive increment');
} else {
  console.log('Regex failed');
}
