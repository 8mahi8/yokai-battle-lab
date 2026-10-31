/**
 * Data-only PRESENTATION names for our six ORIGINAL RENTAL CREATURES.
 * The supplied original 3DS footage visibly uses named full-field Soultimate
 * cutins (e.g. near 01:12/01:28). These are original placeholder names,
 * NOT copied original-character names and NOT authoritative move effects.
 *
 * To change a move's combat effect, edit/verify engine content independently.
 */
export const RENTAL_SOULTIMATE_TITLES=Object.freeze([
 '火花乱れ爪',     // あかねこ
 '若葉の吸命',     // こもれび (drain)
 '岩の戦鼓',       // いしもり (strength buff)
 '吹き荒ぶ風',     // すずかぜ (wind+weaken)
 '灯の再会',       // ほたる (revive/heal)
 '鋼の重圧'        // くろがね (defense debuff)
]);
export function soultimateDisplayTitle(actorId){
 if(typeof actorId!=='string'||!(/^[AB][1-6]$/).test(actorId))return 'ひっさつわざ';
 return RENTAL_SOULTIMATE_TITLES[Number(actorId[1])-1]??'ひっさつわざ';
}
