const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');

test('fuse stays within selected cable adjusted ampacity', () => {
  const elements = Object.fromEntries(Object.entries({
    voltage: '12', current: '16', power: '', length: '1',
    dropLimit: '3', cableSize: '2.5', installType: 'enclosed',
    ambientTemp: '25', wattageOutput: '', voltageDrop: '',
    dropPercent: '', fuseSuggestion: '', recommendedCable: ''
  }).map(([id, value]) => [id, { value }]));
  const context = vm.createContext({
    document: { getElementById: id => elements[id] },
    alert: message => assert.fail(message)
  });
  const html = readFileSync(new URL('../index.html', `file://${__filename}`), 'utf8');
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
  const result = () => {
    vm.runInContext('calculate()', context);
    return elements.fuseSuggestion.innerText;
  };

  // 16 A load fits the 18 A cable, but the next fuse (20 A) does not.
  assert.match(result(), /No suitable standard fuse/);
  elements.current.value = '14';
  assert.equal(result(), 'Recommended Fuse: 15A');
  // Temperature derating reduces 18 A to 13.5 A.
  elements.ambientTemp.value = '50';
  assert.match(result(), /No suitable standard fuse/);
  elements.current.value = '19';
  assert.match(result(), /No suitable standard fuse/);
  // A fuse equal to the adjusted ampacity remains valid.
  elements.cableSize.value = '4';
  elements.installType.value = 'buried';
  elements.ambientTemp.value = '25';
  elements.current.value = '';
  elements.power.value = '348';
  assert.equal(result(), 'Recommended Fuse: 30A');
  elements.installType.value = 'air';
  elements.current.value = '29';
  elements.cableSize.value = '2.5';
  assert.equal(result(), 'Recommended Fuse: 30A');
});
