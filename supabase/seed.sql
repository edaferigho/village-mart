-- ============================================================================
-- Village Mart — demo catalog seed
-- Run AFTER supabase/schema.sql (Supabase Dashboard → SQL Editor).
-- Prices are whole Naira, in the style of pricepally.com.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
insert into public.categories (slug, name, tagline, image_url, sort_order) values
  ('rice-grains',      'Rice & Grains',        'Bags of rice, beans & swallow staples', '/images/cat-rice-grains.jpg',      1),
  ('oils-fats',        'Cooking Oil & Fats',   'Groundnut, palm oil & more',            '/images/cat-oils-fats.jpg',        2),
  ('tomato-canned',    'Tomato Paste & Canned','Tinned tomatoes, sardines & mixes',     '/images/cat-tomato-canned.jpg',    3),
  ('pasta-noodles',    'Pasta & Noodles',      'Spaghetti, macaroni & instant noodles', '/images/cat-pasta-noodles.jpg',    4),
  ('beverages-dairy',  'Beverages & Dairy',    'Milo, milk, coffee & family tins',      '/images/cat-beverages-dairy.jpg',  5),
  ('spices-pantry',    'Spices & Pantry',      'Seasoning cubes, sugar & honey',        '/images/cat-spices-pantry.jpg',    6),
  ('fresh-frozen',     'Fresh & Frozen',       'Eggs, frozen chicken & farm produce',   '/images/cat-fresh-frozen.jpg',     7)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
insert into public.products
  (slug, name, brand, description, category_slug, unit_label, price, compare_at_price, image_url, badge, rating, sort_order)
values
  -- Rice & Grains ------------------------------------------------------------
  ('royal-stallion-parboiled-rice-50kg', 'Royal Stallion Parboiled Rice', 'Royal Stallion',
   'Premium long-grain parboiled rice — stone-free, well-milled and perfect for jollof, fried rice and everyday family meals. Sold in the popular 50kg wholesale bag.',
   'rice-grains', '50kg bag', 98500, 110000, '/images/products/royal-stallion-parboiled-rice-50kg.jpg', 'BESTSELLER', 4.8, 1),

  ('mama-gold-parboiled-rice-25kg', 'Mama Gold Parboiled Rice', 'Mama Gold',
   'Trusted household favourite — clean, aromatic parboiled rice in a family-size 25kg bag. Great value for weekly cooking.',
   'rice-grains', '25kg bag', 52000, null, '/images/products/mama-gold-parboiled-rice-25kg.jpg', null, 4.6, 2),

  ('caprice-perfumed-rice-10kg', 'Caprice Gold Perfumed Rice', 'Caprice',
   'Imported perfumed rice with a naturally sweet aroma and fluffy, non-sticky grains when cooked.',
   'rice-grains', '10kg bag', 24500, null, '/images/products/caprice-perfumed-rice-10kg.jpg', 'NEW', 4.5, 3),

  ('honeywell-honey-beans-2kg', 'Honeywell Honey Beans (Oloyin)', 'Honeywell',
   'Specially selected brown honey beans (oloyin) — naturally sweet, cooks fast and ideal for ewa agonyin and beans porridge.',
   'rice-grains', '2kg', 8900, null, '/images/products/honeywell-honey-beans-2kg.jpg', null, 4.4, 4),

  ('ijebu-garri-white-5kg', 'Ijebu Garri (White)', 'Village Mart Select',
   'Sour, finely-grained Ijebu garri that soaks beautifully — perfect for garri soakings and eba.',
   'rice-grains', '5kg', 6500, null, '/images/products/ijebu-garri-white-5kg.jpg', null, 4.3, 5),

  ('golden-penny-semovita-10kg', 'Golden Penny Semovita', 'Golden Penny',
   'Fortified semolina flour for smooth, lump-free swallow. A family-size 10kg bag that lasts.',
   'rice-grains', '10kg', 15800, null, '/images/products/golden-penny-semovita-10kg.jpg', null, 4.5, 6),

  -- Cooking Oil & Fats -------------------------------------------------------
  ('kings-vegetable-oil-5l', 'Kings Vegetable Oil', 'Kings',
   'Cholesterol-free refined vegetable oil for frying and cooking — light taste, high smoke point.',
   'oils-fats', '5L jerrycan', 18500, 21000, '/images/products/kings-vegetable-oil-5l.jpg', 'SALE', 4.6, 7),

  ('power-oil-vegetable-oil-2-8l', 'Power Oil Vegetable Oil', 'Power Oil',
   'Heart-friendly cooking oil made from refined palm olein. One of Nigeria''s best-selling kitchen oils.',
   'oils-fats', '2.8L', 10500, null, '/images/products/power-oil-vegetable-oil-2-8l.jpg', null, 4.5, 8),

  ('mamador-palm-oil-5l', 'Mamador Premium Palm Oil', 'Mamador',
   'Filter-red, cholesterol-free palm oil with rich colour and taste — ideal for banga, efo riro and stew.',
   'oils-fats', '5L', 19800, null, '/images/products/mamador-palm-oil-5l.jpg', 'BESTSELLER', 4.7, 9),

  ('golden-penny-margarine-500g', 'Golden Penny Margarine', 'Golden Penny',
   'Creamy baking margarine for cakes, pastries and bread spread.',
   'oils-fats', '500g', 3200, null, '/images/products/golden-penny-margarine-500g.jpg', null, 4.2, 10),

  -- Tomato Paste & Canned ----------------------------------------------------
  ('gino-tomato-paste-6x400g', 'Gino Tomato Paste', 'Gino',
   'Nigeria''s No.1 tomato mix — double-concentrated tinned tomatoes with no added colour. Pack of six 400g tins.',
   'tomato-canned', '400g × 6', 4800, 5400, '/images/products/gino-tomato-paste-6x400g.jpg', 'SALE', 4.7, 11),

  ('derica-tomato-paste-12x210g', 'Derica Tomato Paste', 'Derica',
   'Rich, smooth tomato paste in value-pack cartons — the stew starter every Nigerian kitchen trusts.',
   'tomato-canned', '210g × 12', 7900, null, '/images/products/derica-tomato-paste-12x210g.jpg', null, 4.5, 12),

  ('titus-sardines-10x125g', 'Titus Sardines in Vegetable Oil', 'Titus',
   'Classic Portuguese-style sardines — protein-rich and ready to eat. Family pack of ten 125g tins.',
   'tomato-canned', '125g × 10', 8500, null, '/images/products/titus-sardines-10x125g.jpg', null, 4.4, 13),

  -- Pasta & Noodles ----------------------------------------------------------
  ('indomie-instant-noodles-24x120g', 'Indomie Instant Noodles (Super Pack)', 'Indomie',
   'The famous indomie super pack with pepper and chicken flavour — ready in 3 minutes. Carton of 24.',
   'pasta-noodles', '120g × 24', 9800, null, '/images/products/indomie-instant-noodles-24x120g.jpg', 'BESTSELLER', 4.8, 14),

  ('golden-penny-spaghetti-10x500g', 'Golden Penny Spaghetti', 'Golden Penny',
   'Firm, non-sticky spaghetti made from durum wheat. Bundle of ten 500g packs.',
   'pasta-noodles', '500g × 10', 8200, null, '/images/products/golden-penny-spaghetti-10x500g.jpg', null, 4.5, 15),

  -- Beverages & Dairy --------------------------------------------------------
  ('milo-activ-go-1-8kg', 'Milo Activ-Go', 'Nestlé',
   'Malt chocolate drink fortified with Activ-Go vitamins and minerals — the family-sized 1.8kg tin.',
   'beverages-dairy', '1.8kg tin', 12400, 13900, '/images/products/milo-activ-go-1-8kg.jpg', 'SALE', 4.7, 16),

  ('nescafe-classic-200g', 'Nescafé Classic Coffee', 'Nestlé',
   '100% pure instant coffee with the rich, full aroma Nescafé is known for. 200g jar.',
   'beverages-dairy', '200g jar', 6900, null, '/images/products/nescafe-classic-200g.jpg', null, 4.5, 17),

  ('peak-milk-powder-900g', 'Peak Full Cream Milk Powder', 'Peak',
   'Rich, creamy full-cream milk powder in a refill pack — 30 cups of fortified goodness.',
   'beverages-dairy', '900g refill', 14900, null, '/images/products/peak-milk-powder-900g.jpg', 'NEW', 4.6, 18),

  -- Spices & Pantry ----------------------------------------------------------
  ('dangote-granulated-sugar-10kg', 'Dangote Granulated Sugar', 'Dangote',
   'Fine, free-flowing white granulated sugar — bulk 10kg bag for home and business.',
   'spices-pantry', '10kg bag', 16500, null, '/images/products/dangote-granulated-sugar-10kg.jpg', null, 4.4, 19),

  ('maggi-chicken-cubes-100x10g', 'Maggi Chicken Seasoning Cubes', 'Maggi',
   'The classic taste-maker — chicken-flavoured seasoning cubes with iodine and iron. Jumbo pack of 100.',
   'spices-pantry', '10g × 100', 5600, null, '/images/products/maggi-chicken-cubes-100x10g.jpg', null, 4.8, 20),

  ('pure-honey-1l', 'Natural Ijebu Honey', 'Village Mart Select',
   'Raw, unadulterated honey harvested from Ogun State farms — thick, aromatic and 100% natural.',
   'spices-pantry', '1L bottle', 12500, null, '/images/products/pure-honey-1l.jpg', 'NEW', 4.9, 21),

  -- Fresh & Frozen -----------------------------------------------------------
  ('village-mart-frozen-chicken-1kg', 'Frozen Chicken (Cut-up)', 'Village Mart Fresh',
   'Cleanly dressed, IQF-frozen chicken cut into 8 pieces — hygienically processed and cold-chain delivered.',
   'fresh-frozen', '1kg pack', 7500, null, '/images/products/village-mart-frozen-chicken-1kg.jpg', 'NEW', 4.3, 22),

  ('crate-of-eggs-30pcs', 'Crate of Eggs', 'Village Mart Fresh',
   'Farm-fresh big brown eggs, hand-crated and same-day delivered. 30 pieces per crate.',
   'fresh-frozen', '30 pieces', 6800, null, '/images/products/crate-of-eggs-30pcs.jpg', 'BESTSELLER', 4.7, 23)
on conflict (slug) do nothing;
