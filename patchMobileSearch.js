const fs = require('fs');

const filepath = 'mobile/src/screens/CartModal.jsx';
let code = fs.readFileSync(filepath, 'utf8');

// Fix 1: Require 'familia' and handle search error gracefully with Toast
const searchFnOld = /const handleSearchCatalog = async \(\) => \{\s*setIsSearchingCatalog\(true\);\s*try \{\s*const res = await searchSealMarketCatalog\(searchForm\);\s*setSearchResults\(res\.data \|\| \[\]\);\s*\} catch \(err\) \{\s*Toast\.show\(\{ type: 'error', text1: 'Error buscando en catálogo' \}\);\s*\} finally \{\s*setIsSearchingCatalog\(false\);\s*\}\s*\};/m;
const searchFnNew = `const handleSearchCatalog = async () => {
    if (!searchForm.familia) {
      Toast.show({ type: 'error', text1: 'Selecciona una familia', text2: 'Por favor selecciona una familia principal' });
      return;
    }
    setIsSearchingCatalog(true);
    try {
      const res = await searchSealMarketCatalog(searchForm);
      setSearchResults(res.data || []);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error buscando en catálogo' });
    } finally {
      setIsSearchingCatalog(false);
    }
  };`;
code = code.replace(searchFnOld, searchFnNew);

// Fix 2: Change MIL to MM and reduce text size on STD/MM buttons
// I will just do a direct string replacement for the buttons section.
const buttonsOld = /<View style=\{\{flexDirection: 'row', gap: 8\}\}>\s*<TouchableOpacity\s*style=\{\[styles\.catalogSearchInput, \{flex: 1, padding: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: searchForm\.sist_med === 'std' \? '#06b6d4' : '#1e293b'\}\]\}\s*onPress=\{\(\) => setSearchForm\(\{ \.\.\.searchForm, sist_med: 'std' \}\)\}\s*>\s*<Text style=\{\{color: searchForm\.sist_med === 'std' \? '#fff' : '#94a3b8', fontWeight: 'bold'\}\}>STD<\/Text>\s*<\/TouchableOpacity>\s*<TouchableOpacity\s*style=\{\[styles\.catalogSearchInput, \{flex: 1, padding: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: searchForm\.sist_med === 'mil' \? '#06b6d4' : '#1e293b'\}\]\}\s*onPress=\{\(\) => setSearchForm\(\{ \.\.\.searchForm, sist_med: 'mil' \}\)\}\s*>\s*<Text style=\{\{color: searchForm\.sist_med === 'mil' \? '#fff' : '#94a3b8', fontWeight: 'bold'\}\}>MIL<\/Text>\s*<\/TouchableOpacity>\s*<\/View>/m;

const buttonsNew = `<View style={{flexDirection: 'row', gap: 8}}>
                  <TouchableOpacity 
                    style={[styles.catalogSearchInput, {flex: 1, padding: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: searchForm.sist_med === 'std' ? '#06b6d4' : '#1e293b'}]}
                    onPress={() => setSearchForm({ ...searchForm, sist_med: 'std' })}
                  >
                    <Text style={{color: searchForm.sist_med === 'std' ? '#fff' : '#94a3b8', fontWeight: 'bold', fontSize: 12}}>STD</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.catalogSearchInput, {flex: 1, padding: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: searchForm.sist_med === 'mm' ? '#06b6d4' : '#1e293b'}]}
                    onPress={() => setSearchForm({ ...searchForm, sist_med: 'mm' })}
                  >
                    <Text style={{color: searchForm.sist_med === 'mm' ? '#fff' : '#94a3b8', fontWeight: 'bold', fontSize: 12}}>MM</Text>
                  </TouchableOpacity>
                </View>`;
code = code.replace(buttonsOld, buttonsNew);

fs.writeFileSync(filepath, code);
console.log("Patched mobile search.");
