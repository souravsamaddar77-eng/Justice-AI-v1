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
console.log(`Groq fallback: ${config.fallbackConfigured ? 'configured' : 'GROQ_API_KEY required (or fallback disabled)'}`);
// Invalid input checks the route without issuing a billable provider request.
const invalid = await fetch(base+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Synthetic test',language:'unsupported-language'})});
console.log(`${invalid.status === 400 ? 'PASS' : 'FAIL'} unsupported response language rejected (${invalid.status})`);
if(invalid.status!==400)failed=true;
process.exitCode = failed ? 1 : 0;
