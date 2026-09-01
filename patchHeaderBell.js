const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/layout/Header.jsx', 'utf8');

if (!code.includes('useUIStore')) {
  code = code.replace(/import useAuthStore/, "import useUIStore from '../../stores/useUIStore.js';\nimport useAuthStore");
}

code = code.replace(/const Header = \(\) => {/g, `const Header = () => {
  const notifications = useUIStore((state) => state.notifications);
  const markNotificationsAsRead = useUIStore((state) => state.markNotificationsAsRead);
  const unreadCount = notifications.filter(n => !n.read).length;
  const [showNotifications, setShowNotifications] = useState(false);`);

const bellRegex = /<button className="relative rounded-lg p-2 text-sales-slate-400 hover:bg-slate-800 hover:text-sales-slate-300 transition-colors">[\s\S]*?<Bell size=\{20\} \/>[\s\S]*?<span[\s\S]*?>[\s\S]*?0[\s\S]*?<\/span>[\s\S]*?<\/button>/;

const bellReplacement = `<div className="relative">
          <button 
            onClick={() => { setShowNotifications(!showNotifications); markNotificationsAsRead(); }}
            className="relative rounded-lg p-2 text-sales-slate-400 hover:bg-slate-800 hover:text-sales-slate-300 transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sales-coral text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-sales-slate-900 border border-sales-slate-800 rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="p-3 border-b border-sales-slate-800 bg-sales-slate-800/50">
                <h3 className="font-medium text-white">Notificaciones</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-sales-slate-400">
                    No tienes notificaciones
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className="p-3 border-b border-sales-slate-800/50 hover:bg-sales-slate-800/30 transition-colors">
                      <div className="text-sm font-medium text-white mb-0.5">{n.title}</div>
                      <div className="text-xs text-sales-slate-400 leading-relaxed">{n.message}</div>
                      <div className="text-[10px] text-sales-slate-500 mt-2 text-right">
                        {new Date(n.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>`;

code = code.replace(bellRegex, bellReplacement);
fs.writeFileSync('frontend/src/components/layout/Header.jsx', code);
console.log('Fixed Header Bell');
