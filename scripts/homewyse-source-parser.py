"""Parse authorized public Homewyse source pages without executing their JavaScript."""
import argparse, ast, hashlib, json, re
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse

class Element:
    def __init__(self, tag='', attrs=None): self.tag, self.attrs, self.children = tag, dict(attrs or []), []
    def text(self): return re.sub(r'\s+', ' ', ''.join(c if isinstance(c,str) else c.text()+' ' for c in self.children)).strip()
    def walk(self):
        yield self
        for child in self.children:
            if isinstance(child,Element): yield from child.walk()
    def find(self, tag=None, cls=None, id=None): return [x for x in self.walk() if (not tag or x.tag==tag) and (not cls or cls in x.attrs.get('class','').split()) and (not id or x.attrs.get('id')==id)]
class Document(HTMLParser):
    def __init__(self,html):
        super().__init__(convert_charrefs=True); self.root=Element('root'); self.stack=[self.root]; self.feed(html)
    def handle_starttag(self,tag,attrs):
        element=Element(tag,attrs); self.stack[-1].children.append(element)
        if tag not in ['meta','link','img','input','br','hr','source','area','wbr','embed','param','col']: self.stack.append(element)
    def handle_endtag(self,tag):
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i].tag==tag: self.stack=self.stack[:i]; break
    def handle_data(self,data): self.stack[-1].children.append(data)

def catalog(cache):
    found={}
    for filename,folder,kind in [('services','services','INSTALLATION'),('maintenance','maintenance_costs','MAINTENANCE'),('materials','costs','MATERIAL'),('projects','project_costs','PROJECT')]:
        source='https://www.homewyse.com/'+folder+'/index.html'; doc=Document((cache/(filename+'-index.html')).read_text(encoding='utf-8-sig')).root; category=kind.title()
        for node in doc.walk():
            if node.tag in ['h2','h3']: category=node.text()
            if node.tag!='a': continue
            url=urljoin(source,node.attrs.get('href','')); parsed=urlparse(url)
            if parsed.hostname not in ['www.homewyse.com','homewyse.com'] or not re.fullmatch('/'+folder+r'/cost_[a-z0-9_]+\.html',parsed.path): continue
            url='https://www.homewyse.com'+parsed.path
            if url not in found: found[url]={'sourceUrl':url,'slug':folder+'--'+Path(parsed.path).stem,'kind':kind,'name':node.text(),'categories':[]}
            if category not in found[url]['categories']: found[url]['categories'].append(category)
    result=list(found.values()); (cache/'catalog-index.json').write_text(json.dumps(result,indent=2),encoding='utf-8'); print(json.dumps({'urls':len(result),'kinds':{kind:sum(x['kind']==kind for x in result) for kind in ['INSTALLATION','MAINTENANCE','MATERIAL','PROJECT']}}))

def array(html,name):
    match=re.search(r'\b'+name+r'\s*=\s*(\[[^\]]*\])',html)
    if not match: return None
    # Published arrays also use JavaScript's leading decimals and single quotes.
    # literal_eval accepts these scalar literals without executing source code.
    try:
        value=ast.literal_eval(match.group(1))
        return value if isinstance(value,list) and all(isinstance(x,(str,int,float)) and not isinstance(x,bool) for x in value) else None
    except (ValueError,SyntaxError): return None

def scalar(html,name):
    match=re.search(r'\b'+name+r'\s*=\s*([-+\d.]+)',html)
    return float(match.group(1)) if match else None

def parse_page(entry,html):
    doc=Document(html).root; heading=doc.find('h1'); title=heading[0].text() if heading else entry['name']; meta=next((x.attrs.get('content','') for x in doc.find('meta') if x.attrs.get('name')=='description'),'')
    month=re.search(r'\b(January|February|March|April|May|June|July|August|September|October|November|December) (20\d\d)\b',meta+' '+doc.text())
    edition=month.group(0) if month else 'Undated published source'; effective=datetime.strptime(edition,'%B %Y').strftime('%Y-%m-01') if month else None
    rows=[]
    for row in doc.find('tr'):
        if not re.fullmatch(r'r\d+',row.attrs.get('id','')): continue
        description=row.find('td','cf1'); description=description[0] if description else None
        if not description: continue
        detail=description.find('span','cf1a'); detail=detail[0].text() if detail else ''
        label=description.text().replace(detail,'').strip()
        row_id=int(row.attrs['id'][1:]); selected=bool(row.find(cls='i-check-square'))
        rows.append({'index':row_id,'name':label,'description':detail,'includedByDefault':selected,'component':'LABOR' if re.search('labor',label,re.I) else 'EQUIPMENT' if re.search('equipment',label,re.I) else 'DISPOSAL' if re.search('debris|disposal',label,re.I) else 'MATERIAL'})
    arrays={key:array(html,key) for key in ['ilp','vmin','vmax','vq','fq','ib']}
    q=doc.find('input',id='inputTxt2'); quantity=float(q[0].attrs.get('value','1')) if q else None
    unit_match=re.search(r'Average Cost per\s+([^<]+)',html,re.I); unit=unit_match.group(1).strip() if unit_match else ''
    scripts=[urljoin(entry['sourceUrl'],x.attrs['src']) for x in doc.find('script') if x.attrs.get('src','').startswith('../hwref/')]
    supported=all(isinstance(v,list) for v in arrays.values()) and quantity is not None and scalar(html,'hm') is not None and scalar(html,'qx') is not None and any('v97_min.js' in x for x in scripts)
    if supported:
        count=int(scalar(html,'num_items') or 0)
        supported=count>0 and all(len(v)==count for v in arrays.values()) and all(row['index']<count for row in rows)
    inverted=bool(supported and any(low>high for low,high in zip(arrays['vmin'],arrays['vmax'])))
    if inverted: supported=False
    model={'kind':'HOMEWYSE_UC1_V97','arrays':arrays,'minimumLaborHours':scalar(html,'hm'),'quantityRoundingOffset':scalar(html,'qx'),'defaultQuantity':quantity,'sourceScripts':scripts} if supported else {'kind':'SOURCE_REFERENCE','sourceScripts':scripts}
    notes=[]; inclusions=[]; exclusions=[]; section=''
    for node in doc.walk():
        if node.tag=='p':
            value=node.text()
            if 'example estimate' in value.lower() or 'actual costs' in value.lower(): notes.append(value)
            if re.search(r'\bNOT include',value): section='exclude'
            elif re.search(r'\bincludes:',value): section='include'
        if node.tag=='li' and 'checkbox' in node.attrs.get('class','').split():
            (exclusions if section=='exclude' else inclusions).append(node.text())
    if not rows:
        for row in doc.find('tr','item-row'):
            label=row.find('td','col-name'); label=label[0].text().split('tool tip')[0].strip() if label else 'Source component'
            rows.append({'index':len(rows),'name':label,'description':'','includedByDefault':True,'component':'LABOR' if 'Labor' in label else 'EQUIPMENT' if 'Equipment' in label else 'MATERIAL'})
    source_options={key:array(html,key) for key in ['mv','ml','lv','ll','jv','jl','rv','cv','rowLabels','colLabels','z','vxo'] if array(html,key) is not None}
    if not supported: source_options.update({key:value for key,value in arrays.items() if value is not None})
    if inverted: notes.append('Published component arrays contain a low value above its high value. Retained unchanged as a source reference; automated pricing is unavailable for this source version.')
    source_calculation=re.search(r'function uc\(\)\s*\{([\s\S]*?)</script>',html)
    source_calculation=source_calculation.group(1).strip() if source_calculation else ''
    source_descriptions=[x.text() for x in doc.find('div','desc-text')]
    operations=[row['description'] for row in rows if row['component']=='LABOR' and row['description']]
    references=[{'title':x.text(),'url':urljoin(entry['sourceUrl'],x.attrs.get('href',''))} for li in doc.find('li','refbox') for x in li.find('a')]
    return {**entry,'name':title or entry['name'],'sourceEdition':edition,'effectiveDate':effective,'sourceSha256':hashlib.sha256(html.encode()).hexdigest(),'unit':unit,'headline':meta,'components':rows,'model':model,'sourceOperations':operations,'sourceOptions':source_options,'sourceCalculation':source_calculation,'sourceDescriptions':source_descriptions,'inclusions':inclusions,'exclusions':exclusions,'notes':list(dict.fromkeys(notes)),'references':references}

def normalize(cache,output):
    entries=json.loads((cache/'catalog-index.json').read_text()); records=[]; missing=[]
    for entry in entries:
        file=cache/'pages'/(entry['slug']+'.html')
        if not file.exists(): missing.append({'url':entry['sourceUrl'],'reason':'not downloaded'}); continue
        try:
            html=file.read_text(encoding='utf-8-sig')
            if 'homewyse' not in html.lower() or len(html)<2000: raise ValueError('not a source page')
            records.append(parse_page(entry,html))
        except Exception as error: missing.append({'url':entry['sourceUrl'],'reason':str(error)})
    package={'formatVersion':'flipside-homewyse-import-v1','retrievedAt':datetime.now(timezone.utc).isoformat(),'authorizationReference':'Written Homewyse authorization retained by counsel; Rick authorized implementation 2026-09-21.','flipsideModification':'Published source values and scope retained. Source UC1 calculation translated; no automatic contract repricing.','geography':{'zip':'78704','label':'Austin, TX 78704','laborFactor':float((cache/'austin-78704-factor.txt').read_text()),'factorSourceUrl':'https://www.homewyse.com/hwref/new4.php?lc=78704','nonLaborFormula':'1 + 0.15 * (laborFactor - 1)'},'records':records,'unavailable':missing}
    output.parent.mkdir(parents=True,exist_ok=True); output.write_text(json.dumps(package,separators=(',',':')),encoding='utf-8')
    print(json.dumps({'records':len(records),'supportedCalculators':sum(r['model']['kind']=='HOMEWYSE_UC1_V97' for r in records),'sourceReferences':sum(r['model']['kind']=='SOURCE_REFERENCE' for r in records),'unavailable':len(missing),'bytes':output.stat().st_size}))
if __name__=='__main__':
    args=argparse.ArgumentParser();args.add_argument('command',choices=['index','normalize']);args.add_argument('cache',type=Path);args.add_argument('--output',type=Path); opts=args.parse_args()
    catalog(opts.cache) if opts.command=='index' else normalize(opts.cache,opts.output)
