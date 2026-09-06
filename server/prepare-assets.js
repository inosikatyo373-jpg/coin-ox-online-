const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const partsDir=path.join(root,'.v310-assets');
const outDir=path.join(root,'public','characters');
const outFile=path.join(outDir,'characters_hd_v310.png');
const parts=['part01.b64','part02.b64','part03.b64','part04.b64'];

try{
  const encoded=parts.map(name=>fs.readFileSync(path.join(partsDir,name),'utf8').trim()).join('');
  const png=Buffer.from(encoded,'base64');
  const signature=png.subarray(0,8).toString('hex');
  if(signature!=='89504e470d0a1a0a') throw new Error('decoded asset is not a PNG');
  fs.mkdirSync(outDir,{recursive:true});
  fs.writeFileSync(outFile,png);
  console.log(`[assets] HD character atlas ready: ${png.length} bytes`);
}catch(err){
  console.error('[assets] failed to prepare HD character atlas:',err);
  process.exit(1);
}
