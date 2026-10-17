// Dominio "Contatto": cos'è una richiesta di contatto valida. Nessun I/O, solo regole.
// Pure rules are also served to the browser: no DOM, network or UI dependencies.
const { LIMITI, isEmail: eEmail, isPhone } = require('../../../public/assets/js/shared/contact-rules');

function pulisci(valore, max) {
  return String(valore == null ? '' : valore).trim().slice(0, max);
}

// Il modulo ha un solo campo "contatto" (telefono o email): i vecchi campi email e telefono restano supportati.
function creaRichiesta(dati, ora = new Date()) {
  const contatto = pulisci(dati.contatto, LIMITI.email);
  const contattoEEmail = eEmail(contatto);
  return {
    nome: pulisci(dati.nome, LIMITI.nome),
    email: pulisci(dati.email, LIMITI.email) || (contattoEEmail ? contatto : ''),
    telefono: pulisci(dati.telefono, LIMITI.telefono) || (contatto && !contattoEEmail ? contatto.slice(0, LIMITI.telefono) : ''),
    tipo: pulisci(dati.tipo, LIMITI.tipo),
    messaggio: pulisci(dati.messaggio, LIMITI.messaggio),
    at: ora.toISOString(),
  };
}

function haEmail(richiesta) {
  return eEmail(richiesta.email);
}

function haTelefono(richiesta) {
  return isPhone(richiesta.telefono);
}

// Valida: serve un nome e almeno un modo per essere richiamati.
function eValida(richiesta) {
  return Boolean(richiesta.nome) && (haEmail(richiesta) || haTelefono(richiesta));
}

// Il campo "website" è nascosto agli utenti: se compilato, a scrivere è un bot.
function eUnBot(dati) {
  return Boolean(dati.website);
}

module.exports = { LIMITI, creaRichiesta, haEmail, haTelefono, eValida, eUnBot };
