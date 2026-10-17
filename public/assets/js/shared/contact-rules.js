(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QZContactRules = factory();
})(globalThis, function () {
  const LIMITI = Object.freeze({ nome: 120, email: 160, telefono: 40, tipo: 80, messaggio: 4000 });
  const isEmail = value => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  const isPhone = value => typeof value === 'string' && /^[+\d\s()./-]+$/.test(value.trim()) && value.replace(/\D/g, '').length >= 6;
  return Object.freeze({ LIMITI, isEmail, isPhone, isContact: value => isEmail(value) || isPhone(value) });
});
