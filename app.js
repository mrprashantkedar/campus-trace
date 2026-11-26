import {el,node,words,busy,ai} from './common.js';
const seed = [
  {kind:'Found',description:'Dark steel water bottle',location:'Central library reading room'},
  {kind:'Lost',description:'Blue umbrella',location:'Engineering block'},
  {kind:'Found',description:'Black laptop sleeve',location:'Central library'},
  {kind:'Found',description:'Grey earbud case',location:'Cafeteria'}
];
let reports = seed;
try {
  const saved = JSON.parse(localStorage.getItem('campus-trace-reports'));
  if (Array.isArray(saved)) reports = saved;
} catch {}
const synonyms = {flask:'bottle',dark:'black',earpods:'earbud',earbuds:'earbud'};
const tokens = text => new Set(words(text).map(word=>synonyms[word] ?? word).filter(word=>!['near','the','at','in'].includes(word)));
function display(matches) {
  el('result').replaceChildren(...matches.map(({report})=>{
    const card = node('div','','line');
    card.append(node('strong',report.description),node('div',report.kind+' · '+report.location,'muted'));
    return card;
  }));
  if (!matches.length) el('result').textContent = 'No matching reports.';
}
function search() {
  const query = tokens(el('question').value);
  const matches = reports.map(report=>{
    const indexed = tokens(report.description+' '+report.location);
    return {report,score:[...query].filter(term=>indexed.has(term)).length};
  }).filter(match=>match.score>0).sort((a,b)=>b.score-a.score).slice(0,5);
  display(matches);
}
let model;
el('run').onclick = search;
el('semantic').onclick = () => {
  const query = el('question').value.trim();
  if (!query) {
    el('result').textContent = 'Enter an item description.';
    return;
  }
  busy(el('semantic'),'Loading embedding model and searching…',async () => {
    if (!model) {
      const {pipeline} = await ai();
      model = await pipeline('feature-extraction','Xenova/all-MiniLM-L6-v2',{dtype:'q8'});
    }
    const snapshot = [...reports];
    const vectors = (await model([query,...snapshot.map(report=>report.description+' '+report.location)],{pooling:'mean',normalize:true})).tolist();
    const ranked = snapshot.map((report,index)=>({report,score:vectors[0].reduce((sum,value,n)=>sum+value*vectors[index+1][n],0)}));
    display(ranked.filter(match=>match.score>.25).sort((a,b)=>b.score-a.score).slice(0,5));
  });
};
el('post').onsubmit = event => {
  event.preventDefault();
  const description = el('description').value.trim(), location = el('location').value.trim();
  if (!description || !location) return;
  reports = [{kind:el('kind').value,description,location},...reports].slice(0,100);
  try {
    localStorage.setItem('campus-trace-reports',JSON.stringify(reports));
    el('saved').textContent = 'Report saved on this browser.';
  } catch {
    el('saved').textContent = 'Report added for this session. Browser storage is unavailable.';
  }
  event.target.reset();
  el('question').value = description;
  search();
};
search();
