/**
 * Classe les mails de la boîte de réception Gmail par DOMAINE D'EXPÉDITEUR,
 * et optionnellement par expéditeur (sous-libellé).
 *
 * n.dupont@domain.tld -> libellé "domain.tld" (ou "domain.tld/n.dupont" si
 * SUBLABEL_BY_SENDER), créé au besoin, puis le fil sort de la boîte de réception
 * (archivé). Équivalent Gmail du mode sender_domain de l'outil Email Classifier,
 * mais côté Google : aucun IMAP, aucun mot de passe d'application, aucun OAuth.
 *
 * INSTALLATION
 *   1. https://script.google.com -> Nouveau projet -> colle ce fichier.
 *   2. Exécute installTrigger() une fois et autorise les accès Gmail demandés.
 *   3. Le tri tourne ensuite tout seul (toutes les EVERY_MINUTES minutes).
 *
 * Pour tout reclasser d'un coup au départ, relance classifyInbox() à la main
 * autant de fois que nécessaire (il traite BATCH fils par exécution).
 */

// ---- Configuration -------------------------------------------------------
var PREFIX = '';                 // ex. 'Expediteurs' -> "Expediteurs/domain.tld"
var SUBLABEL_BY_SENDER = true;   // true: domain.tld/n.dupont ; false: domain.tld seul
var ARCHIVE_AFTER = true;        // true = sort de l'INBOX (rangé) ; false = reste mais libellé
var ARCHIVE_ONLY_IF_READ = true; // n'archiver QUE les fils lus (les non-lus restent visibles)
var BATCH = 100;                 // nb de fils traités par exécution (limite ~6 min/exécution)
var EVERY_MINUTES = 10;          // fréquence du déclencheur (1, 5, 10, 15 ou 30)
var EXCLUDE_DOMAINS = [];        // ex. ['mondomaine.com'] pour ne pas classer certains domaines

// ---- Tri principal -------------------------------------------------------
function classifyInbox() {
  _labelCache = null; // repart d'un cache de libellés frais à chaque exécution
  var threads = GmailApp.search('in:inbox', 0, BATCH);

  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];

    var parts = senderParts_(thread);
    if (!parts) continue;
    if (EXCLUDE_DOMAINS.indexOf(parts.domain) !== -1) continue;

    var name = parts.domain;
    if (SUBLABEL_BY_SENDER && parts.local) name = parts.domain + '/' + parts.local;
    if (PREFIX) name = PREFIX + '/' + name;

    var label = getOrCreateLabel_(name);
    if (!label) continue; // libellé introuvable/impossible : on ne touche pas au fil

    // Libellise tout de suite (si pas déjà fait) : le mail est rangé.
    if (!hasLabel_(thread, label.getName())) thread.addLabel(label);

    // Sort de l'INBOX. Si ARCHIVE_ONLY_IF_READ, on attend que le fil soit lu :
    // les non-lus restent visibles dans la boîte et seront archivés une fois lus.
    if (ARCHIVE_AFTER && (!ARCHIVE_ONLY_IF_READ || !thread.isUnread())) {
      thread.moveToArchive();
    }
  }
}

// ---- Expéditeur ----------------------------------------------------------
function senderParts_(thread) {
  var msgs = thread.getMessages();
  if (!msgs.length) return null;
  var from = msgs[0].getFrom();                 // '"Nom" <local@domaine>' ou 'local@domaine'
  var m = from.match(/([^\s<>"]+)@([A-Za-z0-9.\-]+)/);
  if (!m) return null;
  // local sans sous-adresse +tag, et sans '/' (réservé à la hiérarchie des libellés).
  var local = m[1].toLowerCase().split('+')[0].replace(/\//g, '_');
  return { local: local, domain: m[2].toLowerCase() };
}

// ---- Libellés (robuste face à "Label name exists or conflicts") ----------
var _labelCache = null;

function labelCache_() {
  if (_labelCache) return _labelCache;
  _labelCache = {};
  var all = GmailApp.getUserLabels();
  for (var i = 0; i < all.length; i++) {
    _labelCache[all[i].getName().toLowerCase()] = all[i]; // clé insensible à la casse
  }
  return _labelCache;
}

function getOrCreateLabel_(name) {
  var cache = labelCache_();
  var key = name.toLowerCase();
  if (cache[key]) return cache[key]; // réutilise un libellé existant (même casse différente)

  var label;
  try {
    label = GmailApp.createLabel(name);
  } catch (e) {
    // Conflit (casse, création concurrente, parent déjà présent...) : on relit.
    _labelCache = null;
    label = labelCache_()[key] || GmailApp.getUserLabelByName(name) || null;
  }
  if (label) cache[key] = label;
  return label;
}

function hasLabel_(thread, name) {
  var labels = thread.getLabels();
  for (var i = 0; i < labels.length; i++) {
    if (labels[i].getName() === name) return true;
  }
  return false;
}

// ---- Installation / désinstallation du déclencheur -----------------------
function installTrigger() {
  removeTriggers();
  ScriptApp.newTrigger('classifyInbox')
    .timeBased()
    .everyMinutes(EVERY_MINUTES)
    .create();
  classifyInbox(); // premier passage immédiat
}

function removeTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'classifyInbox') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}
