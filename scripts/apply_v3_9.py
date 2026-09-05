from pathlib import Path

p=Path('public/index.html')
s=p.read_text(encoding='utf-8')

# Version label
s=s.replace('BID GRID ONLINE v3.8','BID GRID ONLINE v3.9')
s=s.replace('ONLINE v3.8 / 2本先取・最大3戦','ONLINE v3.9 / 2本先取・最大3戦')

# Default character must be Gunslinger whenever there is no saved explicit choice.
s=s.replace('function getCharacterDef(id){return CHARACTER_DEFS.find(c=>c.id===id)||CHARACTER_DEFS[1]}',
            'function getCharacterDef(id){return CHARACTER_DEFS.find(c=>c.id===id)||CHARACTER_DEFS[2]}')
s=s.replace('selectedCharacter=loadCharacter()||"merchant";saveCharacter(selectedCharacter);',
            'selectedCharacter=loadCharacter()||"gunslinger";saveCharacter(selectedCharacter);')
s=s.replace('const id=selectedCharacter||loadCharacter()||"merchant";',
            'const id=selectedCharacter||loadCharacter()||"gunslinger";')
s=s.replace('if(!selectedCharacter){selectedCharacter=loadCharacter()||"merchant";saveCharacter(selectedCharacter);}',
            'if(!selectedCharacter){selectedCharacter=loadCharacter()||"gunslinger";saveCharacter(selectedCharacter);}')

# Load character-quality overrides after v3.8 styles.
css_tag='<link rel="stylesheet" href="/v39.css?v=390">'
if css_tag not in s:
    s=s.replace('</head>',css_tag+'\n</head>',1)

p.write_text(s,encoding='utf-8')
