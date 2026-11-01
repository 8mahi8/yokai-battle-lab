/**
 * Six original, lightweight vector familiars for the fixed six-unit rental squad.
 * Both players share the same visual roster, matching the battle engine.
 * All shapes are locally embedded SVG: no HTTP requests, no official game art,
 * no SVG filters, external <use>, animated attributes or imported fonts.
 *
 * Accessible creature names belong on their parent buttons; these portraits
 * are decorative and excluded from keyboard focus/accessibility tree.
 */
export const SPIRIT_DESIGNS=Object.freeze([
 Object.freeze({name:'あかねこ',role:'炎の猫',code:'embercat',color:'#E97652'}),
 Object.freeze({name:'こもれび',role:'木の精',code:'leafkin',color:'#78BF80'}),
 Object.freeze({name:'いしもり',role:'岩の守り手',code:'stoneguard',color:'#829CB6'}),
 Object.freeze({name:'すずかぜ',role:'風の狐',code:'breezefox',color:'#72C9DF'}),
 Object.freeze({name:'ほたる',role:'灯る虫',code:'glowbug',color:'#E2C568'}),
 Object.freeze({name:'くろがね',role:'鉄の守護者',code:'ironmask',color:'#8796B0'})
]);
const EDGE='#233447';
const designParts=[
 // 1: fire-tail cat. Sharp triangular ears, oversized cheek tufts and a
 // crescent ember tail are deliberately readable even at 44px.
 `<path d="M67 66Q93 57 78 33Q81 54 67 49" fill="#F6A24D" stroke="${EDGE}" stroke-width="4" stroke-linejoin="round"/>
 <path d="M75 26Q88 34 77 46L73 40Z" fill="#FFDC72"/>
 <path d="M22 35L19 8L38 24L51 20L74 5L71 36" fill="#CF644B" stroke="${EDGE}" stroke-width="4" stroke-linejoin="round"/>
 <path d="M24 19L27 30L36 28Z M61 25L69 17L67 31Z" fill="#F6CDB8"/>
 <ellipse cx="48" cy="65" rx="27" ry="23" fill="#D9785C" stroke="${EDGE}" stroke-width="4"/>
 <path d="M27 57Q21 43 29 31Q48 13 65 31Q75 43 67 59L58 65L39 65Z" fill="#F29E67" stroke="${EDGE}" stroke-width="3"/>
 <path d="M32 34L41 26L38 40L50 32L55 22L62 37" fill="#FFCA74"/>
 <ellipse cx="39" cy="47" rx="4.4" ry="6" fill="${EDGE}"/><ellipse cx="57" cy="47" rx="4.4" ry="6" fill="${EDGE}"/>
 <path d="M43 53L48 56L53 53" fill="#B5514E"/><path d="M39 60Q48 69 57 60" fill="none" stroke="${EDGE}" stroke-width="2.6" stroke-linecap="round"/>
 <path d="M22 56L13 52M24 64L13 65M72 56L82 52" stroke="#FFE0AD" stroke-width="2.7" stroke-linecap="round"/>
 <ellipse cx="31" cy="80" rx="10" ry="7" fill="#F9B27B" stroke="${EDGE}" stroke-width="3"/>
 <ellipse cx="63" cy="80" rx="10" ry="7" fill="#F9B27B" stroke="${EDGE}" stroke-width="3"/>
 <path d="M47 66L53 73L47 81L41 73Z" fill="#FCE0AE"/>`,
 // 2: leaf cap, asymmetrical canopy, short trunk feet, little vine scarf.
 `<path d="M30 48Q8 49 12 29Q21 36 37 33" fill="#73B787" stroke="${EDGE}" stroke-width="3.5"/>
 <path d="M63 49Q85 39 82 22Q67 30 56 34" fill="#69A982" stroke="${EDGE}" stroke-width="3.5"/>
 <path d="M48 19Q53 2 65 7Q60 18 51 27" fill="#C3E39B" stroke="${EDGE}" stroke-width="3"/>
 <path d="M47 26Q34 2 20 11Q22 27 37 32Q16 19 11 34Q23 53 44 37Q57 45 74 29Q77 8 56 17Z" fill="#69B87A" stroke="${EDGE}" stroke-width="4" stroke-linejoin="round"/>
 <path d="M26 18Q37 29 46 34Q56 24 64 19" fill="none" stroke="#D5F2A4" stroke-width="3" stroke-linecap="round"/>
 <path d="M26 48Q27 31 47 30Q69 32 68 50L65 70Q48 87 28 70Z" fill="#D8D9A7" stroke="${EDGE}" stroke-width="4"/>
 <path d="M28 58Q21 66 16 71M67 57Q72 67 79 70" fill="none" stroke="#90C68A" stroke-width="7" stroke-linecap="round"/>
 <ellipse cx="37" cy="52" rx="4" ry="5" fill="${EDGE}"/><ellipse cx="56" cy="52" rx="4" ry="5" fill="${EDGE}"/>
 <path d="M44 60Q47 64 51 60" fill="none" stroke="${EDGE}" stroke-width="2.7" stroke-linecap="round"/>
 <circle cx="31" cy="60" r="4" fill="#EFA99B" opacity=".78"/><circle cx="62" cy="60" r="4" fill="#EFA99B" opacity=".78"/>
 <path d="M32 74L26 83L40 85L46 74M54 74L57 84L70 83L65 72" fill="#A9B67E" stroke="${EDGE}" stroke-width="3" stroke-linejoin="round"/>
 <path d="M25 71Q47 84 66 70" fill="none" stroke="#5B9E78" stroke-width="5" stroke-linecap="round"/>`,
 // 3: broad angular stone totem. Square outer outline contrasts with 1/2.
 `<path d="M25 32L9 44L13 70L30 73L36 58M66 33L83 44L80 71L64 75L57 60" fill="#7C8FA3" stroke="${EDGE}" stroke-width="5" stroke-linejoin="round"/>
 <path d="M28 65L21 86L41 86L47 70M55 70L57 86L76 85L67 64" fill="#6E849C" stroke="${EDGE}" stroke-width="5" stroke-linejoin="round"/>
 <path d="M22 27L32 13L64 13L78 29L73 68L63 78L31 78L19 62Z" fill="#9EB1BF" stroke="${EDGE}" stroke-width="5" stroke-linejoin="round"/>
 <path d="M30 14L23 28L35 34L31 46L48 42L60 29L73 29" fill="none" stroke="#D0DEE0" stroke-width="4" stroke-linecap="round"/>
 <path d="M25 51L42 49L40 58L25 60Z M53 49L69 51L68 60L54 58Z" fill="#2C4658" stroke="${EDGE}" stroke-width="2.5"/>
 <path d="M34 53L38 53M57 53L63 53" stroke="#F1C97E" stroke-width="3.8" stroke-linecap="round"/>
 <path d="M47 28L54 39L47 45L40 39Z" fill="#71A6AF" stroke="${EDGE}" stroke-width="2.5"/>
 <path d="M41 66L47 62L53 67" fill="none" stroke="${EDGE}" stroke-width="4" stroke-linecap="round"/>
 <path d="M23 67L32 64M65 64L73 69" stroke="#DBEBE2" stroke-width="3" stroke-linecap="round"/>`,
 // 4: airy fox/wind spirit. Long ears, flowing cloud scarf and curled tail.
 `<path d="M64 72Q89 68 82 39Q74 58 65 51Q82 42 83 23Q65 33 59 43" fill="#7EDBE7" stroke="${EDGE}" stroke-width="3.6" stroke-linejoin="round"/>
 <path d="M20 35L26 3L44 29L63 4L68 35" fill="#79BCD4" stroke="${EDGE}" stroke-width="4" stroke-linejoin="round"/>
 <path d="M28 13L31 32L38 30Z M56 28L62 14L62 31Z" fill="#DDF5F0"/>
 <ellipse cx="46" cy="62" rx="25" ry="25" fill="#A1DEE5" stroke="${EDGE}" stroke-width="4"/>
 <path d="M28 55Q22 41 31 33Q47 23 61 33Q73 46 62 58Q49 69 31 58Z" fill="#D9F5EE" stroke="${EDGE}" stroke-width="3"/>
 <path d="M31 38Q44 29 56 38" fill="none" stroke="#8BC6D9" stroke-width="4" stroke-linecap="round"/>
 <path d="M34 48Q39 44 44 49M51 49Q56 44 61 48" fill="none" stroke="${EDGE}" stroke-width="3.3" stroke-linecap="round"/>
 <circle cx="48" cy="55" r="3" fill="#527E8E"/><path d="M42 59Q49 65 55 59" fill="none" stroke="#527E8E" stroke-width="2.5" stroke-linecap="round"/>
 <path d="M17 70Q41 57 71 72Q54 84 37 75" fill="#5AAEBF" stroke="${EDGE}" stroke-width="3" stroke-linejoin="round"/>
 <path d="M24 75Q18 83 11 77M65 80Q80 83 83 77" fill="none" stroke="#BDEBF2" stroke-width="4" stroke-linecap="round"/>
 <path d="M36 83L31 88M59 84L64 88" stroke="${EDGE}" stroke-width="5" stroke-linecap="round"/>`,
 // 5: golden lantern firefly. Wings and antenna silhouette visible at 44px.
 `<path d="M34 39Q12 22 11 45Q14 61 34 61M60 39Q83 21 85 46Q78 64 62 61" fill="#B2E6DB" stroke="${EDGE}" stroke-width="3.5"/>
 <path d="M38 24L32 11M56 24L63 11" stroke="${EDGE}" stroke-width="3.6" stroke-linecap="round"/>
 <circle cx="32" cy="9" r="6.8" fill="#FFE9A5" stroke="${EDGE}" stroke-width="2.6"/>
 <circle cx="64" cy="9" r="6.8" fill="#FFE9A5" stroke="${EDGE}" stroke-width="2.6"/>
 <ellipse cx="48" cy="61" rx="27" ry="28" fill="#775F88" stroke="${EDGE}" stroke-width="4.5"/>
 <path d="M24 58Q25 38 45 34Q69 33 73 59" fill="#9A83A5" stroke="${EDGE}" stroke-width="3.5"/>
 <ellipse cx="48" cy="66" rx="18" ry="16" fill="#FFE49E" stroke="#F5BD71" stroke-width="3"/>
 <path d="M35 63Q42 57 51 62Q61 67 62 73" fill="none" stroke="#FFFADE" stroke-width="3.4" stroke-linecap="round"/>
 <ellipse cx="37" cy="48" rx="4" ry="5" fill="${EDGE}"/><ellipse cx="59" cy="48" rx="4" ry="5" fill="${EDGE}"/>
 <path d="M44 53Q48 57 52 53" fill="none" stroke="${EDGE}" stroke-width="2.4"/>
 <circle cx="32" cy="56" r="3" fill="#DFAEA2"/><circle cx="64" cy="56" r="3" fill="#DFAEA2"/>
 <path d="M30 77L23 86M63 77L69 85" stroke="${EDGE}" stroke-width="6" stroke-linecap="round"/>`,
 // 6: angular iron helmet, two horns, massive steel shoulders and red slit.
 `<path d="M29 32L15 9L38 23M65 32L83 8L58 23" fill="#8198AB" stroke="${EDGE}" stroke-width="5" stroke-linejoin="round"/>
 <path d="M26 60Q12 55 13 76L28 84L39 76M66 59Q83 52 84 76L69 85L58 76" fill="#62778A" stroke="${EDGE}" stroke-width="4.5" stroke-linejoin="round"/>
 <path d="M31 63L24 88L43 87L48 74M52 74L55 87L73 87L65 62" fill="#4C667B" stroke="${EDGE}" stroke-width="4" stroke-linejoin="round"/>
 <path d="M23 31L33 19L63 19L74 31L70 61L59 76L36 76L24 62Z" fill="#98A8B8" stroke="${EDGE}" stroke-width="5" stroke-linejoin="round"/>
 <path d="M32 31L64 31L69 45L61 49L34 49L27 44Z" fill="#31495C" stroke="${EDGE}" stroke-width="3"/>
 <path d="M33 40L44 42M53 42L63 39" stroke="#FD9D7F" stroke-width="5" stroke-linecap="round"/>
 <path d="M46 20L53 31L47 40L41 31Z" fill="#E4D6AC" stroke="${EDGE}" stroke-width="2"/>
 <path d="M37 55L47 62L57 55L57 67L37 67Z" fill="#526A80" stroke="${EDGE}" stroke-width="3"/>
 <path d="M34 71L24 77M60 72L70 77" stroke="#BCD1D5" stroke-width="3.5" stroke-linecap="round"/>`
];

const fallback='<ellipse cx="48" cy="53" rx="28" ry="30" fill="#9cb7c4" stroke="#233447" stroke-width="4"/><circle cx="40" cy="52" r="4" fill="#233447"/><circle cx="56" cy="52" r="4" fill="#233447"/>';
/** Match-protocol IDs A1..A6/B1..B6 or static roster index (0..5). */
export function spiritIndex(value){
 if(Number.isInteger(value))return value>=0&&value<6?value:-1;
 if(typeof value==='string'&&/^[AB][1-6]$/.test(value))return Number(value[1])-1;
 return -1;
}
export function renderSpiritPortrait(id,{mini=false}={}){
 const index=spiritIndex(id);
 const body=index>=0?designParts[index]:fallback;
 const label=index>=0?SPIRIT_DESIGNS[index].code:'unknown';
 return '<svg class="mb-character-art'+(mini?' mb-mini-art':'')+
  '" data-design="'+label+'" width="48" height="48" viewBox="0 0 96 96" '+
  'xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">'+
  body+'</svg>';
}
