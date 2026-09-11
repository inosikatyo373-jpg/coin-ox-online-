"""Build a seamless loop from the original opening recording (requires ffmpeg, numpy)."""
from pathlib import Path
import subprocess
import tempfile
import shutil
import numpy as np
root=Path(__file__).resolve().parents[1]
sr=48000
raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(root/'public/audio/shady-opening.mp3'),'-f','f32le','-ac','2','-ar',str(sr),'-'])
x=np.frombuffer(raw,dtype='<f4').reshape(-1,2).copy()
# Exclude the damaged final MP3 frame; blend the tail into the opening.
x=x[:-int(.1*sr)]
n=int(.8*sr)
w=np.linspace(0,1,n,dtype=np.float32)[:,None]
y=x[n:].copy()
y[-n:]=x[-n:]*(1-w)+x[:n]*w
temp = tempfile.NamedTemporaryFile(suffix='.mp3', delete=False)
temp.close()
subprocess.run(['ffmpeg','-v','error','-f','f32le','-ar',str(sr),'-ac','2','-i','pipe:0','-c:a','libmp3lame','-b:a','160k','-write_xing','1','-y',temp.name],input=y.astype('<f4').tobytes(),check=True)
print(f'Loop: {len(y)/sr:.3f}s; seam step {np.max(np.abs(y[-1]-y[0])):.6f}')

shutil.copyfile(temp.name, root/'public/audio/shady-opening-loop.mp3')
Path(temp.name).unlink()
