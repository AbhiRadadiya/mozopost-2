import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne, withTransaction } from '../db/pool';
import { ah, ApiError, requireAuth, requireRole, AuthedRequest } from '../middleware';
import axios from 'axios';

// ── language detection helpers ─────────────────────────────────

const SCRIPT_RANGES: [RegExp, string][] = [
  [/[\u0900-\u097F]/, 'hindi'],      // Devanagari (Hindi, Marathi)
  [/[\u0B80-\u0BFF]/, 'tamil'],
  [/[\u0C00-\u0C7F]/, 'telugu'],
  [/[\u0A80-\u0AFF]/, 'gujarati'],
  [/[\u0980-\u09FF]/, 'bengali'],
  [/[\u0C80-\u0CFF]/, 'kannada'],
  [/[\u0D00-\u0D7F]/, 'malayalam'],
  [/[\u0A00-\u0A7F]/, 'punjabi'],
  [/[\u0B00-\u0B7F]/, 'odia'],
];

// Distinguish Hindi from Marathi by common words
function detectLanguage(text: string): { language: string; confidence: number } {
  for (const [re, lang] of SCRIPT_RANGES) {
    if (re.test(text)) {
      // Marathi detection within Devanagari
      if (lang === 'hindi') {
        const marathiWords = ['मुंबई', 'पुणे', 'नागपूर', 'ठाणे', 'नाशिक', 'रोड'];
        const isMarathi = marathiWords.some(w => text.includes(w));
        return { language: isMarathi ? 'marathi' : 'hindi', confidence: 96 };
      }
      return { language: lang, confidence: 94 + Math.random() * 5 };
    }
  }
  if (/^[A-Za-z0-9\s,.-]+$/.test(text)) return { language: 'english', confidence: 99 };
  return { language: 'unknown', confidence: 0 };
}

// Call Google Translate API (falls back to mock if no key)
async function translateAddress(text: string, srcLang: string): Promise<{ translated: string; confidence: number }> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    // Mock translation for demo — adds a marker so you know it's mock
    return {
      translated: `[TRANSLATED from ${srcLang.toUpperCase()}] ${text}`,
      confidence: 75 + Math.random() * 20,
    };
  }
  const langMap: Record<string, string> = {
    hindi: 'hi', tamil: 'ta', telugu: 'te', gujarati: 'gu',
    marathi: 'mr', bengali: 'bn', kannada: 'kn', malayalam: 'ml',
    punjabi: 'pa', odia: 'or',
  };
  const sourceLang = langMap[srcLang] || 'auto';
  const res = await axios.post(
    `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
    { q: text, source: sourceLang, target: 'en', format: 'text' },
    { timeout: 10000 },
  );
  const translated = res.data?.data?.translations?.[0]?.translatedText || text;
  return { translated, confidence: 90 };
}

// ── SELLER ROUTES (/api/v1/translations) ──────────────────────

export const translationRouter = Router();
translationRouter.use(requireAuth, requireRole('seller'));

function sid(req: AuthedRequest) {
  if (!req.user!.sellerId) throw new ApiError(403, 'Not a seller');
  return req.user!.sellerId;
}

/** GET /  — list pending translation reviews for seller */
translationRouter.get('/', ah(async (req: AuthedRequest, res) => {
  const sellerId = sid(req);
  const status = req.query.status as string | undefined;
  const params: any[] = [sellerId];
  let filter = '';
  if (status) { params.push(status); filter = `AND at.status = $${params.length}`; }

  const rows = await query(
    `SELECT at.*, o.mozopost_order_id, o.consignee_name, o.consignee_phone
     FROM address_translations at
     LEFT JOIN orders o ON o.id = at.order_id
     WHERE at.seller_id = $1 ${filter}
     ORDER BY at.created_at DESC`,
    params,
  );

  const stats = await queryOne<any>(
    `SELECT
       COUNT(*)::int                                          AS total,
       COUNT(*) FILTER (WHERE status = 'pending')::int       AS pending,
       COUNT(*) FILTER (WHERE status = 'approved')::int      AS approved,
       COUNT(*) FILTER (WHERE status = 'manual_review')::int AS manual_review,
       ROUND(AVG(translation_confidence)::numeric, 1)::float AS avg_confidence
     FROM address_translations WHERE seller_id = $1`,
    [sellerId],
  );

  res.json({ translations: rows, stats });
}));

/** POST /detect  — detect language of a given address string */
translationRouter.post('/detect', ah(async (req, res) => {
  const { address } = z.object({ address: z.string().min(1) }).parse(req.body);
  const result = detectLanguage(address);
  res.json(result);
}));

/** POST /translate  — translate a single address */
translationRouter.post('/translate', ah(async (req: AuthedRequest, res) => {
  const sellerId = sid(req);
  const dto = z.object({
    orderId:         z.string().uuid().optional(),
    originalAddress: z.string().min(1),
    originalCity:    z.string().optional(),
    originalState:   z.string().optional(),
    originalPincode: z.string().optional(),
  }).parse(req.body);

  // 1. Detect language
  const fullText = [dto.originalAddress, dto.originalCity, dto.originalState].filter(Boolean).join(', ');
  const { language, confidence: detConf } = detectLanguage(fullText);

  // If already English, skip translation
  if (language === 'english') {
    return res.json({
      detectedLanguage: 'english',
      detectionConfidence: 99,
      translatedAddress: dto.originalAddress,
      translatedCity: dto.originalCity,
      translatedState: dto.originalState,
      translatedPincode: dto.originalPincode,
      translationConfidence: 99,
      alreadyEnglish: true,
    });
  }

  // 2. Translate address, city, state separately for better quality
  const [tAddr, tCity, tState] = await Promise.all([
    translateAddress(dto.originalAddress, language),
    dto.originalCity ? translateAddress(dto.originalCity, language) : Promise.resolve({ translated: '', confidence: 0 }),
    dto.originalState ? translateAddress(dto.originalState, language) : Promise.resolve({ translated: '', confidence: 0 }),
  ]);

  const avgConf = (tAddr.confidence + (dto.originalCity ? tCity.confidence : tAddr.confidence) + (dto.originalState ? tState.confidence : tAddr.confidence)) / 3;

  // 3. Check admin settings for auto-approve threshold
  const setting = await queryOne<any>(`SELECT threshold FROM security_settings WHERE rule_key = 'address_translation'`);
  const autoApproveAbove = setting?.threshold?.auto_approve_above ?? 85;
  const autoApprove = avgConf >= autoApproveAbove;

  // 4. Persist
  const saved = await queryOne(
    `INSERT INTO address_translations
       (seller_id, order_id, original_address, original_city, original_state, original_pincode,
        detected_language, detection_confidence,
        translated_address, translated_city, translated_state, translated_pincode,
        translation_confidence, status,
        final_address, final_city, final_state)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$9,$10,$11)
     RETURNING *`,
    [
      sellerId, dto.orderId || null,
      dto.originalAddress, dto.originalCity || null, dto.originalState || null, dto.originalPincode || null,
      language, detConf,
      tAddr.translated, tCity.translated || dto.originalCity || null, tState.translated || dto.originalState || null, dto.originalPincode || null,
      parseFloat(avgConf.toFixed(2)),
      autoApprove ? 'approved' : avgConf >= 60 ? 'translated' : 'manual_review',
    ],
  );

  res.status(201).json({
    translation: saved,
    detectedLanguage: language,
    detectionConfidence: detConf,
    autoApproved: autoApprove,
  });
}));

/** PATCH /:id/approve  — seller approves (optionally editing) translated address */
translationRouter.patch('/:id/approve', ah(async (req: AuthedRequest, res) => {
  const sellerId = sid(req);
  const { editedAddress, editedCity, editedState } = req.body;
  const t = await queryOne<any>(`SELECT * FROM address_translations WHERE id = $1 AND seller_id = $2`, [req.params.id, sellerId]);
  if (!t) throw new ApiError(404, 'Translation not found');

  const finalAddress = editedAddress || t.translated_address;
  const finalCity    = editedCity    || t.translated_city;
  const finalState   = editedState   || t.translated_state;
  const edited       = !!(editedAddress || editedCity || editedState);

  await query(
    `UPDATE address_translations
     SET status = 'approved', seller_edited = $1,
         final_address = $2, final_city = $3, final_state = $4,
         approved_by = $5, approved_at = NOW(), updated_at = NOW()
     WHERE id = $6`,
    [edited, finalAddress, finalCity, finalState, req.user!.sub, req.params.id],
  );

  // If linked to an order, update the order's consignee address
  if (t.order_id) {
    await query(
      `UPDATE orders SET consignee_address1 = $1, consignee_city = $2, consignee_state = $3 WHERE id = $4`,
      [finalAddress, finalCity || t.translated_city, finalState || t.translated_state, t.order_id],
    );
  }

  res.json({ message: 'Translation approved', finalAddress, finalCity, finalState });
}));

/** PATCH /:id/reject  — seller rejects, sends back for manual entry */
translationRouter.patch('/:id/reject', ah(async (req: AuthedRequest, res) => {
  const sellerId = sid(req);
  const { reason } = req.body;
  const t = await queryOne(`SELECT id FROM address_translations WHERE id = $1 AND seller_id = $2`, [req.params.id, sellerId]);
  if (!t) throw new ApiError(404, 'Translation not found');
  await query(
    `UPDATE address_translations SET status = 'rejected', rejection_reason = $1, updated_at = NOW() WHERE id = $2`,
    [reason || 'Incorrect translation', req.params.id],
  );
  res.json({ message: 'Translation rejected — please enter address manually' });
}));

/** POST /bulk-approve  — approve multiple translations at once */
translationRouter.post('/bulk-approve', ah(async (req: AuthedRequest, res) => {
  const sellerId = sid(req);
  const { ids } = z.object({ ids: z.array(z.string().uuid()).min(1) }).parse(req.body);

  let approved = 0;
  for (const id of ids) {
    const t = await queryOne<any>(
      `SELECT * FROM address_translations WHERE id = $1 AND seller_id = $2 AND status IN ('pending','translated')`,
      [id, sellerId],
    );
    if (!t) continue;
    await query(
      `UPDATE address_translations
       SET status = 'approved', final_address = translated_address,
           final_city = translated_city, final_state = translated_state,
           approved_by = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [req.user!.sub, id],
    );
    if (t.order_id) {
      await query(
        `UPDATE orders SET consignee_address1 = $1, consignee_city = $2, consignee_state = $3 WHERE id = $4`,
        [t.translated_address, t.translated_city, t.translated_state, t.order_id],
      );
    }
    approved++;
  }

  res.json({ message: `${approved} translations approved`, approvedCount: approved });
}));

// ── ADMIN ROUTES (/api/v1/admin/translations) ─────────────────

export const adminTranslationRouter = Router();
adminTranslationRouter.use(requireAuth, requireRole('master_admin', 'super_admin'));

/** GET /  — all translations platform-wide with filters */
adminTranslationRouter.get('/', ah(async (req, res) => {
  const { status, language, sellerId } = req.query as Record<string, string>;
  const params: any[] = [];
  const filters: string[] = [];
  if (status)   { params.push(status);   filters.push(`at.status = $${params.length}`); }
  if (language) { params.push(language); filters.push(`at.detected_language = $${params.length}`); }
  if (sellerId) { params.push(sellerId); filters.push(`at.seller_id = $${params.length}`); }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const rows = await query(
    `SELECT at.*, s.business_name, o.mozopost_order_id
     FROM address_translations at
     JOIN sellers s ON s.id = at.seller_id
     LEFT JOIN orders o ON o.id = at.order_id
     ${where}
     ORDER BY at.created_at DESC LIMIT 200`,
    params,
  );

  const stats = await queryOne<any>(
    `SELECT
       COUNT(*)::int                                            AS total,
       COUNT(*) FILTER (WHERE status = 'pending')::int         AS pending,
       COUNT(*) FILTER (WHERE status = 'manual_review')::int   AS manual_review,
       COUNT(*) FILTER (WHERE status = 'approved')::int        AS approved,
       ROUND(AVG(translation_confidence)::numeric, 1)::float   AS avg_confidence,
       ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'approved') / NULLIF(COUNT(*),0), 1)::float AS success_rate
     FROM address_translations`,
  );

  const byLanguage = await query(
    `SELECT detected_language AS language, COUNT(*)::int AS count
     FROM address_translations GROUP BY detected_language ORDER BY count DESC`,
  );

  res.json({ translations: rows, stats, byLanguage });
}));

/** PATCH /settings  — update auto-approve threshold etc. */
adminTranslationRouter.patch('/settings', ah(async (req, res) => {
  const { autoApproveAbove, minConfidence, isEnabled, provider } = req.body;
  const current = await queryOne<any>(`SELECT threshold FROM security_settings WHERE rule_key = 'address_translation'`);
  const threshold = {
    ...(current?.threshold || {}),
    ...(autoApproveAbove !== undefined && { auto_approve_above: autoApproveAbove }),
    ...(minConfidence     !== undefined && { min_confidence: minConfidence }),
    ...(provider          !== undefined && { provider }),
  };
  await query(
    `UPDATE security_settings SET threshold = $1, ${isEnabled !== undefined ? 'is_enabled = $3,' : ''} updated_at = NOW()
     WHERE rule_key = 'address_translation'`,
    isEnabled !== undefined ? [JSON.stringify(threshold), 'address_translation', isEnabled] : [JSON.stringify(threshold), 'address_translation'],
  );
  res.json({ message: 'Translation settings updated', threshold });
}));
