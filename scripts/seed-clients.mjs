import { createClient } from '@supabase/supabase-js';

const ttb = createClient(
  'https://busvgzfykkpwapfayqfy.supabase.co',
  'sb_publishable_mFdJ0jFbo66HCvJbNfLAjw_CV-ppABb'
);

const clients = [
  { name: 'שרה כהן',       phone: '050-3847291', package_size: 10, total_lessons_purchased: 10 },
  { name: 'רחל לוי',       phone: '052-9173645', package_size: 10, total_lessons_purchased: 20 },
  { name: 'לאה מזרחי',     phone: '054-2819374', package_size: 8,  total_lessons_purchased: 16 },
  { name: 'מרים פרץ',      phone: '058-6430182', package_size: 10, total_lessons_purchased: 10 },
  { name: 'דינה ביטון',    phone: '050-7265839', package_size: 12, total_lessons_purchased: 24 },
  { name: 'יעל אברהם',     phone: '052-1938274', package_size: 10, total_lessons_purchased: 30 },
  { name: 'דבורה שפירא',   phone: '054-8374612', package_size: 10, total_lessons_purchased: 10 },
  { name: 'עדה גולדברג',   phone: '058-3019284', package_size: 8,  total_lessons_purchased: 8  },
  { name: 'נועה ברק',      phone: '050-5748291', package_size: 10, total_lessons_purchased: 20 },
  { name: 'תמר אמיר',      phone: '052-8461037', package_size: 10, total_lessons_purchased: 10 },
  { name: 'אביגיל שטיין',  phone: '054-2093748', package_size: 12, total_lessons_purchased: 12 },
  { name: 'שושנה גרינברג', phone: '058-7384920', package_size: 10, total_lessons_purchased: 40 },
  { name: 'אסתר בן-דוד',  phone: '050-4917263', package_size: 10, total_lessons_purchased: 20 },
  { name: 'רות חדד',       phone: '052-3820194', package_size: 8,  total_lessons_purchased: 24 },
  { name: 'חנה אשכנזי',    phone: '054-9274831', package_size: 10, total_lessons_purchased: 10 },
  { name: 'מיכל זהבי',     phone: '058-1839475', package_size: 10, total_lessons_purchased: 30 },
  { name: 'בתיה הררי',     phone: '050-6293817', package_size: 12, total_lessons_purchased: 12 },
  { name: 'נחמה יפרח',     phone: '052-4710293', package_size: 10, total_lessons_purchased: 20 },
  { name: 'זיוה אטיאס',    phone: '054-8302947', package_size: 10, total_lessons_purchased: 10 },
  { name: 'ורד כנפו',      phone: '058-2748103', package_size: 8,  total_lessons_purchased: 16 },
  { name: 'גלית דהן',      phone: '050-9183746', package_size: 10, total_lessons_purchased: 10 },
  { name: 'דליה אלוש',     phone: '052-5037481', package_size: 10, total_lessons_purchased: 20 },
  { name: 'אורית מלכה',    phone: '054-1829374', package_size: 12, total_lessons_purchased: 36 },
  { name: 'ענת בן-ארי',   phone: '058-7403918', package_size: 10, total_lessons_purchased: 10 },
  { name: 'שולמית נחום',   phone: '050-3918274', package_size: 10, total_lessons_purchased: 20 },
  { name: 'רינה פרידמן',   phone: '052-6284019', package_size: 8,  total_lessons_purchased: 8  },
  { name: 'טלי אלחדד',     phone: '054-9037284', package_size: 10, total_lessons_purchased: 10 },
  { name: 'עינת בוזגלו',   phone: '058-4819203', package_size: 10, total_lessons_purchased: 30 },
  { name: 'יפה רוזנברג',   phone: '050-7293841', package_size: 12, total_lessons_purchased: 24 },
  { name: 'נורית שלום',    phone: '052-1047382', package_size: 10, total_lessons_purchased: 10 },
];

const payload = clients.map(c => ({ ...c, active: true, is_mock: true }));

const { data, error } = await ttb.from('clients').insert(payload).select();

if (error) {
  console.error('שגיאה:', error.message);
  process.exit(1);
}

console.log(`✓ נוספו ${data.length} לקוחות לדוגמה`);
