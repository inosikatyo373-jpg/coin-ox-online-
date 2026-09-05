from pathlib import Path

p=Path('public/index.html')
s=p.read_text(encoding='utf-8')

s=s.replace('BID GRID ONLINE v3.7','BID GRID ONLINE v3.8')
s=s.replace('ONLINE v3.7 / 2本先取・最大3戦','ONLINE v3.8 / 2本先取・最大3戦')

css_tag='<link rel="stylesheet" href="/v38.css?v=380">'
if css_tag not in s:
    s=s.replace('</head>',css_tag+'\n</head>',1)

js_tag='<script src="/v38.js?v=380"></script>'
if js_tag not in s:
    s=s.replace('</body>',js_tag+'\n</body>',1)

p.write_text(s,encoding='utf-8')
