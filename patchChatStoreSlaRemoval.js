const fs = require('fs');
let code = fs.readFileSync('frontend/src/stores/useChatStore.js', 'utf8');

const regex = /convs = convs\.map\(c => \{[\s\S]*?let isSlaBreached = false;[\s\S]*?let breachType = null;[\s\S]*?if \(\(c\.status === 'PENDING_ASSIGNMENT' \|\| c\.status === 'ESCALATED'\) && slaConfig\.firstResponseMins\) \{[\s\S]*?else if \(c\.status === 'ACTIVE' && slaConfig\.resolutionMins\) \{[\s\S]*?breachType = 'resolution';\s*\}[\s\S]*?\}\s*if \(c\.unreadCount !== undefined\) \{[\s\S]*?return \{ \.\.\.c, isSlaBreached, breachType \};\s*\}\);/m;

const replacement = `convs = convs.map(c => {
          if (c.unreadCount !== undefined) {
            nextUnreadCounts[c.id] = c.unreadCount;
          }
          // isSlaBreached and breachType are now calculated correctly by the backend
          return { ...c };
        });`;

if (code.match(regex)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('frontend/src/stores/useChatStore.js', code);
  console.log('Fixed useChatStore.js to trust backend SLA');
} else {
  console.log('Regex failed');
}
