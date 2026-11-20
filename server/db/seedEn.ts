import { type GlossaryItem } from '../../src/types/index.ts';

export interface SeedEnEntry {
  title: string;
  excerpt: string;
  category: string;
  location: string;
  readTime: string;
  cta: string;
  previewParagraphs: string[];
  contentHtml: string;
  quote: string;
  quoteSource: string;
  glossary: GlossaryItem[];
}

export const seedBentoEn: Record<string, SeedEnEntry> = {
  coffee: {
    title: 'World Coffee Capital: From Basalt Red Soil to Sensory Fine Robusta',
    excerpt:
      'Journey from endless basalt coffee farms to the World Coffee Museum and an authentic Fine Robusta cup that awakens every sense.',
    category: 'Coffee Capital',
    location: 'Buôn Ma Thuột • Cư M’gar • Ea Tân',
    readTime: '5 min read',
    cta: 'Explore the Robusta journey',
    previewParagraphs: [
      'At 500–800 meters above sea level, Đắk Lắk’s fertile basalt red soil—enriched by ancient volcanic eruptions—creates a sanctuary for Robusta coffee. Beyond leading Vietnam in output, Buôn Ma Thuột is now pioneering a proud Fine Robusta specialty wave.',
      'At the World Coffee Museum, whose sweeping silhouette echoes traditional Ê Đê longhouses, visitors trace global coffee civilization before savoring a honey-processed Robusta with deep dark-chocolate notes.',
    ],
    contentHtml: `
      <p>At 500–800 meters above sea level, Đắk Lắk’s fertile basalt red soil—enriched by ancient volcanic eruptions—creates a sanctuary for Robusta coffee. Beyond leading Vietnam in output, Buôn Ma Thuột is now pioneering a proud Fine Robusta specialty wave.</p>
      <h2>From Red Basalt Hills to Specialty Roasteries</h2>
      <p>Across Cư M’gar and Ea Tân, a new generation of farmers selectively picks only 100% ripe red cherries, drying them slowly on raised beds under highland sun. The result overturns every stereotype about Robusta: layered sweetness, roasted hazelnut, and lingering cacao warmth.</p>
      <p>At the World Coffee Museum, whose sweeping silhouette echoes traditional Ê Đê longhouses, visitors trace global coffee civilization before savoring a honey-processed Robusta with deep dark-chocolate notes.</p>
    `,
    quote:
      '“Every cup of Buôn Ma Thuột coffee holds the essence of highland sun, wind, and the patience of farming hands.”',
    quoteSource: '— National Geographical Indication for Buôn Ma Thuột Coffee',
    glossary: [
      {
        term: 'Fine Robusta',
        def: 'CQI-certified specialty Robusta prized for dark chocolate, roasted nut notes, and sweet finish.',
      },
      {
        term: 'World Coffee Museum',
        def: 'Contemporary architectural landmark in Buôn Ma Thuột preserving over 10,000 coffee artifacts.',
      },
    ],
  },
  gong: {
    title: 'Space of Gong Culture: Resonances of the Great Forest Around Rượu Cần',
    excerpt:
      'A UNESCO Intangible Cultural Heritage of Humanity where highland bronze gongs echo beside jars of fermented rice wine in village nights.',
    category: 'Human Heritage',
    location: 'Ê Đê & M’nông Villages • Đắk Lắk',
    readTime: '6 min read',
    cta: 'Listen to forest resonances',
    previewParagraphs: [
      'In the spiritual life of the Ê Đê and M’nông peoples of Đắk Lắk, bronze gongs bridge humanity with the deities (Yàng) and the natural world. From ear-blowing rites for newborns to new-rice festivals and water-wharf prayers, the Knah gong ensemble stands at the heart of every ceremony.',
      'Gathering by a crackling fire inside a longhouse, sipping herb-fermented rượu cần rice wine while listening to deep gong cadences is when travelers touch the true soul of the Central Highlands.',
    ],
    contentHtml: `
      <p>In the spiritual life of the Ê Đê and M’nông peoples of Đắk Lắk, bronze gongs bridge humanity with the deities (Yàng) and the natural world. From ear-blowing rites for newborns to new-rice festivals and water-wharf prayers, the Knah gong ensemble stands at the heart of every ceremony.</p>
      <h2>The Living Dialogue of Bronze and Firelight</h2>
      <p>Each gong in a traditional ensemble carries its own voice and role, passing melodies from player to player like flowing mountain streams. Gathering by a crackling fire inside a longhouse, sipping herb-fermented rượu cần while listening to deep gong cadences is when travelers touch the true soul of the Central Highlands.</p>
    `,
    quote: '“Wherever the gongs resound, the sacred spirit of the great forest awakens.”',
    quoteSource: '— Space of Gong Culture in the Central Highlands (UNESCO)',
    glossary: [
      {
        term: 'Knah Gong Set',
        def: 'Traditional Ê Đê bronze gong ensemble featuring tuned gongs of varied sizes and pitches.',
      },
      {
        term: 'Rượu cần',
        def: 'Communal rice wine fermented with forest leaf yeast inside antique earthenware jars.',
      },
    ],
  },
  matriarchy: {
    title: 'Matriarchal Heritage: Ê Đê Longhouse Architecture & Carved Stairways',
    excerpt:
      'Distinctive beauty in Ê Đê longhouse architecture, crescent-carved mother stairways, and the gentle authority of highland women.',
    category: 'Matriarchal Culture',
    location: 'Buôn Ako Dhông • Buôn Ma Thuột',
    readTime: '6 min read',
    cta: 'Step inside the Longhouse',
    previewParagraphs: [
      'Under Ê Đê matriarchal tradition, women keep the family hearth and the youngest daughter inherits the ancestral home to care for her parents. Each time a daughter marries and welcomes her husband into the household, the timber longhouse extends by another structural bay.',
      'At the front porch, the main stairway is hand-carved from a single tree trunk bearing twin breasts and a crescent moon — a dignified tribute to maternal roots.',
    ],
    contentHtml: `
      <p>Under Ê Đê matriarchal tradition, women keep the family hearth and the youngest daughter inherits the ancestral home to care for her parents. Each time a daughter marries and welcomes her husband into the household, the timber longhouse extends by another structural bay.</p>
      <h2>Architecture That Grows With Generations</h2>
      <p>At the front porch, the main stairway is hand-carved from a single tree trunk bearing twin breasts and a crescent moon — a dignified tribute to maternal roots. Inside the welcoming hall stretches the monumental Kpan bench, carved from a single forest tree for ceremonial gong musicians.</p>
    `,
    quote:
      '“An Ê Đê longhouse grows with every marriage, sheltering generations of memory beneath one thatched roof.”',
    quoteSource: '— Indigenous Cultural Archives of Buôn Ako Dhông',
    glossary: [
      {
        term: 'Main Stairway',
        def: 'Single-trunk wooden stairs carved with maternal motifs honoring Ê Đê women.',
      },
      {
        term: 'Kpan Bench',
        def: 'Monolithic 10–20m wooden bench placed along the guest hall wall for gong performers.',
      },
    ],
  },
  waterfalls: {
    title: 'Wonders of Waterfalls & Natural Lakes: From Mighty Dray Nur to Serene Lake Lắk',
    excerpt:
      'A dramatic contrast between the 250m cascading curtain of Dray Nur – Dray Sáp and twilight reflections on Lake Lắk’s dugout canoes.',
    category: 'Natural Wonders',
    location: 'Sêrêpốk River & Lắk District',
    readTime: '5 min read',
    cta: 'Explore waterfalls & lakes',
    previewParagraphs: [
      'Đắk Lắk holds two captivating faces of nature: the roaring majesty of the Dray Nur – Dray Sáp – Gia Long waterfalls along the westward-flowing Sêrêpốk River, and the mirror-like stillness of 500-hectare Lake Lắk resting beneath Chư Yang Sin.',
      'Travelers can spend the morning trekking beneath basalt mist and the afternoon paddling a wooden dugout canoe into violet-gold lake twilight.',
    ],
    contentHtml: `
      <p>Đắk Lắk holds two captivating faces of nature: the roaring majesty of the Dray Nur – Dray Sáp – Gia Long waterfalls along the westward-flowing Sêrêpốk River, and the mirror-like stillness of 500-hectare Lake Lắk resting beneath Chư Yang Sin.</p>
      <h2>Roaring Basalt Cascades & Mirror Waters</h2>
      <p>Travelers can spend the morning trekking forest trails beneath roaring curtains of white water and the afternoon gliding across Lake Lắk in a hand-carved dugout canoe beside M’nông R’lâm lakeside villages.</p>
    `,
    quote:
      '“On one side, a symphony of water and basalt rock; on the other, a tranquil mirror reflecting highland skies.”',
    quoteSource: '— Đắk Lắk Eco-Discovery Guidebook',
    glossary: [
      {
        term: 'Dray Nur Waterfall',
        def: 'One of the Central Highlands’ grandest falls with a 250m-wide wall of cascading water.',
      },
      {
        term: 'Lake Lắk',
        def: 'The largest natural freshwater lake in the Central Highlands, home to M’nông R’lâm villages.',
      },
    ],
  },
  bandon: {
    title: 'Legends of Bản Đôn & Forest Elephants: Memories Along the Sêrêpốk River',
    excerpt:
      'Where Ê Đê, M’nông, and Lao cultures meet along the Sêrêpốk River, walking under Yok Đôn dipterocarp forests with ethical elephant care.',
    category: 'Highland Legends',
    location: 'Buôn Đôn • Yok Đôn National Park',
    readTime: '5 min read',
    cta: 'Uncover Bản Đôn legends',
    previewParagraphs: [
      'Nestled along the legendary Sêrêpốk River, Bản Đôn has long been celebrated for the elephant-taming heritage of its M’nông, Ê Đê, and Lao communities.',
      'Today, the region writes a humane new chapter through elephant-friendly ecotourism in Yok Đôn National Park — walking quietly beneath dry dipterocarp canopies to observe elephants roaming freely.',
    ],
    contentHtml: `
      <p>Nestled along the legendary Sêrêpốk River, Bản Đôn has long been celebrated for the elephant-taming heritage of its M’nông, Ê Đê, and Lao communities.</p>
      <h2>A Humane New Chapter in Yok Đôn</h2>
      <p>Today, the region writes a compassionate new chapter through elephant-friendly ecotourism in Yok Đôn National Park — walking quietly beneath dry dipterocarp canopies to observe elephants foraging naturally without riding.</p>
    `,
    quote:
      '“In Bản Đôn, elephants were never merely property; they were cherished companions like members of the family.”',
    quoteSource: '— Buôn Đôn Chronicles by the Sêrêpốk River',
    glossary: [
      {
        term: 'Yok Đôn Dipterocarp Forest',
        def: 'Vietnam’s only protected dry deciduous dipterocarp forest ecosystem.',
      },
      {
        term: 'Elephant-Friendly Tourism',
        def: 'No-riding observation experiences respecting animal welfare and natural habitats.',
      },
    ],
  },
  cuisine: {
    title: 'Symphony of Highland Cuisine: Rustic Forest Flavors Awakening the Palate',
    excerpt:
      'Awaken your taste buds with Bản Đôn grilled chicken with green chili salt, bamboo-tube sticky rice, Sêrêpốk catfish, and sweet lá bép soup.',
    category: 'Local Gastronomy',
    location: 'Buôn Ma Thuột • Bản Đôn • Lake Lắk',
    readTime: '4 min read',
    cta: 'Savor mountain flavors',
    previewParagraphs: [
      'Đắk Lắk cuisine harmonizes wild mountain ingredients with rustic hearth cooking: free-range Bản Đôn grilled chicken dipped in green bird’s-eye chili salt, fragrant bamboo-tube cơm lam sticky rice, and fresh catfish from the Sêrêpốk River.',
      'Unforgettable local signatures include sweet wild lá bép leaf soup with stream shrimp and savory pounded bitter eggplant.',
    ],
    contentHtml: `
      <p>Đắk Lắk cuisine harmonizes wild mountain ingredients with rustic hearth cooking: free-range Bản Đôn grilled chicken dipped in green bird’s-eye chili salt, fragrant bamboo-tube cơm lam sticky rice, and fresh catfish from the Sêrêpốk River.</p>
      <h2>From Longhouse Hearths to Street-Side Plates</h2>
      <p>Unforgettable local signatures include sweet wild lá bép leaf soup simmered with stream shrimp, bitter eggplant pounded with weaver-ant salt, and hot charcoal-grilled pork skewers enjoyed in cool evening mist.</p>
    `,
    quote:
      '“Every highland dish carries the fragrance of longhouse hearth smoke and the crisp freshness of the forest.”',
    quoteSource: '— Đắk Lắk Culinary Atlas',
    glossary: [
      {
        term: 'Lá bép soup',
        def: 'Naturally sweet wild forest greens cooked with stream shrimp or smoked meat.',
      },
      {
        term: 'Cơm lam',
        def: 'Upland glutinous rice soaked in spring water and slow-roasted inside young bamboo tubes.',
      },
    ],
  },
};

export const seedStoriesEn: Record<string, SeedEnEntry> = {
  're-1': {
    title: 'Keepers of the Fire Inside the Longhouse',
    excerpt:
      'The devotion of elder gong artisans who tirelessly pass down Knah gong rhythms to village youth night after night.',
    category: 'Knah Gong Artisan',
    location: 'Buôn Ako Dhông • Buôn Ma Thuột',
    readTime: '5 min read',
    cta: 'Hear the gong keeper’s story',
    previewParagraphs: [
      'As firelight flickers in the welcoming hall of the Ê Đê longhouse, elder Ama H’Loan’s weathered hands cradle each antique bronze gong. To him, every gong in the Knah ensemble holds its own spirit and voice.',
      'For over four decades, he has taught free weekend gong classes to village youth so the voice of the great forest never fades.',
    ],
    contentHtml: `
      <p>As firelight flickers in the welcoming hall of the Ê Đê longhouse, elder Ama H’Loan’s weathered hands cradle each antique bronze gong. To him, every gong in the Knah ensemble holds its own spirit and voice — from the deep lead gong setting the pulse to smaller gongs shimmering like forest streams.</p>
      <p>For over four decades, he has taught free weekend gong classes to village youth so the voice of the great forest never fades amid modern life.</p>
    `,
    quote:
      '“As long as the gongs ring beside the hearth, the soul of the Ê Đê endures on this red basalt land.”',
    quoteSource: '— Stories of Đắk Lắk Red Earth • Buôn Ako Dhông',
    glossary: [
      {
        term: 'Suggested Experience',
        def: 'Visit Buôn Ako Dhông in the early evening to hear live gong ensembles around the hearth.',
      },
      {
        term: 'Trip Integration',
        def: 'Easily pair with a 2D1N or 3D2N cultural itinerary in Buôn Ma Thuột.',
      },
    ],
  },
  're-2': {
    title: 'Morning Dew on March Coffee Blossoms',
    excerpt:
      'When the entire plateau turns snowy white and sweet floral fragrance beckons migratory honeybees.',
    category: 'March Blossom Season',
    location: 'Cư M’gar • Đắk Lắk',
    readTime: '5 min read',
    cta: 'Stroll through white blossoms',
    previewParagraphs: [
      'After the first spring irrigation, hundreds of thousands of hectares of coffee across Đắk Lắk burst into bloom over a few nights. Clusters of snow-white blossoms blanket the branches with a jasmine-like perfume.',
      'It is also the season when migratory beekeepers place hives beneath the canopy to harvest golden coffee-blossom honey.',
    ],
    contentHtml: `
      <p>After the first spring irrigation, hundreds of thousands of hectares of coffee across Đắk Lắk burst into bloom over a few nights. Clusters of snow-white blossoms blanket the branches with a jasmine-like perfume riding the morning breeze.</p>
      <p>It is also the season when migratory beekeepers place hives beneath the canopy to harvest golden, richly aromatic coffee-blossom honey found nowhere else.</p>
    `,
    quote:
      '“In March around Ban Mê, opening your window at dawn reveals an ocean of fragrant white snow.”',
    quoteSource: '— Stories of Đắk Lắk Red Earth • Cư M’gar',
    glossary: [
      {
        term: 'Peak Bloom Window',
        def: 'Typically late February to March right after the first orchard watering.',
      },
    ],
  },
  're-3': {
    title: 'The Westward-Flowing Sêrêpốk & Bản Đôn Memories',
    excerpt:
      'Legends of the mythic river that flows inland and embraces generations of M’nông and Ê Đê life.',
    category: 'River Legends',
    location: 'Buôn Đôn • Sêrêpốk Basin',
    readTime: '5 min read',
    cta: 'Follow the reverse river legend',
    previewParagraphs: [
      'Formed by the confluence of Krông Ana (Mother River) and Krông Nô (Father River), the Sêrêpốk flows westward into the Mekong rather than east to the sea, inspiring heroic legends across Bản Đôn.',
      'Under ancient banyan trees overhanging the riverbank, tales of legendary elephant guardians and living in harmony with nature are passed down through generations.',
    ],
    contentHtml: `
      <p>Formed by the confluence of Krông Ana (Mother River) and Krông Nô (Father River), the Sêrêpốk flows westward into the Mekong rather than east to the sea, inspiring heroic legends across Bản Đôn.</p>
      <p>Under ancient banyan trees overhanging the riverbank, tales of legendary elephant guardians and living in harmony with nature are passed down through generations.</p>
    `,
    quote: '“The Sêrêpốk flows counter to the current, just like the bold, free spirit of highland people.”',
    quoteSource: '— Stories of Đắk Lắk Red Earth • Buôn Đôn',
    glossary: [
      {
        term: 'Krông Ana & Krông Nô',
        def: 'The twin rivers whose confluence forms the legendary Sêrêpốk.',
      },
    ],
  },
  're-4': {
    title: 'Brocade Weaving Hands Beneath the Porch',
    excerpt:
      'Forest-bark dyed cotton threads woven into rhythmic motifs narrating mountains and rivers on Kpan cloth.',
    category: 'Traditional Brocade',
    location: 'Buôn Tơng Jú • Ea Kao',
    readTime: '5 min read',
    cta: 'Decode Kpan weaving motifs',
    previewParagraphs: [
      'At her back-strap loom under the longhouse eaves, an Ê Đê weaver patiently threads cotton dyed with kơ-nia bark, wild brown tubers, and indigo leaves. Without paper sketches, every diamond, mountain ridge, and stair motif lives in memory.',
      'A single finished textile can take months, carrying blessings of peace and highland pride.',
    ],
    contentHtml: `
      <p>At her back-strap loom under the longhouse eaves, an Ê Đê weaver patiently threads cotton dyed with kơ-nia bark, wild brown tubers, and indigo leaves. Without paper sketches, every diamond, mountain ridge, and stair motif lives in memory.</p>
      <p>A single finished textile can take months, carrying blessings of peace and the quiet pride of highland women.</p>
    `,
    quote: '“Every Kteh weave is a story of mountains and rivers written in cotton and forest colors.”',
    quoteSource: '— Stories of Đắk Lắk Red Earth • Buôn Tơng Jú',
    glossary: [
      {
        term: 'Kteh Brocade',
        def: 'Traditional handwoven Ê Đê cotton fabric colored with natural forest dyes.',
      },
    ],
  },
  're-5': {
    title: 'Dawn Breaking Over Lake Lắk',
    excerpt:
      'Dugout paddles parting silver mist as the first sunbeams brush the summit of Chư Yang Sin.',
    category: 'Lake Lắk Sunrise',
    location: 'Buôn Jun • Lắk District',
    readTime: '5 min read',
    cta: 'Paddle into sunrise mist',
    previewParagraphs: [
      'At 5:30 AM, 500-hectare Lake Lắk still slumbers beneath drifting silver mist. From Buôn Jun landing, dugout canoes carved from ancient sao tree trunks glide silently across the water.',
      'When sunrise crests Chư Yang Sin peak, the mirror-calm lake ignites in luminous amber gold.',
    ],
    contentHtml: `
      <p>At 5:30 AM, 500-hectare Lake Lắk still slumbers beneath drifting silver mist. From Buôn Jun landing, dugout canoes carved from ancient sao tree trunks glide silently across the water.</p>
      <p>When sunrise crests Chư Yang Sin peak, the mirror-calm lake ignites in luminous amber gold—a moment where time itself seems to pause.</p>
    `,
    quote: '“In a dugout canoe amidst Lake Lắk morning mist, time seems to stand completely still.”',
    quoteSource: '— Stories of Đắk Lắk Red Earth • Buôn Jun',
    glossary: [
      {
        term: 'Buôn Jun Landing',
        def: 'Lakeside M’nông village offering early-morning traditional dugout canoe rides.',
      },
    ],
  },
  're-6': {
    title: 'The Refined Bitterness of Pure-Roasted Coffee',
    excerpt:
      'Young growers leaving big cities to return to family farms and elevate Đắk Lắk’s Robusta beans.',
    category: 'Young Farmers',
    location: 'Ea Tân • Krông Năng',
    readTime: '5 min read',
    cta: 'Meet young farm guardians',
    previewParagraphs: [
      'Leaving behind fast-paced city life, young people from Đắk Lắk are returning to their family orchards to transform traditional coffee cultivation—picking only ripe red cherries, building solar drying greenhouses, and logging every fermentation batch.',
      'Thanks to their craft, Đắk Lắk Robusta has become a proud ambassador of Vietnamese specialty coffee.',
    ],
    contentHtml: `
      <p>Leaving behind fast-paced city life, young people from Đắk Lắk are returning to their family orchards to transform traditional coffee cultivation—picking only ripe red cherries, building solar drying greenhouses, and logging every fermentation batch.</p>
      <p>Thanks to their craft, Đắk Lắk Robusta has stepped beyond commodity bulk to become a proud ambassador of Vietnamese specialty coffee.</p>
    `,
    quote: '“When you honor every ripe coffee cherry, the basalt earth rewards you with its sweetest cup.”',
    quoteSource: '— Stories of Đắk Lắk Red Earth • Ea Tân',
    glossary: [
      {
        term: 'Solar Raised-Bed Drying',
        def: 'Controlled drying inside greenhouses that protects clean sweetness and fruity aromatics.',
      },
    ],
  },
  're-7': {
    title: 'The New Year Water-Wharf Thanksgiving Rite',
    excerpt:
      'A sacred ceremony thanking the water spirits for blessing the village with bountiful harvests and peace.',
    category: 'Water-Wharf Belief',
    location: 'Ancient Water Wharf • Buôn Ma Thuột',
    readTime: '5 min read',
    cta: 'Discover the Kpin Ea rite',
    previewParagraphs: [
      'To the Ê Đê people, the village water wharf is the sacred lifeline uniting the community. After the harvest, villagers gather for the Kpin Ea water-wharf ceremony to thank the water spirits and remind younger generations to protect headwater forests.',
      'Lively gong rhythms blend with cool spring water flowing through bamboo spouts.',
    ],
    contentHtml: `
      <p>To the Ê Đê people, the village water wharf is the sacred lifeline uniting the community. After the harvest, villagers gather for the Kpin Ea water-wharf ceremony to thank the water spirits and remind younger generations to protect headwater forests.</p>
      <p>Lively gong rhythms blend with cool spring water flowing through bamboo spouts in a vibrant celebration of ecological stewardship.</p>
    `,
    quote: '“Keeping the headwater forest green is how we keep the village spring flowing forever.”',
    quoteSource: '— Stories of Đắk Lắk Red Earth • Buôn Ma Thuột',
    glossary: [
      {
        term: 'Kpin Ea Ceremony',
        def: 'Annual Ê Đê thanksgiving ritual honoring water sources and forest conservation.',
      },
    ],
  },
  're-8': {
    title: 'Melodies of the T’rưng Xylophone in the Great Forest',
    excerpt:
      'Crystal-clear tones like cascading forest brooks crafted from humble fire-cured bamboo tubes.',
    category: 'Forest Instruments',
    location: 'Đắk Lắk Highlands',
    readTime: '5 min read',
    cta: 'Feel the bamboo melodies',
    previewParagraphs: [
      'Crafted from mature bamboo tubes cured over kitchen hearths, the T’rưng produces bright, rippling notes reminiscent of mountain waterfalls and wind rustling through highland bamboo groves.',
      'Under an artisan’s nimble mallets, simple bamboo tubes sing an optimistic hymn to nature and village life.',
    ],
    contentHtml: `
      <p>Crafted from mature bamboo tubes cured over kitchen hearths, the T’rưng produces bright, rippling notes reminiscent of mountain waterfalls and wind rustling through highland bamboo groves.</p>
      <p>Under an artisan’s nimble mallets, simple bamboo tubes sing an optimistic hymn to nature and village life.</p>
    `,
    quote: '“The T’rưng is a forest stream transformed into music in the hands of highland artisans.”',
    quoteSource: '— Stories of Đắk Lắk Red Earth • Central Highlands',
    glossary: [
      {
        term: 'T’rưng Xylophone',
        def: 'Traditional highland bamboo percussion instrument tuned by cutting graduated tube lengths.',
      },
    ],
  },
};
