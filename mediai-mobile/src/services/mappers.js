// src/services/mappers.js
// ─────────────────────────────────────────────────────────────
// Traduction entre le format de l'API Laravel (nom/prenom/...)
// et le format historique de l'UI mobile (name/phone/age/...).
// Permet de brancher le backend sans réécrire toutes les pages.
// ─────────────────────────────────────────────────────────────

// Calcule l'âge à partir d'une date de naissance ISO.
const ageFromBirthDate = (iso) => {
  if (!iso) return null;
  const birth = new Date(iso);
  if (Number.isNaN(birth.getTime())) return null;
  const diff = Date.now() - birth.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
};

// Estime une date de naissance (1er janvier) à partir d'un âge.
const birthDateFromAge = (age) => {
  const parsedAge = parseInt(age, 10);
  if (!Number.isFinite(parsedAge) || parsedAge <= 0) return null;
  const year = new Date().getFullYear() - parsedAge;
  return `${year}-01-01`;
};

// ── API → UI ──────────────────────────────────────────────────
export const mapUserFromApi = (u = {}) => ({
  id: u.id,
  name: [u.prenom, u.nom].filter(Boolean).join(' ').trim() || u.email,
  prenom: u.prenom,
  nom: u.nom,
  email: u.email,
  phone: u.telephone || '',
  sexe: u.sexe || 'A',
  age: ageFromBirthDate(u.date_naissance),
  birthDate: u.date_naissance || '',
  // Le backend stocke le groupe complet (ex: "A+"). On le scinde en
  // lettre (bloodType) + signe (rhesus) pour les sélecteurs du profil.
  bloodType: (u.groupe_sanguin || '').replace(/[+-]$/, ''),
  rhesus: (u.groupe_sanguin || '').match(/[+-]$/)?.[0] || '+',
  allergies: u.allergies || 'Aucune',
  antecedents: u.antecedents || 'Aucun',
  vaccinations: u.vaccinations || 'À jour',
  location: u.localisation || '',
  taille_cm: u.taille_cm ?? null,
  poids_kg: u.poids_kg ?? null,
  dispositif_iot: u.dispositif_iot || null,
  hasSickleCell: Boolean(u.has_sickle_cell),
  hasDiabetes: Boolean(u.has_diabetes),
  hasHypertension: Boolean(u.has_hypertension),
  // Rôle RBAC renvoyé par l'API (patient | medecin | admin)
  role: u.role || 'patient',
  consultations: u.consultations_count ?? 0,
  appointments: u.rendez_vous_count ?? 0,
  // Diagnostics éventuellement inclus (endpoint admin /users/{id})
  diagnostics: Array.isArray(u.consultations)
    ? u.consultations.map(mapConsultationToDiagnostic)
    : [],
});

// ── Consultation API → diagnostic UI ({disease, score, date, …}) ──
export const mapConsultationToDiagnostic = (c = {}) => {
  // score_ia peut être stocké en fraction (0–1) ou déjà en pourcentage.
  const raw = Number(c.score_ia ?? c.score ?? 0);
  const score = Math.round(raw <= 1 ? raw * 100 : raw);
  const principal = Array.isArray(c.resultats) ? c.resultats[0] : null;
  const disease = c.pathologie_detectee || principal?.diagnostic || principal?.nom || principal?.maladie || 'Diagnostic';
  const diagnosis = principal?.diagnostic || c.pathologie_detectee || principal?.nom || principal?.maladie || 'Diagnostic';
  const causes = Array.isArray(principal?.causes)
    ? principal.causes
    : Array.isArray(c.facteurs_risque)
      ? c.facteurs_risque
      : [];
  const prescriptions = Array.isArray(principal?.prescriptions)
    ? principal.prescriptions
    : Array.isArray(principal?.recos)
      ? principal.recos
      : [];

  return {
    id: c.id,
    disease,
    nom: disease,
    diagnosis,
    score,
    sc: score / 100,
    date: c.created_at || c.date || null,
    symptoms: Array.isArray(c.symptomes) ? c.symptomes : [],
    risks: causes,
    causes,
    prescriptions,
    recos: prescriptions,
    cat: principal?.categorie || principal?.cat || '',
    aiSummary: principal?.resume_ia || '',
    iotData: c.iot_data || null,
    urgence: c.urgence ?? null,
  };
};

// ── Rendez-vous API → appointment UI (écran AdminStatistics) ──────
const RDV_STATUT_UI = { planifie: 'confirmed', confirme: 'confirmed', annule: 'cancelled', termine: 'completed' };
export const mapAppointmentFromApi = (rdv = {}) => ({
  id: rdv.id,
  doctorId: rdv.medecin_id,
  doctorName: rdv.medecin?.nom || 'Médecin',
  specialty: rdv.medecin?.specialite || '',
  userId: rdv.user_id,
  userName: [rdv.user?.prenom, rdv.user?.nom].filter(Boolean).join(' ').trim() || 'Patient',
  date: rdv.date_rdv ? String(rdv.date_rdv).slice(0, 10) : '',
  slot: rdv.creneau ? String(rdv.creneau).slice(0, 5) : '',
  status: RDV_STATUT_UI[rdv.statut] || 'confirmed',
});

// ── UI → API (inscription) ────────────────────────────────────
export const mapRegisterToApi = (data = {}) => {
  const fullName = (data.name || '').trim();
  const parts = fullName.split(/\s+/);
  const prenom = parts.shift() || fullName || 'Utilisateur';
  const nom = parts.join(' ') || prenom;

  return {
    nom,
    prenom,
    email: data.email,
    password: data.password,
    password_confirmation: data.password_confirmation || data.password,
    telephone: data.phone || null,
    sexe: data.sexe || 'A',
    date_naissance: data.date_naissance || birthDateFromAge(data.age),
    groupe_sanguin: data.bloodType || null,
    taille_cm: data.taille_cm || null,
    poids_kg: data.poids_kg || null,
    allergies: data.allergies || null,
    antecedents: data.antecedents || null,
    localisation: data.location || null,
    dispositif_iot: data.dispositif_iot || null,
    // Rôle choisi à l'inscription (patient par défaut) + spécialité si médecin
    role: data.role === 'medecin' ? 'medecin' : 'patient',
    specialite: data.role === 'medecin' ? (data.specialite || null) : null,
    // Consentements (étape 3) — RGPD requis par l'API
    consent_diagnostic: data.consent_diagnostic ?? true,
    consent_partage: data.consent_partage ?? true,
    consent_rgpd: data.consent_rgpd ?? true,
  };
};

// ── UI → API (mise à jour profil) ─────────────────────────────
export const mapProfileToApi = (data = {}) => {
  const out = {};
  if (data.name !== undefined) {
    const parts = (data.name || '').trim().split(/\s+/);
    out.prenom = parts.shift() || data.name;
    out.nom = parts.join(' ') || out.prenom;
  }
  if (data.phone !== undefined) out.telephone = data.phone;
  if (data.location !== undefined) out.localisation = data.location;
  if (data.age !== undefined) out.date_naissance = data.age ? birthDateFromAge(data.age) : null;
  if (data.sexe !== undefined) out.sexe = data.sexe || null;
  if (data.bloodType !== undefined) {
    // Le backend exige le groupe complet AVEC rhésus (ex: "A+"), sinon 422.
    out.groupe_sanguin = data.bloodType
      ? `${data.bloodType}${data.rhesus || '+'}`
      : null;
  }
  if (data.allergies !== undefined) out.allergies = data.allergies;
  if (data.antecedents !== undefined) out.antecedents = data.antecedents;
  if (data.vaccinations !== undefined) out.vaccinations = data.vaccinations;
  if (data.taille_cm !== undefined) out.taille_cm = data.taille_cm;
  if (data.poids_kg !== undefined) out.poids_kg = data.poids_kg;
  if (data.dispositif_iot !== undefined) out.dispositif_iot = data.dispositif_iot;
  if (data.hasSickleCell !== undefined) out.has_sickle_cell = Boolean(data.hasSickleCell);
  if (data.hasDiabetes !== undefined) out.has_diabetes = Boolean(data.hasDiabetes);
  if (data.hasHypertension !== undefined) out.has_hypertension = Boolean(data.hasHypertension);
  return out;
};
