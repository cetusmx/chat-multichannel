const fs = require('fs');
let code = fs.readFileSync('backend/src/routes/chat.routes.js', 'utf8');

const regex = /const conversations = await prisma\.conversation\.findMany\(\{[\s\S]*?res\.json\(\{ data: conversations \}\);/m;

const replacement = `const conversations = await prisma.conversation.findMany({
        where: whereClause,
        include: { client: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 }, tenant: { select: { businessHours: true, isSlaEnabled: true } } },
        orderBy: { lastMessageAt: 'desc' }
      });

      // Calculate SLA on the fly
      const { getBusinessMinutesElapsed } = require('../utils/date');
      const slaService = require('../services/sla.service');
      const slaConfig = await slaService.getSlaConfig(req.user.tenantId);
      const now = Date.now();

      const enriched = conversations.map(conv => {
        let isSlaBreached = false;
        let breachType = null;
        
        if (conv.tenant?.isSlaEnabled !== false) {
          let metric = null;
          let thresholdMins = 0;
          let startTime = null;

          if (conv.status === 'PENDING_ASSIGNMENT' || conv.status === 'ESCALATED') {
            metric = 'firstResponse';
            thresholdMins = slaConfig.firstResponseMins;
            startTime = conv.lastMessageAt || conv.createdAt;
          } else if (conv.status === 'ACTIVE') {
            metric = 'resolution';
            thresholdMins = slaConfig.resolutionMins;
            startTime = conv.createdAt;
          }

          if (metric && startTime) {
            const startTimeMs = new Date(startTime).getTime();
            let elapsedMins = getBusinessMinutesElapsed(startTimeMs, now, conv.tenant.businessHours);
            if (metric === 'resolution' && conv.slaPausedMins > 0) {
              elapsedMins = Math.max(0, elapsedMins - conv.slaPausedMins);
            }
            if (elapsedMins > thresholdMins) {
              isSlaBreached = true;
              breachType = metric;
            }
          }
        }
        
        // Remove tenant object to keep payload clean
        const { tenant, ...convData } = conv;
        return { ...convData, isSlaBreached, breachType };
      });

      res.json({ data: enriched });`;

if (code.match(regex)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('backend/src/routes/chat.routes.js', code);
  console.log('Fixed GET /conversations SLA calculation');
} else {
  console.log('Regex failed');
}
