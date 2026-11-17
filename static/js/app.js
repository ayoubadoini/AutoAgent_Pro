/* ============================================================
   Auto-Agent — Frontend Application (Vanilla JS)
   Communicates with FastAPI backend at /voitures
   ============================================================ */

const API = '/voitures';
var carsCache = [];
var chatbotReady = false;

const AUTH_STORAGE_KEY = 'auto_agent_authenticated';

function isAuthenticated() {
  return sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true';
}

function enforceAuthentication() {
  if (!isAuthenticated()) {
    window.location.href = '/';
  }
}

function handleLogout() {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  window.location.href = '/';
}

enforceAuthentication();

// ─── Navigation ──────────────────────────────────────────────
function showSection(name) {
  if (!isAuthenticated()) return;
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const section = document.getElementById('section-' + name);
  const btn = document.getElementById('nav-' + name);
  if (section) section.classList.add('active');
  if (btn) btn.classList.add('active');

  if (name === 'catalogue') loadCatalogue();
}

// ─── Toast Notifications ─────────────────────────────────────
function toast(message, type) {
  type = type || 'info';
  var container = document.getElementById('toast-container');
  var el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(function () {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 3000);
}

// ─── Number Formatting ───────────────────────────────────────
function formatPrice(n) {
  return Number(n).toLocaleString('fr-FR') + ' DT';
}

function formatKm(n) {
  return Number(n).toLocaleString('fr-FR') + ' km';
}

function normalizeText(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isAssistantKeyword(text, keywords) {
  var normalized = normalizeText(text);
  return keywords.some(function (keyword) {
    return normalized.indexOf(keyword) !== -1;
  });
}

function getCarInventory(forceRefresh) {
  if (!forceRefresh && carsCache.length > 0) {
    return Promise.resolve(carsCache);
  }

  return fetch(API + '/')
    .then(function (res) {
      if (!res.ok) throw new Error('Erreur ' + res.status);
      return res.json();
    })
    .then(function (cars) {
      carsCache = cars || [];
      return carsCache;
    });
}

function appendChatMessage(role, message) {
  var messages = document.getElementById('chatbot-messages');
  if (!messages) return null;

  var row = document.createElement('div');
  row.className = 'chat-message ' + role;

  var bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  bubble.textContent = message;

  row.appendChild(bubble);
  messages.appendChild(row);
  messages.scrollTop = messages.scrollHeight;
  return bubble;
}

function summarizeCars(cars) {
  if (!cars || cars.length === 0) {
    return 'Je n\'ai trouvé aucune voiture correspondant à cette recherche.';
  }

  var lines = cars.slice(0, 4).map(function (car) {
    return '- ' + car.marque + ' ' + car.modele + ' (' + car.annee + ') — ' + formatPrice(car.prix);
  });

  return lines.join('\n');
}

function extractBudget(message) {
  var text = normalizeText(message);
  var budgetTerms = ['budget', 'prix', 'moins', 'sous', 'max', 'maximum', 'jusqu', 'dt', 'dinar', 'euro', 'eur', '€', 'k'];

  if (!isAssistantKeyword(text, budgetTerms)) {
    return null;
  }

  var match = text.match(/(\d+(?:[.,]\d+)?)(?:\s*)(k|dt|dinar(?:s)?|euros?|eur|€)?/i);
  if (!match) {
    return null;
  }

  var amount = parseFloat(match[1].replace(',', '.'));
  if (isNaN(amount)) {
    return null;
  }

  if ((match[2] && match[2].toLowerCase() === 'k') || amount < 1000 && text.indexOf('k') !== -1) {
    amount = amount * 1000;
  }

  return amount;
}

function filterCarsByMessage(cars, message) {
  var text = normalizeText(message);
  var tokens = [];
  var keywords = [
    'essence', 'diesel', 'electrique', 'hybride',
    'automatique', 'manuelle', 'disponible', 'vendu', 'reserve',
    'bmw', 'mercedes', 'audi', 'tesla', 'toyota', 'honda', 'ferrari', 'porsche', 'lamborghini'
  ];

  keywords.forEach(function (keyword) {
    if (text.indexOf(keyword) !== -1) {
      tokens.push(keyword);
    }
  });

  if (tokens.length === 0) {
    return [];
  }

  return cars.filter(function (car) {
    var searchable = normalizeText([
      car.marque,
      car.modele,
      car.type_carburant,
      car.transmission,
      car.couleur,
      car.statut,
      (car.options || []).join(' ')
    ].join(' '));

    return tokens.every(function (token) {
      return searchable.indexOf(token) !== -1;
    });
  });
}

function buildChatReply(message, cars) {
  return fetch('/chatbot/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: message })
  })
    .then(function (res) {
      if (!res.ok) {
        return res.json().then(function (payload) {
          throw new Error((payload && payload.detail) || ('Erreur ' + res.status));
        }).catch(function () {
          throw new Error('Erreur ' + res.status);
        });
      }
      return res.json();
    })
    .then(function (payload) {
      return payload.answer || 'Je n\'ai pas pu générer de réponse.';
    });
}

function initChatbot() {
  if (chatbotReady) {
    return;
  }

  chatbotReady = true;

  var form = document.getElementById('chatbot-form');
  var input = document.getElementById('chatbot-input');
  var messages = document.getElementById('chatbot-messages');

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var message = input.value.trim();
      if (!message) return;
      input.value = '';
      appendChatMessage('user', message);

      var typingBubble = appendChatMessage('assistant', 'Je regarde le catalogue...');
      buildChatReply(message)
        .then(function (reply) {
          if (typingBubble) typingBubble.textContent = reply;
        })
        .catch(function (err) {
          if (typingBubble) typingBubble.textContent = 'Je n\'ai pas pu analyser la demande : ' + err.message;
        });
    });
  }

  document.querySelectorAll('[data-chat-prompt]').forEach(function (button) {
    button.addEventListener('click', function () {
      var prompt = button.getAttribute('data-chat-prompt') || '';
      if (!prompt) return;
      if (input) {
        input.value = prompt;
        input.focus();
      }
      appendChatMessage('user', prompt);

      var typingBubble = appendChatMessage('assistant', 'Je cherche une réponse...');
      buildChatReply(prompt)
        .then(function (reply) {
          if (typingBubble) typingBubble.textContent = reply;
        })
        .catch(function (err) {
          if (typingBubble) typingBubble.textContent = 'Je n\'ai pas pu analyser la demande : ' + err.message;
        });
    });
  });

  if (messages && messages.children.length === 0) {
    appendChatMessage('assistant', 'Bonjour, je suis l\'assistant Auto-Agent. Pose-moi une question sur le stock ou le budget.');
  }
}

// ─── Image preview helpers ─────────────────────────────────
function createImagePreviewContainer(url) {
  var img = document.createElement('img');
  img.src = url;
  img.style.maxWidth = '100%';
  img.style.maxHeight = '120px';
  img.style.borderRadius = '8px';
  img.alt = 'Aperçu image';
  return img;
}

function updatePreview(inputId, previewId) {
  var url = document.getElementById(inputId).value.trim();
  var preview = document.getElementById(previewId);
  if (!preview) return;
  preview.innerHTML = '';
  if (!url) { preview.style.display = 'none'; return; }
  // quick validation: must start with http(s) and have an image-like extension or be loadable
  try {
    var u = new URL(url);
    var img = createImagePreviewContainer(url);
    img.onload = function () { preview.style.display = 'block'; };
    img.onerror = function () { preview.style.display = 'none'; };
    preview.appendChild(img);
  } catch (e) {
    preview.style.display = 'none';
  }
}

// Attach preview listeners for add/edit image inputs
document.addEventListener('DOMContentLoaded', function () {
  var fImage = document.getElementById('f-image');
  if (fImage) fImage.addEventListener('input', function () { updatePreview('f-image', 'f-image-preview'); });
  var eImage = document.getElementById('e-image');
  if (eImage) eImage.addEventListener('input', function () { updatePreview('e-image', 'e-image-preview'); });
});

// ─── Fuel emoji helper ───────────────────────────────────────
function fuelIcon(type) {
  switch ((type || '').toLowerCase()) {
    case 'essence':    return '\u26FD';
    case 'diesel':     return '\u26FD';
    case 'electrique': return '\u26A1';
    case 'hybride':    return '\uD83C\uDF3F';
    default:           return '\u26FD';
  }
}

// ─── Car image placeholder ───────────────────────────────────
function carEmoji(marque) {
  var m = (marque || '').toLowerCase();
  if (m.indexOf('bmw') !== -1 || m.indexOf('mercedes') !== -1 || m.indexOf('audi') !== -1) return '\uD83D\uDE98';
  if (m.indexOf('tesla') !== -1) return '\u26A1';
  if (m.indexOf('toyota') !== -1 || m.indexOf('honda') !== -1) return '\uD83D\uDE97';
  if (m.indexOf('ferrari') !== -1 || m.indexOf('porsche') !== -1 || m.indexOf('lamborghini') !== -1) return '\uD83C\uDFCE\uFE0F';
  return '\uD83D\uDE97';
}

// ─── Build a car card HTML ───────────────────────────────────
function buildCarCard(car) {
  var statusClass = 'disponible';
  if (car.statut === 'vendu') statusClass = 'vendu';
  if (car.statut === 'reserve' || car.statut === 'r\u00e9serv\u00e9') statusClass = 'reserve';

  var optionsHtml = '';
  if (car.options && car.options.length > 0) {
    car.options.forEach(function (opt) {
      optionsHtml += '<span class="tag fuel">' + opt + '</span>';
    });
  }

  var imageSection;
  if (car.image_url) {
    imageSection =
      '<div class="car-card-image" style="background:url(\'' + car.image_url + '\') center/cover no-repeat;">' +
      '</div>';
  } else {
    imageSection =
      '<div class="car-card-image">' + carEmoji(car.marque) + '</div>';
  }

  return (
    '<div class="car-card" data-id="' + car.id + '">' +
      imageSection +
      '<div class="car-card-body">' +
        '<div class="car-card-title">' + car.marque + ' ' + car.modele + '</div>' +
        '<div class="car-card-subtitle">' + car.annee + ' &bull; ' + formatKm(car.kilometrage) + '</div>' +
        '<div class="car-card-price">' + formatPrice(car.prix) + '</div>' +
        '<div class="car-card-specs">' +
          '<div class="spec-item"><span class="spec-icon">' + fuelIcon(car.type_carburant) + '</span>' + car.type_carburant + '</div>' +
          '<div class="spec-item"><span class="spec-icon">\u2699\uFE0F</span>' + car.transmission + '</div>' +
          '<div class="spec-item"><span class="spec-icon">\uD83C\uDFA8</span>' + car.couleur + '</div>' +
          '<div class="spec-item"><span class="spec-icon">\uD83D\uDEAA</span>' + car.nombre_portes + ' portes</div>' +
        '</div>' +
        '<div class="car-card-tags">' +
          '<span class="tag ' + statusClass + '">' + car.statut + '</span>' +
          optionsHtml +
        '</div>' +
        '<div class="car-card-actions">' +
          '<button class="btn btn-outline" onclick="exportEmailPdf(' + car.id + ')">Exporter e-mail (PDF)</button>' +
          '<button class="btn btn-outline" onclick="openEditModal(' + car.id + ')">Modifier</button>' +
          '<button class="btn btn-danger" onclick="handleDelete(' + car.id + ')">Supprimer</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

// ─── Load Catalogue ──────────────────────────────────────────
function loadCatalogue() {
  var grid = document.getElementById('car-grid');
  grid.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><span>Chargement...</span></div>';

  fetch(API + '/')
    .then(function (res) { return res.json(); })
    .then(function (cars) {
      carsCache = cars || [];
      if (!cars || cars.length === 0) {
        grid.innerHTML =
          '<div class="empty-state">' +
            '<div class="empty-icon">\uD83D\uDE97</div>' +
            '<h3>Aucune voiture dans le catalogue</h3>' +
            '<p>Ajoutez votre premiere voiture pour commencer !</p>' +
            '<button class="btn btn-primary btn-lg" onclick="showSection(\'ajouter\')">+ Ajouter une voiture</button>' +
          '</div>';
        updateStats([]);
        return;
      }
      var html = '';
      cars.forEach(function (car) { html += buildCarCard(car); });
      grid.innerHTML = html;
      updateStats(cars);
    })
    .catch(function (err) {
      grid.innerHTML =
        '<div class="empty-state">' +
          '<div class="empty-icon">\u26A0\uFE0F</div>' +
          '<h3>Erreur de chargement</h3>' +
          '<p>' + err.message + '</p>' +
        '</div>';
    });
}

// ─── Update Stats ────────────────────────────────────────────
function updateStats(cars) {
  document.getElementById('stat-total').textContent = cars.length;

  var disponibles = cars.filter(function (c) { return c.statut === 'disponible'; });
  document.getElementById('stat-disponible').textContent = disponibles.length;

  if (cars.length > 0) {
    var sum = cars.reduce(function (a, c) { return a + c.prix; }, 0);
    document.getElementById('stat-prix-moyen').textContent = formatPrice(Math.round(sum / cars.length));
  } else {
    document.getElementById('stat-prix-moyen').textContent = '0 DT';
  }

  var marques = {};
  cars.forEach(function (c) { marques[c.marque] = true; });
  document.getElementById('stat-marques').textContent = Object.keys(marques).length;
}

// ─── Add Car ─────────────────────────────────────────────────
function handleAddCar(e) {
  e.preventDefault();

  var optionsRaw = document.getElementById('f-options').value;
  var optionsArr = optionsRaw
    ? optionsRaw.split(',').map(function (s) { return s.trim(); }).filter(Boolean)
    : [];

  var body = {
    marque: document.getElementById('f-marque').value,
    modele: document.getElementById('f-modele').value,
    annee: parseInt(document.getElementById('f-annee').value, 10),
    prix: parseFloat(document.getElementById('f-prix').value),
    kilometrage: parseInt(document.getElementById('f-km').value, 10),
    type_carburant: document.getElementById('f-carburant').value,
    couleur: document.getElementById('f-couleur').value,
    nombre_portes: parseInt(document.getElementById('f-portes').value, 10),
    transmission: document.getElementById('f-transmission').value,
    statut: document.getElementById('f-statut').value,
    image_url: document.getElementById('f-image').value || '',
    options: optionsArr
  };

  fetch(API + '/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
    .then(function (res) {
      if (!res.ok) throw new Error('Erreur ' + res.status);
      return res.json();
    })
    .then(function () {
      toast('Voiture ajoutee avec succes !', 'success');
      document.getElementById('add-car-form').reset();
      showSection('catalogue');
    })
    .catch(function (err) {
      toast('Erreur : ' + err.message, 'error');
    });
}

// ─── Delete Car ──────────────────────────────────────────────
function handleDelete(id) {
  if (!confirm('Supprimer cette voiture ?')) return;

  fetch(API + '/' + id, { method: 'DELETE' })
    .then(function (res) {
      if (!res.ok) throw new Error('Erreur ' + res.status);
      toast('Voiture supprimee', 'success');
      loadCatalogue();
    })
    .catch(function (err) {
      toast('Erreur : ' + err.message, 'error');
    });
}

// ─── Edit Modal ──────────────────────────────────────────────
function openEditModal(id) {
  fetch(API + '/' + id)
    .then(function (res) { return res.json(); })
    .then(function (car) {
      document.getElementById('e-id').value = car.id;
      document.getElementById('e-marque').value = car.marque;
      document.getElementById('e-modele').value = car.modele;
      document.getElementById('e-annee').value = car.annee;
      document.getElementById('e-prix').value = car.prix;
      document.getElementById('e-km').value = car.kilometrage;
      document.getElementById('e-carburant').value = car.type_carburant;
      document.getElementById('e-couleur').value = car.couleur;
      document.getElementById('e-portes').value = car.nombre_portes;
      document.getElementById('e-transmission').value = car.transmission;
      document.getElementById('e-statut').value = car.statut;
      document.getElementById('e-options').value = (car.options || []).join(', ');
      // image url
      if (document.getElementById('e-image')) {
        document.getElementById('e-image').value = car.image_url || '';
        updatePreview('e-image', 'e-image-preview');
      }
      document.getElementById('edit-modal').classList.add('show');
    })
    .catch(function (err) {
      toast('Erreur : ' + err.message, 'error');
    });
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.remove('show');
}

function handleEditCar(e) {
  e.preventDefault();
  var id = document.getElementById('e-id').value;
  var optionsRaw = document.getElementById('e-options').value;
  var optionsArr = optionsRaw
    ? optionsRaw.split(',').map(function (s) { return s.trim(); }).filter(Boolean)
    : [];

  var body = {
    marque: document.getElementById('e-marque').value,
    modele: document.getElementById('e-modele').value,
    annee: parseInt(document.getElementById('e-annee').value, 10),
    prix: parseFloat(document.getElementById('e-prix').value),
    kilometrage: parseInt(document.getElementById('e-km').value, 10),
    type_carburant: document.getElementById('e-carburant').value,
    couleur: document.getElementById('e-couleur').value,
    nombre_portes: parseInt(document.getElementById('e-portes').value, 10),
    transmission: document.getElementById('e-transmission').value,
    statut: document.getElementById('e-statut').value,
    options: optionsArr
    ,image_url: (document.getElementById('e-image') && document.getElementById('e-image').value) ? document.getElementById('e-image').value : undefined
  };

  fetch(API + '/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
    .then(function (res) {
      if (!res.ok) throw new Error('Erreur ' + res.status);
      return res.json();
    })
    .then(function () {
      toast('Voiture modifiee avec succes !', 'success');
      closeEditModal();
      loadCatalogue();
    })
    .catch(function (err) {
      toast('Erreur : ' + err.message, 'error');
    });
}

// ─── Budget Recommendation ───────────────────────────────────
function updateBudgetDisplay(val) {
  document.getElementById('budget-display').textContent = formatPrice(val);
}

function handleRecommend() {
  var budget = document.getElementById('budget-slider').value;
  var container = document.getElementById('recommend-results');
  container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><span>Recherche en cours...</span></div>';

  fetch(API + '/recommander/' + budget)
    .then(function (res) {
      if (res.status === 404) {
        container.innerHTML =
          '<div class="empty-state">' +
            '<div class="empty-icon">\uD83D\uDE14</div>' +
            '<h3>Aucune voiture trouvee</h3>' +
            '<p>Essayez avec un budget plus eleve.</p>' +
          '</div>';
        return null;
      }
      if (!res.ok) throw new Error('Erreur ' + res.status);
      return res.json();
    })
    .then(function (cars) {
      if (!cars) return;
      if (cars.length === 0) {
        container.innerHTML =
          '<div class="empty-state">' +
            '<div class="empty-icon">\uD83D\uDE14</div>' +
            '<h3>Aucune voiture trouvee pour ce budget</h3>' +
            '<p>Essayez avec un budget plus eleve.</p>' +
          '</div>';
        return;
      }
      var html = '';
      cars.forEach(function (car) { html += buildCarCard(car); });
      container.innerHTML = html;
      toast(cars.length + ' voiture(s) trouvee(s) !', 'success');
    })
    .catch(function (err) {
      container.innerHTML =
        '<div class="empty-state">' +
          '<div class="empty-icon">\u26A0\uFE0F</div>' +
          '<h3>Erreur</h3>' +
          '<p>' + err.message + '</p>' +
        '</div>';
    });
}

// ─── Close modal on Escape ───────────────────────────────────
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeEditModal();
});

// ─── Close modal on overlay click ────────────────────────────
document.getElementById('edit-modal').addEventListener('click', function (e) {
  if (e.target === this) closeEditModal();
});

// ─── Initialize app after login ─────────────────────────────
function initMainApp() {
  initChatbot();
  loadCatalogue();
}

function resetMainAppState() {
  carsCache = [];
  chatbotReady = false;
}

// ─── Export email as PDF (client-side) ──────────────────────
function exportEmailPdf(id) {
  var car = carsCache.find(function (c) { return c.id === id; });
  if (car) {
    _exportEmailFromCar(car);
  } else {
    fetch(API + '/' + id)
      .then(function (res) { if (!res.ok) throw new Error('Erreur ' + res.status); return res.json(); })
      .then(function (c) { _exportEmailFromCar(c); })
      .catch(function (err) { toast('Erreur: ' + err.message, 'error'); });
  }
}

function _exportEmailFromCar(car) {
  try {
    var emailHtml = '';
    emailHtml += '<div style="font-family: Arial, Helvetica, sans-serif; color:#333; max-width:800px; padding:24px;">';
    emailHtml += '<h1 style="margin-bottom:8px;">Nouvelle voiture disponible</h1>';
    emailHtml += '<p style="color:#666; margin-top:0;">Voici les details de la voiture publiee sur Auto-Agent.</p>';
    if (car.image_url) {
      emailHtml += '<div style="text-align:center; margin:12px 0;"><img src="' + (car.image_url) + '" style="max-width:100%; height:auto; border-radius:8px;" alt="image voiture"></div>';
    }
    emailHtml += '<h2 style="margin:12px 0 6px;">' + (car.marque || '') + ' ' + (car.modele || '') + ' — ' + (car.annee || '') + '</h2>';
    emailHtml += '<table style="width:100%; border-collapse:collapse; margin-top:8px;">';
    emailHtml += '<tr><td style="padding:6px; border:1px solid #eee; width:50%"><strong>Prix</strong></td><td style="padding:6px; border:1px solid #eee">' + (formatPrice(car.prix) || '') + '</td></tr>';
    emailHtml += '<tr><td style="padding:6px; border:1px solid #eee"><strong>Kilometrage</strong></td><td style="padding:6px; border:1px solid #eee">' + (formatKm(car.kilometrage) || '') + '</td></tr>';
    emailHtml += '<tr><td style="padding:6px; border:1px solid #eee"><strong>Carburant</strong></td><td style="padding:6px; border:1px solid #eee">' + (car.type_carburant || '') + '</td></tr>';
    emailHtml += '<tr><td style="padding:6px; border:1px solid #eee"><strong>Transmission</strong></td><td style="padding:6px; border:1px solid #eee">' + (car.transmission || '') + '</td></tr>';
    emailHtml += '<tr><td style="padding:6px; border:1px solid #eee"><strong>Couleur</strong></td><td style="padding:6px; border:1px solid #eee">' + (car.couleur || '') + '</td></tr>';
    emailHtml += '</table>';
    if (car.options && car.options.length > 0) {
      emailHtml += '<p style="margin-top:12px;"><strong>Options:</strong> ' + car.options.join(', ') + '</p>';
    }
    emailHtml += '<p style="margin-top:18px; color:#666;">Merci, <br/>Auto-Agent</p>';
    emailHtml += '</div>';

    var container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '820px';
    container.innerHTML = emailHtml;
    document.body.appendChild(container);

    // Render to canvas then to PDF
    html2canvas(container, { useCORS: true, allowTaint: true, scale: 2 })
      .then(function (canvas) {
        try {
          var imgData = canvas.toDataURL('image/png');
          var { jsPDF } = window.jspdf || window.jspPDF || {};
          if (!jsPDF) {
            // fallback for different builds
            jsPDF = window.jsPDF || (window.jspdf && window.jspdf.jsPDF);
          }
          if (!jsPDF) {
            throw new Error('Bibliotheque jsPDF non trouvee');
          }
          var pdf = new jsPDF('p', 'pt', 'a4');
          var pdfWidth = pdf.internal.pageSize.getWidth();
          var pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save('email-voiture-' + (car.id || 'export') + '.pdf');
        } catch (err) {
          toast('Erreur export PDF: ' + err.message, 'error');
        } finally {
          if (container && container.parentNode) container.parentNode.removeChild(container);
        }
      })
      .catch(function (err) {
        if (container && container.parentNode) container.parentNode.removeChild(container);
        toast('Erreur export PDF: ' + err.message, 'error');
      });
  } catch (err) {
    toast('Erreur export PDF: ' + err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', function () {
  enforceAuthentication();
  initMainApp();
});
