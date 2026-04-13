import subprocess
import os

commits_map = {
    "security: add CREDENTIALS.md to .gitignore": "hide config file from repository",
    "feat: add Hostinger API PHP files, fix MIME types, update .htaccess for React SPA": "update server files and routing config",
    "feat: add n8n webhook integration for data sync": "connect webhook for data synchronization",
    "Initial commit - Efficience Analytics avec dashboard, comparaison": "first version of Efficience Analytics project",
}

for old, new in commits_map.items():
    print(f"Replacing: {old} -> {new}")