const fs=require('fs');
const path=require('path');
const sharp=require('sharp');

const root=path.join(__dirname,'..');
const charactersDir=path.join(root,'public','characters');
const atlasPath=path.join(charactersDir,'characters_hd.png');
const hdDir=path.join(charactersDir,'hd');

const atlasCharacters={
  zombie:[0,0],
  merchant:[1,0],
  gunslinger:[2,0],
  swordswoman:[0,1],
  random:[1,1],
  robot:[2,1],
  dog:[0,2],
  mage:[1,2],
  doctor:[2,2]
};

async function resizeNearest(input,output,width,height){
  await sharp(input)
    .resize(width,height,{kernel:sharp.kernel.nearest,fit:'fill'})
    .png({compressionLevel:9,palette:false})
    .toFile(output);
}

async function main(){
  if(!fs.existsSync(atlasPath)) throw new Error(`missing atlas: ${atlasPath}`);
  fs.mkdirSync(hdDir,{recursive:true});

  const meta=await sharp(atlasPath).metadata();
  const atlasWidth=meta.width||0;
  const atlasHeight=meta.height||0;
  if(!atlasWidth||!atlasHeight||atlasWidth%3!==0||atlasHeight%3!==0){
    throw new Error(`HD atlas must be a 3x3 grid, got ${atlasWidth}x${atlasHeight}`);
  }

  const tileWidth=atlasWidth/3;
  const tileHeight=atlasHeight/3;
  const scale=4;

  // 3x3 atlas itself is also enlarged so character-select/background sprites stay crisp.
  await resizeNearest(
    atlasPath,
    path.join(charactersDir,'characters_hd_4x.png'),
    atlasWidth*scale,
    atlasHeight*scale
  );

  // Battle-side artwork uses ordinary <img> elements instead of CSS atlas cropping.
  // This avoids background-position/size conflicts and guarantees the full character is visible.
  for(const [id,[col,row]] of Object.entries(atlasCharacters)){
    await sharp(atlasPath)
      .extract({
        left:col*tileWidth,
        top:row*tileHeight,
        width:tileWidth,
        height:tileHeight
      })
      .resize(tileWidth*scale,tileHeight*scale,{kernel:sharp.kernel.nearest,fit:'fill'})
      .png({compressionLevel:9,palette:false})
      .toFile(path.join(hdDir,`${id}.png`));
  }

  // Keep the Gunslinger idle animation, but upscale each frame by 4x as well.
  const gunslingerDir=path.join(charactersDir,'gunslinger');
  for(let i=1;i<=4;i++){
    const src=path.join(gunslingerDir,`gunslinger_idle_${i}.png`);
    if(!fs.existsSync(src)) continue;
    const m=await sharp(src).metadata();
    if(!m.width||!m.height) continue;
    await resizeNearest(src,path.join(hdDir,`gunslinger_idle_${i}.png`),m.width*scale,m.height*scale);
  }

  console.log(`[assets] 4x HD characters ready: atlas ${atlasWidth*scale}x${atlasHeight*scale}, tiles ${tileWidth*scale}x${tileHeight*scale}`);
}

main().catch(err=>{
  console.error('[assets] failed to prepare HD character assets:',err);
  process.exit(1);
});
