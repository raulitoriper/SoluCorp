// Returns a no-op React component for any named export (icon component).
// Using a Proxy so any import like `import { RiSearchLine } from 'react-icons/ri'`
// resolves to a harmless stub without needing to enumerate every icon name.
const noOpComponent = () => null;
noOpComponent.displayName = 'ReactIconStub';

const handler = {
  get(_target, prop) {
    if (prop === '__esModule') return true;
    if (prop === 'default') return noOpComponent;
    return noOpComponent;
  },
};

module.exports = new Proxy({}, handler);
