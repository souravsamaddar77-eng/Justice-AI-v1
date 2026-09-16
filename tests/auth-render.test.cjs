const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToString } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const originalLoad = Module._load;
const originalTs = require.extensions['.ts'];
const originalTsx = require.extensions['.tsx'];
let allowClerk = false;
let authCalls = 0;

const compile = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, filename);
require.extensions['.ts'] = compile;
require.extensions['.tsx'] = compile;
Module._load = function(request, parent, isMain) {
  if (request === '@clerk/nextjs') return {
    ClerkProvider: ({ children }) => { assert(allowClerk, 'Unconfigured pages must not mount Clerk'); return children; },
    useAuth: () => { assert(allowClerk, 'Anonymous chat must not call Clerk hooks'); authCalls++; return { userId: null, isLoaded: true }; },
    Show: ({ children }) => { assert(allowClerk); return children; },
    SignInButton: ({ children }) => children,
    SignUpButton: ({ children }) => children,
    UserButton: () => null,
  };
  if (request === 'next/navigation') return { usePathname: () => '/' };
  if (request.startsWith('@/')) request = path.join(root, request.slice(2));
  return originalLoad.call(this, request, parent, isMain);
};
const ApplicationProviders = require('../components/ApplicationProviders.tsx').default;
const AccountControls = require('../components/AccountControls.tsx').default;
const { useChatSession } = require('../components/chat/ChatSessionProvider.tsx');
function PublicContent() {
  const chat = useChatSession();
  assert.deepEqual(chat.messages, []);
  return React.createElement('main', null, 'Public legal tools', React.createElement(AccountControls));
}

test('public UI and anonymous chat render without any Clerk provider or hooks', () => {
  allowClerk = false;
  const html = renderToString(React.createElement(ApplicationProviders, { authAvailable: false }, React.createElement(PublicContent)));
  assert.match(html, /Public legal tools/);
  assert.match(html, /href="\/sign-in"/);
  assert.equal(authCalls, 0);
});

test('configured UI retains Clerk and the chat account boundary', () => {
  allowClerk = true;
  const html = renderToString(React.createElement(ApplicationProviders, { authAvailable: true }, React.createElement(PublicContent)));
  assert.match(html, /Public legal tools/);
  assert.equal(authCalls, 1);
});

after(() => {
  Module._load = originalLoad;
  require.extensions['.ts'] = originalTs;
  if (originalTsx) require.extensions['.tsx'] = originalTsx;
  else delete require.extensions['.tsx'];
});
