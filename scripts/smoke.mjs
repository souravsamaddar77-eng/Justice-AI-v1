const base = process.env.BASE_URL || 'http://localhost:3000';
const paths = ['/', '/portal', '/victim-citizen', '/citizen', '/citizen/voice-assistant', '/citizen/action-tracker', '/citizen/lawyers', '/advocate', '/advocate/cases', '/advocate/draft-review', '/advocate/network', '/advocate/precedents', '/cases', '/sign-in', '/sign-up', '/tools'];
let failed = false;
for (const path of paths) {
  const start = performance.now();
  const response = await fetch(base + path);
  const body = await response.text();
  const pass = response.status === 200 && body.includes('<main') && !body.includes('Build Error');
  if (!pass) failed = true;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${path} ${response.status} ${Math.round(performance.now()-start)}ms`);
}
const session = await fetch(base+'/api/auth/session').then(r=>r.json());
console.log(`Cases: ${session.configured ? 'configured; authenticate to verify saved data' : 'setup required; standalone routes stay available'}`);
const config = await fetch(base+'/api/ai/config').then(r=>r.json());
console.log(`AI config returns processor disclosure: ${Array.isArray(config.providers)}`);
const denied = await fetch(base+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Synthetic test without consent'})});
console.log(`${denied.status === 428 ? 'PASS' : 'FAIL'} live AI requires consent (${denied.status})`);
if(denied.status!==428)failed=true;
process.exitCode = failed ? 1 : 0;
