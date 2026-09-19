#!/usr/bin/env python3
"""Deploy the static Space: the app files, SPACE.md as the Space's README.

    python3 tools/deploy.py            # upload
    python3 tools/deploy.py --check    # list what would go

Needs `hf auth login` done once. Evals' JSON stays home (too big, gitignored);
the markdown summaries go.
"""
import sys
from huggingface_hub import HfApi

REPO = "Unt1l1f1nd/brave-new-world"
ALLOW = ["index.html", "style.css", "app.js", "console.js", "mind.js", "world.js", "worker.js", "demos.js",
         "eval.html", "eval.js", "tools/*.mjs", "tools/serve.py", "evals/*.md", "docs/*.jpg", "docs/*.gif", ".gitignore"]

api = HfApi()
if "--check" in sys.argv:
    import glob
    for pat in ALLOW:
        for f in sorted(glob.glob(pat)):
            print(f)
    sys.exit(0)

api.upload_folder(folder_path=".", repo_id=REPO, repo_type="space", allow_patterns=ALLOW,
                  commit_message="the mind wakes on demand, three remembered dreams, doors, a phone")
api.upload_file(path_or_fileobj="SPACE.md", path_in_repo="README.md", repo_id=REPO, repo_type="space",
                commit_message="space readme")
print("deployed to https://huggingface.co/spaces/" + REPO)
print("live at https://unt1l1f1nd-brave-new-world.static.hf.space")
