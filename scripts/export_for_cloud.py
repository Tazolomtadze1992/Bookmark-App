#!/usr/bin/env python3
"""Create a private transfer file. Does not upload data or export credentials."""
import base64,json,sqlite3,sys,os
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from x_media import motion_manifest,image_manifest,metadata_manifest
root=Path(__file__).resolve().parents[1]
data=root/'.capture-data'
connection=sqlite3.connect(f'file:{data / "captures.sqlite"}?mode=ro',uri=True)
motion={};images={};metadata={}
for filename in ['x-probe.json','bookmark-media.json']:
 path=data/filename;motion.update(motion_manifest(path));images.update(image_manifest(path));metadata.update(metadata_manifest(path))
references=[]
for raw,image in connection.execute('SELECT record,image FROM captures'):
 item=json.loads(raw)
 if item.get('fixture'):continue
 # Explicit display-field allowlist: no OAuth, API credentials, baseline IDs or private assessments.
 record={key:item.get(key) for key in ['id','url','normalised_url','post_id','kind','title','description','author_observed','created_at','updated_at','has_preview']}
 pid=item.get('post_id')
 references.append({'record':record,'motion':motion.get(pid),'poster':images.get(pid),'metadata':metadata.get(pid,{}),'preview':('data:image/jpeg;base64,'+base64.b64encode(image).decode()) if image else None})
connection.close()
output=data/'cloud-transfer.json'
fd=os.open(output,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
with os.fdopen(fd,'w') as f:json.dump({'format':'bookmark-app-transfer-v1','references':references},f)
print(f'Prepared {len(references)} references in private .capture-data/cloud-transfer.json. Nothing uploaded.')
