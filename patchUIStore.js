const fs = require('fs');
let code = fs.readFileSync('frontend/src/stores/useUIStore.js', 'utf8');

const regex = /addNotification\(notification\) \{[\s\S]*?\},/g;
const replacement = `addNotification(notification) {
    set((state) => ({
      notifications: [{ id: Date.now().toString() + Math.random(), date: new Date(), read: false, ...notification }, ...state.notifications].slice(0, 50),
    }));
  },
  markNotificationsAsRead() {
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, read: true }))
    }));
  },`;

code = code.replace(regex, replacement);
fs.writeFileSync('frontend/src/stores/useUIStore.js', code);
console.log('Fixed useUIStore');
