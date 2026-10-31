import zipfile,os,sys,json
G,out=sys.argv[1],sys.argv[2]
skip={'tools','.git','.vscode','node_modules'}
n=0
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
  for name,base in (('CoopTown_BP',G+'/development_behavior_packs/CoopTown_BP'),('CoopTown_RP',G+'/development_resource_packs/CoopTown_RP')):
    for r,ds,fs in os.walk(base):
      ds[:]=[d for d in ds if d not in skip]
      for f in fs:
        p=os.path.join(r,f);z.write(p,name+'/'+os.path.relpath(p,base).replace(os.sep,'/'));n+=1
    print(name,json.load(open(base+'/manifest.json',encoding='utf8'))['header']['version'])
print(n,'files',os.path.getsize(out)//1024,'KB')
