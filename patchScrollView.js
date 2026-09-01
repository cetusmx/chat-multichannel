const fs = require('fs');
let code = fs.readFileSync('mobile/src/components/ChatInput.jsx', 'utf8');

if (!code.includes('ScrollView')) {
  code = code.replace(/import \{ View, TextInput, TouchableOpacity, StyleSheet, Text, ActivityIndicator, Platform, Keyboard \} from 'react-native';/, "import { View, TextInput, TouchableOpacity, StyleSheet, Text, ActivityIndicator, Platform, Keyboard, ScrollView } from 'react-native';");
}

const jsxRegex = /<View style=\{styles\.quickRepliesContainer\}>([\s\S]*?)<\/View>/;
const jsxReplacement = `<View style={styles.quickRepliesContainer}>
          <ScrollView keyboardShouldPersistTaps="handled">
            $1
          </ScrollView>
        </View>`;

if (!code.includes('<ScrollView keyboardShouldPersistTaps=')) {
  code = code.replace(jsxRegex, jsxReplacement);
}

fs.writeFileSync('mobile/src/components/ChatInput.jsx', code);
console.log('Added ScrollView to ChatInput');
