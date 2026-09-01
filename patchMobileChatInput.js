const fs = require('fs');
let code = fs.readFileSync('mobile/src/components/ChatInput.jsx', 'utf8');

// 1. Add api import
if (!code.includes('import { get } from')) {
  code = code.replace(/import \{ theme \} from '\.\.\/utils\/theme';/, "import { theme } from '../utils/theme';\nimport { get, post } from '../services/api';");
}

// 2. Remove MOCK_QUICK_REPLIES
code = code.replace(/const MOCK_QUICK_REPLIES = \[[\s\S]*?\];/m, "");

// 3. Add cannedResponses state and fetching logic
const stateRegex = /const \[filteredReplies, setFilteredReplies\] = useState\(\[\]\);/;
const stateReplacement = `const [filteredReplies, setFilteredReplies] = useState([]);
  const [cannedResponses, setCannedResponses] = useState([]);

  useEffect(() => {
    const fetchCanned = async () => {
      try {
        const res = await get('/canned-responses/my-usage');
        if (res.ok) {
          const data = await res.json();
          setCannedResponses(data.data || []);
        }
      } catch (err) {
        console.error('Error fetching canned responses in mobile:', err);
      }
    };
    fetchCanned();
  }, []);`;
code = code.replace(stateRegex, stateReplacement);

// 4. Update the filtering effect
const effectRegex = /useEffect\(\(\) => \{\s*if \(text\.startsWith\('\/'\)\) \{\s*const q = text\.toLowerCase\(\);\s*const matches = MOCK_QUICK_REPLIES\.filter\(qr => qr\.command\.startsWith\(q\)\);\s*setFilteredReplies\(matches\);\s*\} else \{\s*setFilteredReplies\(\[\]\);\s*\}\s*\}, \[text\]\);/;
const effectReplacement = `useEffect(() => {
    if (text.startsWith('/')) {
      const q = text.slice(1).toLowerCase();
      const matches = cannedResponses.filter(qr => 
        (qr.shortcut && qr.shortcut.toLowerCase().includes(q)) || 
        qr.title.toLowerCase().includes(q)
      );
      setFilteredReplies(matches);
    } else {
      setFilteredReplies([]);
    }
  }, [text, cannedResponses]);`;
code = code.replace(effectRegex, effectReplacement);

// 5. Update selectQuickReply
const selectRegex = /const selectQuickReply = \(reply\) => \{\s*setText\(reply\.text\);\s*setFilteredReplies\(\[\]\);\s*\};/;
const selectReplacement = `const selectQuickReply = async (reply) => {
    setText(reply.content);
    setFilteredReplies([]);
    try {
      await post(\`/canned-responses/\${reply.id}/use\`);
    } catch (e) {
      // ignore
    }
    if (inputRef.current) inputRef.current.focus();
  };`;
code = code.replace(selectRegex, selectReplacement);

// 6. Update the JSX for rendering
const jsxRegex = /\{filteredReplies\.map\(\(qr\) => \(\s*<TouchableOpacity key=\{qr\.command\} style=\{styles\.quickReplyItem\} onPress=\{\(\) => selectQuickReply\(qr\)\}>\s*<Text style=\{styles\.qrCommand\}>\{qr\.command\}<\/Text>\s*<Text style=\{styles\.qrText\} numberOfLines=\{1\}>\{qr\.text\}<\/Text>\s*<\/TouchableOpacity>\s*\)\)\}/;
const jsxReplacement = `{filteredReplies.map((qr) => (
            <TouchableOpacity key={qr.id} style={styles.quickReplyItem} onPress={() => selectQuickReply(qr)}>
              <Text style={styles.qrCommand}>/{qr.shortcut || qr.title}</Text>
              <Text style={styles.qrText} numberOfLines={1}>{qr.content}</Text>
            </TouchableOpacity>
          ))}`;
code = code.replace(jsxRegex, jsxReplacement);

// 7. Update styles.quickRepliesContainer
const styleRegex = /quickRepliesContainer: \{\s*backgroundColor: '#fff',\s*borderTopLeftRadius: 10,\s*borderTopRightRadius: 10,\s*maxHeight: 150,\s*overflow: 'hidden',\s*elevation: 3,\s*shadowColor: '#000',\s*shadowOpacity: 0\.1,\s*shadowOffset: \{ width: 0, height: -2 \},\s*shadowRadius: 5,\s*\},/;
const styleReplacement = `quickRepliesContainer: {
      position: 'absolute',
      bottom: '100%',
      left: 0,
      right: 0,
      backgroundColor: '#fff',
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      maxHeight: 200,
      elevation: 4,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: -3 },
      shadowRadius: 5,
      zIndex: 10, // Ensure it's on top
    },`;
code = code.replace(styleRegex, styleReplacement);

fs.writeFileSync('mobile/src/components/ChatInput.jsx', code);
console.log('Patched ChatInput for mobile');
