import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'def _safe_hasattr' not in content and 'hasattr(' in content:
        helper = """
def _safe_hasattr(obj, attr):
    try:
        return getattr(obj, attr) is not None
    except Exception:
        return False
"""
        lines = content.split('\n')
        last_import = 0
        for i, line in enumerate(lines):
            if line.startswith('import ') or line.startswith('from '):
                last_import = i
        lines.insert(last_import + 1, helper)
        content = '\n'.join(lines)
    
    content = re.sub(r'hasattr\(([^,]+),\s*(["\']citizen_profile["\']|["\']officer_profile["\'])\)', r'_safe_hasattr(\1, \2)', content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed {filepath}")

files_to_fix = [
    'api/views.py',
    'api/serializers.py',
    'api/analytics_views.py',
    'accounts/views.py',
    'accounts/serializers.py',
]

for file in files_to_fix:
    path = os.path.join(os.getcwd(), file)
    if os.path.exists(path):
        process_file(path)
