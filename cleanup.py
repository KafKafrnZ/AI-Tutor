import re

req_file = 'backend/requirements.txt'
with open(req_file, 'r') as f:
    lines = f.readlines()

to_remove = {
    'torch', 'transformers', 'sentence-transformers', 'faiss-cpu',
    'huggingface_hub', 'safetensors', 'hf-xet', 'sympy', 'scipy', 'scikit-learn',
    'networkx', 'mpmath', 'joblib', 'threadpoolctl', 'tqdm'
}

new_lines = []
for line in lines:
    pkg = line.split('==')[0].split('>=')[0].strip()
    if pkg in to_remove:
        continue
    if line.startswith('chromadb>='):
        new_lines.append('chromadb==0.5.23\n')
    elif line.startswith('fastembed>='):
        new_lines.append('fastembed==0.3.6\n')
    else:
        new_lines.append(line)

with open(req_file, 'w') as f:
    f.writelines(new_lines)
