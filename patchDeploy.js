const fs = require('fs');
const filepath = '.github/workflows/deploy.yml';
let code = fs.readFileSync(filepath, 'utf8');

const old_script = /uses: appleboy\/ssh-action@v1\.2\.2\s*with:\s*host: \$\{\{ secrets\.VPS_HOST \}\}\s*username: \$\{\{ secrets\.VPS_USER \}\}\s*key: \$\{\{ secrets\.VPS_SSH_KEY \}\}\s*script: \|\s*set -e\s*if \[ ! -d "chat-multichannel-sales-ia" \]; then\s*git clone https:\/\/github\.com\/cetusmx\/chat-multichannel\.git chat-multichannel-sales-ia\s*fi\s*cd chat-multichannel-sales-ia\s*git fetch origin main/;

const new_script = `uses: appleboy/ssh-action@v1.2.2
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        with:
          host: \${{ secrets.VPS_HOST }}
          username: \${{ secrets.VPS_USER }}
          key: \${{ secrets.VPS_SSH_KEY }}
          envs: GITHUB_TOKEN
          script: |
            set -e
            if [ ! -d "chat-multichannel-sales-ia" ]; then
              git clone https://x-access-token:\${GITHUB_TOKEN}@github.com/\${{ github.repository }}.git chat-multichannel-sales-ia
            fi
            cd chat-multichannel-sales-ia
            git remote set-url origin https://x-access-token:\${GITHUB_TOKEN}@github.com/\${{ github.repository }}.git
            git fetch origin main`;

if (old_script.test(code)) {
    code = code.replace(old_script, new_script);
    fs.writeFileSync(filepath, code);
    console.log('Patched GitHub Actions deploy.yml.');
} else {
    console.log('Could not find match in deploy.yml.');
}
