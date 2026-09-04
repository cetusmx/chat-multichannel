const fs = require('fs');
const filepath = 'frontend/src/features/users/UserListPage.jsx';
let code = fs.readFileSync(filepath, 'utf8');

const old_init = /if \(userBody\.data\.groups\) \{\s*setGroupIds\(userBody\.data\.groups\.map\(\(g\) => g\.id\)\);\s*\}/m;
const new_init = `if (userBody.data.groups) {
          if (userBody.data.role === 'VENDOR' && userBody.data.groups.length > 0) {
            setGroupIds([userBody.data.groups[0].id]);
          } else {
            setGroupIds(userBody.data.groups.map((g) => g.id));
          }
        }`;

if (old_init.test(code)) {
    code = code.replace(old_init, new_init);
    fs.writeFileSync(filepath, code);
    console.log('Patched frontend to sanitize groupIds for vendors.');
} else {
    console.log('Could not find match in UserListPage.');
}
