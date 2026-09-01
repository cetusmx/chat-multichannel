const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/layout/Header.jsx', 'utf8');

code = code.replace(/export default function Header\(\) \{/, `export default function Header() {
  const notifications = useUIStore((state) => state.notifications);
  const markNotificationsAsRead = useUIStore((state) => state.markNotificationsAsRead);
  const unreadCount = notifications.filter(n => !n.read).length;
  const [showNotifications, setShowNotifications] = useState(false);`);

fs.writeFileSync('frontend/src/components/layout/Header.jsx', code);
console.log('Fixed Header exports');
