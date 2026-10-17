const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

let onClick;
let selectedService;
const message = { value: 'Vorrei girare a Roma.', dispatchEvent() {} };
const tile = {
  querySelector() { return { textContent: 'Riprese da montare' }; },
  getAttribute(name) { return name === 'data-value' ? 'Video' : null; },
  click() { selectedService = 'Video'; },
};
const document = {
  addEventListener(type, listener) { if (type === 'click') onClick = listener; },
  querySelector() { return message; },
  querySelectorAll() { return [tile]; },
};
vm.runInNewContext(fs.readFileSync(process.argv[2] || 'public/assets/js/contatto/form-prefill.js', 'utf8'), {
  document,
  setTimeout(callback) { callback(); },
  Event: class {},
});

function enquire(project, service = null) {
  onClick({ target: { closest(selector) {
    if (project && !selector.includes('[data-project]')) return null;
    return { getAttribute(name) { return name === 'data-project' ? project : service; } };
  } } });
}

enquire('Baia turchese');
assert.equal(message.value, 'Mi interessano riprese come «Baia turchese».\nVorrei girare a Roma.', 'A project enquiry retains the existing message');
enquire('Baia turchese');
assert.equal(message.value.match(/Baia turchese/g).length, 1, 'Repeated clicks do not duplicate a project');
enquire('Serata evento');
assert(message.value.includes('Baia turchese') && message.value.includes('Serata evento'), 'A second project retains the first reference');
enquire(null, 'Video');
assert.equal(selectedService, 'Video', 'The clear delivery label selects the existing service value');
console.log('Project and service prefill checks passed.');
