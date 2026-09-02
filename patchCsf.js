const fs = require('fs');
const filepath = 'mobile/src/screens/ChatDetailScreen.jsx';
let code = fs.readFileSync(filepath, 'utf8');

// 1. Add FileText to lucide-react-native imports
const import_lucide_old = /import \{ ShoppingCart, MoreVertical, CheckCircle, PauseCircle, Users, Ban, Image as ImageIcon, Sparkles, Calendar, ShieldAlert, Clock \} from 'lucide-react-native';/;
const import_lucide_new = `import { ShoppingCart, MoreVertical, CheckCircle, PauseCircle, Users, Ban, Image as ImageIcon, Sparkles, Calendar, ShieldAlert, Clock, FileText } from 'lucide-react-native';`;
code = code.replace(import_lucide_old, import_lucide_new);


// 2. Insert handleExtractCsf before updateChatStatus
const update_status_idx = code.indexOf('const updateChatStatus = async');
if (update_status_idx !== -1) {
    const handleExtract = `
  const handleExtractCsf = async () => {
    setActionMenuVisible(false);
    setIsAiLoading(true);
    Toast.show({ type: 'info', text1: 'Extrayendo CSF', text2: 'La IA está procesando el documento...' });
    try {
      const res = await post(\`/conversations/\${encodeURIComponent(chatId)}/extract-csf\`);
      if (res.ok) {
        Toast.show({ type: 'success', text1: 'CSF Extraída', text2: 'Datos fiscales actualizados' });
      } else {
        Toast.show({ type: 'error', text1: 'Error AI', text2: 'No se pudo procesar la constancia' });
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error de red', text2: 'Fallo de conexión con IA' });
    } finally {
      setIsAiLoading(false);
    }
  };

  `;
    code = code.slice(0, update_status_idx) + handleExtract + code.slice(update_status_idx);
}

// 3. Add the button to Action Menu
const ai_button_old = /<TouchableOpacity style=\{styles\.sheetButton\} onPress=\{handleRequestAi\}>\s*<View style=\{styles\.sheetIconWrapper\}>\s*<Sparkles size=\{22\} color="#f8fafc" strokeWidth=\{1\.5\} \/>\s*<\/View>\s*<Text style=\{styles\.sheetButtonText\}>Sugerencia IA<\/Text>\s*<\/TouchableOpacity>/;

const ai_button_new = `<TouchableOpacity style={styles.sheetButton} onPress={handleRequestAi}>
              <View style={styles.sheetIconWrapper}>
                <Sparkles size={22} color="#f8fafc" strokeWidth={1.5} />
              </View>
              <Text style={styles.sheetButtonText}>Sugerencia IA</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetButton} onPress={handleExtractCsf}>
              <View style={styles.sheetIconWrapper}>
                <FileText size={22} color="#f8fafc" strokeWidth={1.5} />
              </View>
              <Text style={styles.sheetButtonText}>Extraer CSF (IA)</Text>
            </TouchableOpacity>`;

code = code.replace(ai_button_old, ai_button_new);

fs.writeFileSync(filepath, code);
console.log('Patched ChatDetailScreen with CSF extractor.');
