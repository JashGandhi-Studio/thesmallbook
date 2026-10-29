"""v324: CAPS-LOCK h1/h2 headings -> sentence case (soft neo reads, it does not shout)."""
import re, glob, os
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
KEEP = {'TSB','PDF','AI','DPDP','UPI','OK','FAQ','PWA','ID','I','DM','OG','RIP','R.I.P','USA','UK','TV','OTP'}
PROPER = {'THESMALLBOOK':'TheSmallBook','GOLD':'Gold','TSBGOLD':'TSB Gold','HINDI':'Hindi','INDIA':'India','GOOGLE':'Google'}
rx = re.compile(r'<(h[12])([^>]*)>(.*?)</\1>', re.S)
def fix_text(t):
    prot = []
    def hold(m): prot.append(m.group(0)); return '\x00%d\x00' % (len(prot) - 1)
    t = re.sub(r'<[^>]+>|&[#a-zA-Z0-9]+;|\\u[0-9a-fA-F]{4}|\$\{[^}]*\}|"\s*\+[^+]*\+\s*"', hold, t)
    out, start = [], True
    for tok in re.split(r"([A-Za-z][A-Za-z'\u2019.]*)", t):
        if tok and re.match(r'[A-Za-z]', tok):
            core = tok.rstrip('.')
            if core.upper() in PROPER: w = PROPER[core.upper()] + tok[len(core):]
            elif core.upper() in KEEP: w = core.upper() + tok[len(core):]
            else:
                w = tok.lower()
                if start: w = w[0].upper() + w[1:]
            start = tok.endswith('.')
            out.append(w)
        else:
            mm = re.search(r'\x00(\d+)\x00\s*$', tok)
            if re.search(r'[.!?\u00b7:]\s*$', tok) or (mm and prot[int(mm.group(1))].lower().startswith('<br')): start = True
            out.append(tok)
    s = ''.join(out)
    return re.sub(r'\x00(\d+)\x00', lambda m: prot[int(m.group(1))], s)
n = 0
for f in glob.glob('*.html') + glob.glob('js/*.js'):
    if 'Copy' in f or 'og-builder' in f: continue
    s = open(f, encoding='utf-8').read()
    def rep(m):
        txt = re.sub(r'<[^>]+>', '', m.group(3)); L = re.sub(r'[^A-Za-z]', '', txt)
        if len(L) >= 4 and sum(c.isupper() for c in L) / len(L) > 0.8:
            return '<%s%s>%s</%s>' % (m.group(1), m.group(2), fix_text(m.group(3)), m.group(1))
        return m.group(0)
    o = rx.sub(rep, s)
    if o != s: open(f, 'w', encoding='utf-8').write(o); n += 1
print('sentence-cased headings in', n, 'files')
