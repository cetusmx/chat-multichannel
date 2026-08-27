const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/ChatView.jsx', 'utf8');

const regex = /const renderCartButton = \(\) => \([\s\S]*?<\/button>\s*\);/m;

const replacement = `const renderCartButton = () => (
    <button
      onClick={() => setIsCartOpen(true)}
      disabled={isPatching || ['CLOSED', 'CLOSED_INACTIVE', 'DISCARDED', 'CLOSED_WON'].includes(activeConv?.status)}
      className={\`relative z-40 bg-gradient-to-r from-sales-cyan-600 to-sales-blue-600 text-white w-14 h-14 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.6)] border border-sales-cyan-400/50 flex flex-col items-center justify-center gap-0.5 \${
        isPatching || ['CLOSED', 'CLOSED_INACTIVE', 'DISCARDED', 'CLOSED_WON'].includes(activeConv?.status) 
        ? 'opacity-50 cursor-not-allowed' 
        : 'cursor-pointer hover:from-sales-cyan-500 hover:to-sales-blue-500 transition-all duration-300 hover:scale-110 active:scale-95'
      }\`}
      title={['CLOSED', 'CLOSED_INACTIVE', 'DISCARDED', 'CLOSED_WON'].includes(activeConv?.status) ? "Carrito deshabilitado en chats cerrados" : "Ver Carrito"}
    >
      {(() => {
        const cData = activeConv?.client?.cartData;
        const items = Array.isArray(cData) ? cData : (cData?.items || []);
        if (items.length > 0) {
          return (
            <span className="text-[12px] font-medium leading-none text-white/90 drop-shadow-sm mt-0.5">
              {items.length}
            </span>
          );
        }
        return <span className="h-[12px] mt-0.5"></span>;
      })()}
      <ShoppingCart className="w-6 h-6 drop-shadow-md" />
    </button>
  );`;

if (code.match(regex)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('frontend/src/pages/ChatView.jsx', code);
  console.log('Fixed cart button aesthetic proportion');
} else {
  console.log('Regex failed');
}
