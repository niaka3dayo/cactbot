import Conditions from '../../../../../resources/conditions';
import { UnreachableCode } from '../../../../../resources/not_reached';
import Outputs from '../../../../../resources/outputs';
import { Responses } from '../../../../../resources/responses';
import {
  DirectionOutput8,
  DirectionOutputCardinal,
  DirectionOutputIntercard,
  Directions,
} from '../../../../../resources/util';
import ZoneId from '../../../../../resources/zone_id';
import { RaidbossData } from '../../../../../types/data';
import { TriggerSet } from '../../../../../types/trigger';

/* TO DO LIST
   - Electrope Edge 2 - call safe tile for non-sparking players?
   - Raining Swords/Chain Lightning - track order based on player's chosen side
   - Sword Quiver
*/
type Phase = 'door' | 'crosstail' | 'twilight' | 'midnight' | 'sunrise';

type NearFar = 'near' | 'far'; // wherever you are...
type InOut = 'in' | 'out';
type PartnersSpread = 'partners' | 'spread';
type NorthSouth = 'north' | 'south';
type LeftRight = 'left' | 'right';

type AetherialId = keyof typeof aetherialAbility;
type AetherialEffect = 'iceRight' | 'iceLeft' | 'fireRight' | 'fireLeft';
type ActorModelStateId = keyof typeof actorModelStates;
type ActorModelState = typeof actorModelStates[ActorModelStateId];
type MidnightState = 'gun' | 'wings';
type IonClusterDebuff = 'yellowShort' | 'yellowLong' | 'blueShort' | 'blueLong';
type SunriseCardinalPair = 'northSouth' | 'eastWest';

type DirectionCardinal = Exclude<DirectionOutputCardinal, 'unknown'>;
type DirectionIntercard = Exclude<DirectionOutputIntercard, 'unknown'>;
type ReplicaCleaveMap = {
  [K in DirectionCardinal]: {
    [D in LeftRight]: DirectionOutputIntercard[];
  };
};

type ReplicaData = {
  [id: string]: {
    location?: DirectionOutput8;
    cardinalFacing?: 'opposite' | 'adjacent';
    modelState?: ActorModelState;
    cannonColor?: 'yellow' | 'blue';
  };
};

const phaseMap: { [id: string]: Phase } = {
  '95F2': 'crosstail', // Cross Tail Switch
  '9623': 'twilight', // Twilight Sabbath
  '9AB9': 'midnight', // Midnight Sabbath
  '9ABA': 'sunrise', // Sunrise Sabbath
};

const actorControlCategoryMap = {
  'setModelState': '003F',
  'playActionTimeline': '0197',
  'vfxUnknown49': '0031',
} as const;

const actorModelStates = {
  '7': 'gun',
  '1C': 'towerDash',
  '1F': 'wings',
  '39': 'ionCannon',
} as const;

const aetherialAbility = {
  '9602': 'fireLeft',
  '9603': 'iceLeft',
  '9604': 'fireRight',
  '9605': 'iceRight',
} as const;

const isAetherialId = (id: string): id is AetherialId => {
  return id in aetherialAbility;
};

const isActorModelStateId = (param1: string): param1 is ActorModelStateId => {
  return Object.keys(actorModelStates).includes(param1);
};

// Replicas face center, so the half they cleave will render all those intercards unsafe.
const replicaCleaveUnsafeMap: ReplicaCleaveMap = {
  'dirN': {
    'left': ['dirNE', 'dirSE'],
    'right': ['dirNW', 'dirSW'],
  },
  'dirE': {
    'left': ['dirSE', 'dirSW'],
    'right': ['dirNW', 'dirNE'],
  },
  'dirS': {
    'left': ['dirSW', 'dirNW'],
    'right': ['dirNE', 'dirSE'],
  },
  'dirW': {
    'left': ['dirNW', 'dirNE'],
    'right': ['dirSE', 'dirSW'],
  },
};

// For now, call the in/out, the party safe spot, and the bait spot; users can customize.
// If/once standard strats develop, this would be a good thing to revisit.
const witchHuntAlertOutputStrings = {
  in: Outputs.in,
  out: Outputs.out,
  near: {
    en: 'Baits Close (Party Far)',
    ja: '自分が近づく (PTは離れる)',
  },
  far: {
    en: 'Baits Far (Party Close)',
    ja: '自分が離れる (PTは近づく)',
  },
  combo: {
    en: '${inOut} => ${bait}',
    ja: '${inOut} => ${bait}',
  },
  unknown: Outputs.unknown,
} as const;

const tailThrustOutputStrings = {
  iceLeft: {
    en: 'Double Knockback (<== Start on Left)',
    ja: '2回ノックバック (<== 左から)',
  },
  iceRight: {
    en: 'Double Knockback (Start on Right ==>)',
    ja: '2回ノックバック (右から ==>)',
  },
  fireLeft: {
    en: ' Start Front + Right ==>',
    ja: '正面開始 + 右へ ==>',
  },
  fireRight: {
    en: '<== Start Front + Left',
    ja: '<== 正面開始 + 左へ',
  },
  unknown: Outputs.unknown,
} as const;

const isCardinalDir = (dir: DirectionOutput8): dir is DirectionCardinal => {
  return (Directions.outputCardinalDir as string[]).includes(dir);
};

const isIntercardDir = (dir: DirectionOutput8): dir is DirectionIntercard => {
  return (Directions.outputIntercardDir as string[]).includes(dir);
};
export interface Data extends RaidbossData {
  phase: Phase;
  // Phase 1
  bewitchingBurstSafe?: InOut;
  hasForkedLightning: boolean;
  seenBasicWitchHunt: boolean;
  witchHuntBait?: NearFar;
  witchHuntAoESafe?: InOut;
  witchGleamCount: number;
  electromines: { [id: string]: DirectionOutputIntercard };
  electrominesSafe: DirectionOutputIntercard[];
  starEffect?: PartnersSpread;
  witchgleamSelfCount: number;
  condenserTimer?: 'short' | 'long';
  electronStreamSafe?: 'yellow' | 'blue';
  electronStreamSide?: NorthSouth;
  seenConductorDebuffs: boolean;
  conductionPointTargets: string[];
  // Phase 2
  replicas: ReplicaData;
  mustardBombTargets: string[];
  aetherialEffect?: AetherialEffect;
  twilightSafe: DirectionOutputIntercard[];
  replicaCleaveCount: number;
  secondTwilightCleaveSafe?: DirectionOutputIntercard;
  midnightCardFirst?: boolean;
  midnightFirstAdds?: MidnightState;
  midnightSecondAdds?: MidnightState;
  ionClusterDebuff?: IonClusterDebuff;
  sunriseCannons: string[];
  sunriseClones: string[];
  sunriseTowerSpots?: SunriseCardinalPair;
  seenFirstSunrise: boolean;
}

const triggerSet: TriggerSet<Data> = {
  id: 'AacLightHeavyweightM4Savage',
  zoneId: ZoneId.AacLightHeavyweightM4Savage,
  timelineFile: 'r4s.txt',
  initData: () => {
    return {
      phase: 'door',
      // Phase 1
      hasForkedLightning: false,
      seenBasicWitchHunt: false,
      witchGleamCount: 0,
      electromines: {},
      electrominesSafe: [],
      witchgleamSelfCount: 0,
      seenConductorDebuffs: false,
      conductionPointTargets: [],
      // Phase 2
      replicas: {},
      mustardBombTargets: [],
      twilightSafe: Directions.outputIntercardDir,
      replicaCleaveCount: 0,
      sunriseCannons: [],
      sunriseClones: [],
      seenFirstSunrise: false,
    };
  },
  timelineTriggers: [
    // Order: Soulshock => Impact x2 => Cannonbolt (entire sequence is ~9s).
    // None of these have StartsUsing lines or other lines that could be used for pre-warn triggers;
    // they seem to be entirely timeline based.  To avoid spam, use a single alert.
    {
      id: 'R4S Soulshock',
      regex: /Soulshock/,
      beforeSeconds: 4,
      durationSeconds: 13,
      response: Responses.bigAoe(),
    },
  ],
  triggers: [
    {
      id: 'R4S Phase Tracker',
      type: 'StartsUsing',
      netRegex: { id: Object.keys(phaseMap), source: 'Wicked Thunder' },
      suppressSeconds: 1,
      run: (data, matches) => {
        const phase = phaseMap[matches.id];
        if (phase === undefined)
          throw new UnreachableCode();

        data.phase = phase;
      },
    },

    // ***************** PHASE 1 ***************** //
    // General
    {
      id: 'R4S Wrath of Zeus',
      type: 'StartsUsing',
      netRegex: { id: '95EF', source: 'Wicked Thunder', capture: false },
      response: Responses.aoe(),
    },
    {
      id: 'R4S Wicked Bolt',
      type: 'HeadMarker',
      netRegex: { id: '013C' },
      condition: (data) => data.phase === 'door',
      response: Responses.stackMarkerOn(),
    },
    {
      id: 'R4S Wicked Jolt',
      type: 'StartsUsing',
      netRegex: { id: '95F0' },
      response: Responses.tankBusterSwap(),
    },

    // Witch Hunts
    {
      id: 'R4S Bewitching Flight',
      type: 'StartsUsing',
      netRegex: { id: '9671', source: 'Wicked Thunder', capture: false },
      infoText: (_data, _matches, output) => output.avoid!(),
      outputStrings: {
        avoid: {
          en: 'Avoid Front + Side Cleaves',
          ja: '正面 + 横からのビームを避けて',
        },
      },
    },
    {
      // We don't need to collect; we can deduce in/out based on any bursting line's x-pos.
      id: 'R4S Betwitching Flight Burst',
      type: 'StartsUsingExtra',
      netRegex: { id: '95EA' },
      suppressSeconds: 1,
      run: (data, matches) => {
        const x = parseFloat(matches.x);
        data.bewitchingBurstSafe = (x > 110 || x < 90) ? 'in' : 'out';
      },
    },
    {
      id: 'R4S Electrifying Witch Hunt',
      type: 'StartsUsing',
      netRegex: { id: '95E5', source: 'Wicked Thunder', capture: false },
      alertText: (data, _matches, output) => {
        if (data.bewitchingBurstSafe === undefined)
          return output.spreadAvoid!();
        const inOut = output[data.bewitchingBurstSafe]!();
        return output.combo!({ inOut: inOut, spread: output.spreadAvoid!() });
      },
      run: (data) => delete data.bewitchingBurstSafe,
      outputStrings: {
        in: Outputs.in,
        out: Outputs.out,
        spreadAvoid: {
          en: 'Spread (Avoid Side Cleaves)',
          ja: '散開 (横のビームを避けて)',
        },
        combo: {
          en: '${inOut} + ${spread}',
          ja: '${inOut} + ${spread}',
        },
      },
    },
    {
      id: 'R4S Witch Hunt Close/Far Collect',
      type: 'GainsEffect',
      // count: 2F6 = near, 2F7 = far
      netRegex: { effectId: 'B9A', count: ['2F6', '2F7'] },
      condition: (data) => data.seenBasicWitchHunt = false,
      run: (data, matches) => data.witchHuntBait = matches.count === '2F6' ? 'near' : 'far',
    },
    {
      id: 'R4S Forked Lightning Collect',
      type: 'GainsEffect',
      netRegex: { effectId: '24B' },
      condition: Conditions.targetIsYou(),
      run: (data) => data.hasForkedLightning = true,
    },
    {
      id: 'R4S Witch Hunt',
      type: 'StartsUsing',
      netRegex: { id: '95DE', source: 'Wicked Thunder', capture: false },
      delaySeconds: 0.2,
      alertText: (data, _matches, output) => {
        if (data.witchHuntBait === undefined || data.bewitchingBurstSafe === undefined)
          return;

        const inOut = output[data.bewitchingBurstSafe]!();
        const spread = data.witchHuntBait === 'near'
          ? (data.hasForkedLightning ? output.far!() : output.near!())
          : (data.hasForkedLightning ? output.near!() : output.far!());
        return output.combo!({ inOut: inOut, spread: spread });
      },
      run: (data) => data.seenBasicWitchHunt = true,
      outputStrings: {
        in: Outputs.in,
        out: Outputs.out,
        near: {
          en: 'Spread (Be Closer)',
          ja: '散開 (近づく)',
        },
        far: {
          en: 'Spread (Be Further)',
          ja: '散開 (離れる)',
        },
        combo: {
          en: '${inOut} + ${spread}',
          ja: '${inOut} + ${spread}',
        },
      },
    },
    // For Narrowing/Widening Witch Hunt, the cast determines the first in/out safe, and it swaps each time.
    // The B9A status effect count determines the first near/far bait, and it swaps each time.
    // To simplify this, we can collect the first ones of each, call them out, and then flip them for subsequent calls.
    {
      id: 'R4S Narrowing/Widening Witch Hunt Bait Collect',
      type: 'GainsEffect',
      // count: 2F6 = near, 2F7 = far
      netRegex: { effectId: 'B9A', count: ['2F6', '2F7'] },
      condition: (data) => data.seenBasicWitchHunt = true,
      suppressSeconds: 15,
      run: (data, matches) => data.witchHuntBait = matches.count === '2F6' ? 'near' : 'far',
    },
    {
      // Keep an infoText up during the entire mechanic with the order
      // 95E0 = Widening, 95E1 = Narrowing
      id: 'R4S Narrowing/Widening Witch Hunt General',
      type: 'StartsUsing',
      netRegex: { id: ['95E0', '95E1'], source: 'Wicked Thunder' },
      // Cast time is almost the same as the GainsEffect
      // so slight delay just in case there's a race condition issue
      delaySeconds: 0.2,
      durationSeconds: 24,
      infoText: (data, matches, output) => {
        // assumes Narrowing; if Widening, just reverse
        let aoeOrder: InOut[] = ['in', 'out', 'in', 'out'];

        if (matches.id === '95E0')
          aoeOrder = aoeOrder.reverse();
        data.witchHuntAoESafe = aoeOrder[0];

        // assumes Near first; if Far first, just reverse
        let baitOrder: NearFar[] = ['near', 'far', 'near', 'far'];
        if (data.witchHuntBait === undefined)
          baitOrder = [];
        else if (data.witchHuntBait === 'far')
          baitOrder = baitOrder.reverse();

        const baits: string[] = [];
        for (let i = 0; i < aoeOrder.length; ++i) {
          const inOut = aoeOrder[i]!;
          const bait = baitOrder[i] ?? output.unknown!();
          baits.push(output.baitStep!({ inOut: output[inOut]!(), bait: output[bait]!() }));
        }
        return output.baitCombo!({ allBaits: baits.join(output.separator!()) });
      },
      outputStrings: {
        in: Outputs.in,
        out: Outputs.out,
        near: {
          en: 'Close',
          ja: '近づく',
        },
        far: {
          en: 'Far',
          ja: '離れる',
        },
        separator: {
          en: ' => ',
          de: ' => ',
          ja: ' => ',
          cn: ' => ',
        },
        baitStep: {
          en: '${inOut} (${bait})',
          ja: '${inOut} (${bait})',
        },
        baitCombo: {
          en: 'Baits: ${allBaits}',
          ja: '誘導: ${allBaits}',
        },
        unknown: Outputs.unknown,
      },
    },
    {
      id: 'R4S Narrowing/Widening Witch Hunt First',
      type: 'StartsUsing',
      netRegex: { id: ['95E0', '95E1'], source: 'Wicked Thunder', capture: false },
      delaySeconds: 7,
      durationSeconds: 7,
      alertText: (data, _matches, output) => {
        const inOut = data.witchHuntAoESafe ?? output.unknown!();
        const bait = data.witchHuntBait ?? output.unknown!();

        // flip things for the next call
        if (data.witchHuntAoESafe !== undefined)
          data.witchHuntAoESafe = data.witchHuntAoESafe === 'in' ? 'out' : 'in';
        if (data.witchHuntBait !== undefined)
          data.witchHuntBait = data.witchHuntBait === 'near' ? 'far' : 'near';

        return output.combo!({ inOut: output[inOut]!(), bait: output[bait]!() });
      },
      outputStrings: witchHuntAlertOutputStrings,
    },
    {
      id: 'R4S Narrowing/Widening Witch Hunt Second',
      type: 'StartsUsing',
      netRegex: { id: ['95E0', '95E1'], source: 'Wicked Thunder', capture: false },
      delaySeconds: 14,
      durationSeconds: 3.2,
      alertText: (data, _matches, output) => {
        const inOut = data.witchHuntAoESafe ?? output.unknown!();
        const bait = data.witchHuntBait ?? output.unknown!();

        // flip things for the next call
        if (data.witchHuntAoESafe !== undefined)
          data.witchHuntAoESafe = data.witchHuntAoESafe === 'in' ? 'out' : 'in';
        if (data.witchHuntBait !== undefined)
          data.witchHuntBait = data.witchHuntBait === 'near' ? 'far' : 'near';

        return output.combo!({ inOut: output[inOut]!(), bait: output[bait]!() });
      },
      outputStrings: witchHuntAlertOutputStrings,
    },
    {
      id: 'R4S Narrowing/Widening Witch Hunt Third',
      type: 'StartsUsing',
      netRegex: { id: ['95E0', '95E1'], source: 'Wicked Thunder', capture: false },
      delaySeconds: 17.4,
      durationSeconds: 3.2,
      alertText: (data, _matches, output) => {
        const inOut = data.witchHuntAoESafe ?? output.unknown!();
        const bait = data.witchHuntBait ?? output.unknown!();

        // flip things for the next call
        if (data.witchHuntAoESafe !== undefined)
          data.witchHuntAoESafe = data.witchHuntAoESafe === 'in' ? 'out' : 'in';
        if (data.witchHuntBait !== undefined)
          data.witchHuntBait = data.witchHuntBait === 'near' ? 'far' : 'near';

        return output.combo!({ inOut: output[inOut]!(), bait: output[bait]!() });
      },
      outputStrings: witchHuntAlertOutputStrings,
    },
    {
      id: 'R4S Narrowing/Widening Witch Hunt Fourth',
      type: 'StartsUsing',
      netRegex: { id: ['95E0', '95E1'], source: 'Wicked Thunder', capture: false },
      delaySeconds: 20.8,
      durationSeconds: 3.2,
      alertText: (data, _matches, output) => {
        const inOut = data.witchHuntAoESafe ?? output.unknown!();
        const bait = data.witchHuntBait ?? output.unknown!();
        return output.combo!({ inOut: output[inOut]!(), bait: output[bait]!() });
      },
      outputStrings: witchHuntAlertOutputStrings,
    },

    // Electrope Edge 1 & 2
    {
      id: 'R4S Electrope Edge Positions',
      type: 'StartsUsing',
      netRegex: { id: '95C5', source: 'Wicked Thunder', capture: false },
      alertText: (data, _matches, output) => {
        // On the first cast, it will spwan intercardinal mines that are hit by Witchgleams.
        // On the second cast, players will be hit by Witchgleams.
        if (Object.keys(data.electromines).length === 0)
          return output.cardinals!();
        return output.protean!();
      },
      outputStrings: {
        cardinals: Outputs.cardinals,
        protean: Outputs.protean,
      },
    },
    {
      id: 'R4S Witchgleam Electromine Collect',
      type: 'AddedCombatant',
      netRegex: { name: 'Electromine' },
      condition: (data) => data.witchGleamCount === 0,
      run: (data, matches) => {
        const x = parseFloat(matches.x);
        const y = parseFloat(matches.y);
        // centerX = 100, centerY = 100 during phase 1
        const intercard = Directions.xyToIntercardDirOutput(x, y, 100, 100);
        data.electromines[matches.id] = intercard;
      },
    },
    {
      id: 'R4S Witchgleam Electromine Counter',
      type: 'Ability',
      netRegex: { id: '95C7', source: 'Wicked Thunder', target: 'Electromine', capture: false },
      suppressSeconds: 1,
      run: (data) => ++data.witchGleamCount,
    },
    {
      id: 'R4S Witchgleam Electromine Hit Collect',
      type: 'Ability',
      netRegex: { id: '95C7', source: 'Wicked Thunder', target: 'Electromine' },
      run: (data, matches) => {
        const mineId = matches.targetId;
        const mineDir = data.electromines[mineId];
        // Two mines get hit once, two get hit twice.  On the second hit, remove it as a safe spot.
        if (mineDir !== undefined) {
          if (data.electrominesSafe.includes(mineDir))
            data.electrominesSafe = data.electrominesSafe.filter((mine) => mine !== mineDir);
          else
            data.electrominesSafe.push(mineDir);
        }
      },
    },
    {
      id: 'R4S Four/Eight Star Effect Collect',
      type: 'GainsEffect',
      netRegex: { effectId: 'B9A', count: ['2F0', '2F1'] },
      run: (data, matches) => data.starEffect = matches.count === '2F0' ? 'partners' : 'spread',
    },
    {
      id: 'R4S Electrope Edge 1 Sidewise Spark',
      type: 'StartsUsing',
      // Base this on the Sidewise Spark cast, since it narrows us down to a single safe quadrant
      // Boss always faces north; 95EC = east cleave, 95ED = west cleave
      netRegex: { id: ['95EC', '95ED'], source: 'Wicked Thunder' },
      condition: (data) => data.witchGleamCount === 3,
      // Cast time is almost the same as the GainsEffect
      // so slight delay just in case there's a race condition issue
      delaySeconds: 0.2,
      alertText: (data, matches, output) => {
        const unsafeMap: { [id: string]: DirectionOutputIntercard[] } = {
          '95EC': ['dirNE', 'dirSE'],
          '95ED': ['dirNW', 'dirSW'],
        };

        const unsafeDirs = unsafeMap[matches.id] ?? [];
        data.electrominesSafe = data.electrominesSafe.filter((d) => !unsafeDirs.includes(d));
        const safeDir = data.electrominesSafe.length !== 1
          ? 'unknown'
          : data.electrominesSafe[0]!;
        const safeDirStr = output[safeDir]!();

        const starEffect = data.starEffect ?? 'unknown';
        const starEffectStr = output[starEffect]!();

        return output.combo!({ dir: safeDirStr, mech: starEffectStr });
      },
      run: (data) => {
        data.witchGleamCount = 0;
        delete data.starEffect;
      },
      outputStrings: {
        ...Directions.outputStringsIntercardDir,
        partners: Outputs.stackPartner,
        spread: Outputs.spread,
        combo: {
          en: '${dir} => ${mech}',
          ja: '${dir} => ${mech}',
        },
      },
    },
    {
      id: 'R4S Electrical Condenser Debuff Initial',
      type: 'GainsEffect',
      netRegex: { effectId: 'F9F', capture: true },
      condition: Conditions.targetIsYou(),
      infoText: (data, matches, output) => {
        data.condenserTimer = parseFloat(matches.duration) > 30 ? 'long' : 'short';
        // Long debuff players will pick up an extra stack later.
        // Just handle it here to cut down on trigger counts.
        if (data.condenserTimer === 'long')
          data.witchgleamSelfCount++;

        // Note: Taking unexpected lightning damage from Four/Eight Star, Sparks, or Sidewise Spark
        // will cause the stack count to increase. We could try to try to track that, but it makes
        // the final mechanic resolvable only under certain conditions (which still cause deaths),
        // so don't bother for now.  PRs welcome? :)

        return output[data.condenserTimer]!();
      },
      outputStrings: {
        short: {
          en: 'Short Debuff',
          ja: '短いデバフ',
        },
        long: {
          en: 'Long Debuff',
          ja: '長いデバフ',
        },
      },
    },
    {
      id: 'R4S Witchgleam Self Tracker',
      type: 'Ability',
      netRegex: { id: '9786' },
      condition: Conditions.targetIsYou(),
      run: (data) => data.witchgleamSelfCount++,
    },
    {
      id: 'R4S Electrical Condenser Debuff Expiring',
      type: 'GainsEffect',
      netRegex: { effectId: 'F9F', capture: true },
      condition: Conditions.targetIsYou(),
      delaySeconds: (_data, matches) => parseFloat(matches.duration) - 7,
      alertText: (data, _matches, output) => {
        return output.spread!({ stacks: data.witchgleamSelfCount });
      },
      outputStrings: {
        spread: {
          en: 'Spread (${stacks} stacks)',
          ja: '散開 (${stacks} 集合)',
        },
      },
    },
    {
      id: 'R4S Electrope Edge 2 Sidewise Spark',
      type: 'StartsUsing',
      // Boss always faces north; 95EC = east cleave, 95ED = west cleave
      netRegex: { id: ['95EC', '95ED'], source: 'Wicked Thunder' },
      condition: (data) => data.witchgleamSelfCount > 0,
      // Cast time is almost the same as the GainsEffect
      // so slight delay just in case there's a race condition issue
      delaySeconds: 0.2,
      alertText: (data, matches, output) => {
        const starEffect = data.starEffect ?? 'unknown';
        if (matches.id === '95EC')
          return output.combo!({ dir: output.west!(), mech: output[starEffect]!() });
        return output.combo!({ dir: output.east!(), mech: output[starEffect]!() });
      },
      outputStrings: {
        east: Outputs.east,
        west: Outputs.west,
        partners: Outputs.stackPartner,
        spread: Outputs.spread,
        unknown: Outputs.unknown,
        combo: {
          en: '${dir} => ${mech}',
          ja: '${dir} => ${mech}',
        },
      },
    },

    // Electron Streams
    {
      id: 'R4S Left Roll',
      type: 'Ability',
      netRegex: { id: '95D3', source: 'Wicked Thunder', capture: false },
      response: Responses.goLeft(),
    },
    {
      id: 'R4S Right Roll',
      type: 'Ability',
      netRegex: { id: '95D2', source: 'Wicked Thunder', capture: false },
      response: Responses.goRight(),
    },
    {
      id: 'R4S Electron Stream Debuff',
      type: 'GainsEffect',
      // FA0 - Positron (Yellow), blue safe
      // FA1 - Negatron (Blue), yellow safe
      netRegex: { effectId: ['FA0', 'FA1'] },
      condition: (data, matches) => data.me === matches.target && data.phase === 'door',
      run: (data, matches) =>
        data.electronStreamSafe = matches.effectId === 'FA0' ? 'blue' : 'yellow',
    },
    {
      id: 'R4S Electron Stream Initial',
      type: 'StartsUsing',
      // 95D6 - Yellow cannon north, Blue cannnon south
      // 95D7 - Blue cannon north, Yellow cannon south
      netRegex: { id: ['95D6', '95D7'], source: 'Wicked Thunder' },
      condition: (data) => !data.seenConductorDebuffs,
      alertText: (data, matches, output) => {
        if (data.electronStreamSafe === 'yellow')
          data.electronStreamSide = matches.id === '95D6' ? 'north' : 'south';
        else if (data.electronStreamSafe === 'blue')
          data.electronStreamSide = matches.id === '95D6' ? 'south' : 'north';

        const safeDir = data.electronStreamSide ?? 'unknown';
        if (data.role === 'tank')
          return output.tank!({ dir: output[safeDir]!() });
        return output.nonTank!({ dir: output[safeDir]!() });
      },
      outputStrings: {
        north: Outputs.north,
        south: Outputs.south,
        unknown: Outputs.unknown,
        tank: {
          en: '${dir} - Be in Front',
          ja: '${dir} - 正面へ',
        },
        nonTank: {
          en: '${dir} - Behind Tank',
          ja: '${dir} - タンクの後ろへ',
        },
      },
    },
    {
      id: 'R4S Electron Stream Subsequent',
      type: 'StartsUsing',
      // 95D6 - Yellow cannon north, Blue cannnon south
      // 95D7 - Blue cannon north, Yellow cannon south
      netRegex: { id: ['95D6', '95D7'], source: 'Wicked Thunder' },
      condition: (data) => data.seenConductorDebuffs,
      response: (data, matches, output) => {
        // cactbot-builtin-response
        output.responseOutputStrings = {
          swap: {
            en: 'Swap Sides',
            ja: '向きを入れ替える',
          },
          stay: {
            en: 'Stay',
            ja: 'そのまま',
          },
          unknown: Outputs.unknown,
          tank: {
            en: '${dir} - Be in Front',
            ja: '${dir} - 正面へ',
          },
          nonTank: {
            en: '${dir} - Behind Tank',
            ja: '${dir} - タンクの後ろへ',
          },
        };

        let safeSide: NorthSouth | 'unknown' = 'unknown';
        let dir: 'stay' | 'swap' | 'unknown' = 'unknown';

        if (data.electronStreamSafe === 'yellow')
          safeSide = matches.id === '95D6' ? 'north' : 'south';
        else if (data.electronStreamSafe === 'blue')
          safeSide = matches.id === '95D6' ? 'south' : 'north';

        if (safeSide !== 'unknown') {
          dir = safeSide === data.electronStreamSide ? 'stay' : 'swap';
          data.electronStreamSide = safeSide; // for the next comparison
        }

        const text = data.role === 'tank'
          ? output.tank!({ dir: output[dir]!() })
          : output.nonTank!({ dir: output[dir]!() });

        if (dir === 'stay')
          return { infoText: text };
        return { alertText: text };
      },
    },
    // For now, just call the debuff effect; likely to be updated when
    // strats are solidified?
    {
      id: 'R4S Conductor/Current Debuffs',
      type: 'GainsEffect',
      netRegex: { effectId: ['FA2', 'FA3', 'FA4', 'FA5', 'FA6'] },
      condition: Conditions.targetIsYou(),
      durationSeconds: 5,
      alertText: (_data, matches, output) => {
        switch (matches.effectId) {
          case 'FA2':
            return output.remoteCurrent!();
          case 'FA3':
            return output.proximateCurrent!();
          case 'FA4':
            return output.spinningConductor!();
          case 'FA5':
            return output.roundhouseConductor!();
          case 'FA6':
            return output.colliderConductor!();
        }
      },
      run: (data) => data.seenConductorDebuffs = true,
      outputStrings: {
        remoteCurrent: {
          en: 'Far Cone on You',
          ja: '自分に遠距離扇範囲',
        },
        proximateCurrent: {
          en: 'Near Cone on You',
          ja: '自分に近距離扇範囲',
        },
        spinningConductor: {
          en: 'Small AoE on You',
          ja: '自分に小さい円範囲',
        },
        roundhouseConductor: {
          en: 'Donut AoE on You',
          ja: '自分にドーナツ範囲',
        },
        colliderConductor: {
          en: 'Get Hit by Cone',
          ja: '扇範囲に当たって',
        },
      },
    },

    // Fulminous Field
    {
      id: 'R4S Conduction Point Collect',
      type: 'Ability',
      netRegex: { id: '98CE', source: 'Wicked Thunder' },
      run: (data, matches) => data.conductionPointTargets.push(matches.target),
    },
    {
      id: 'R4S Forked Fissures',
      type: 'Ability',
      netRegex: { id: '98CE', source: 'Wicked Thunder', capture: false },
      delaySeconds: 0.2,
      suppressSeconds: 1,
      alertText: (data, _matches, output) => {
        if (data.conductionPointTargets.includes(data.me))
          return output.far!();
        return output.near!();
      },
      run: (data) => data.conductionPointTargets = [],
      outputStrings: {
        near: {
          en: 'In Front of Partner',
          ja: '相方の正面へ',
        },
        far: {
          en: 'Behind Partner',
          ja: '相方の後ろへ',
        },
      },
    },

    // ***************** PHASE 2 ***************** //
    // General
    {
      id: 'R4S Replica ActorSetPos Data Collect',
      type: 'ActorSetPos',
      netRegex: { id: '4.{7}' },
      condition: (data) => data.phase !== 'door',
      run: (data, matches) => {
        const x = parseFloat(matches.x);
        const y = parseFloat(matches.y);
        const hdg = parseFloat(matches.heading);

        // centerX = 100, centerY = 165 during phase 2
        const locDir = Directions.xyTo8DirOutput(x, y, 100, 165);
        (data.replicas[matches.id] ??= {}).location = locDir;

        // Clones on cardinals facing cardinals could get a little messy - e.g., a NW facing clone
        // could be calculated as facing N or W depending on pixel difference & rounding.
        // To be safe, use the full 8-dir compass, and then adjust based on the clone's position
        // Note: We only care about heading for clones on cardinals during Sunrise Sabbath
        const hdgDir = Directions.outputFrom8DirNum(Directions.hdgTo8DirNum(hdg));
        if (isCardinalDir(locDir))
          (data.replicas[matches.id] ??= {}).cardinalFacing = isCardinalDir(hdgDir)
            ? 'opposite'
            : 'adjacent';
      },
    },
    {
      id: 'R4S Model State Collect',
      type: 'ActorControlExtra',
      netRegex: {
        id: '4.{7}',
        category: actorControlCategoryMap.setModelState,
        param1: Object.keys(actorModelStates),
      },
      condition: (data) => data.phase !== 'door',
      run: (data, matches) => {
        const id = matches.id;
        const modelStateId = matches.param1;
        if (!isActorModelStateId(modelStateId))
          throw new UnreachableCode();
        (data.replicas[id] ??= {}).modelState = actorModelStates[modelStateId];
      },
    },
    {
      id: 'R4S Azure Thunder',
      type: 'StartsUsing',
      netRegex: { id: '962F', source: 'Wicked Thunder', capture: false },
      response: Responses.aoe(),
    },
    {
      id: 'R4S Mustard Bomb Initial',
      type: 'StartsUsing',
      netRegex: { id: '961E', source: 'Wicked Thunder', capture: false },
      infoText: (data, _matches, output) =>
        data.role === 'tank' ? output.tank!() : output.nonTank!(),
      outputStrings: {
        tank: Outputs.tetherBusters,
        nonTank: Outputs.spread,
      },
    },
    {
      id: 'R4S Mustard Bomb Collect',
      type: 'Ability',
      // 961F - Mustard Bomb (tank tethers, x2)
      // 9620 - Kindling Cauldron (spread explosions, x4)
      netRegex: { id: ['961F', '9620'], source: 'Wicked Thunder' },
      run: (data, matches) => data.mustardBombTargets.push(matches.target),
    },
    {
      id: 'R4S Mustard Bomb Followup',
      type: 'Ability',
      netRegex: { id: '961F', source: 'Wicked Thunder', capture: false },
      delaySeconds: 0.2,
      suppressSeconds: 1,
      infoText: (data, _matches, output) => {
        if (!data.mustardBombTargets.includes(data.me))
          return output.getDebuff!();
      },
      run: (data) => data.mustardBombTargets = [],
      outputStrings: {
        getDebuff: {
          en: 'Get Debuff from Tank',
          ja: 'タンクからデバフを受け取って',
        },
      },
    },
    {
      id: 'R4S Wicked Special Sides',
      type: 'StartsUsing',
      netRegex: { id: '9610', source: 'Wicked Thunder', capture: false },
      condition: (data) => data.secondTwilightCleaveSafe === undefined,
      response: Responses.goSides(),
    },
    {
      id: 'R4S Wicked Special In',
      type: 'StartsUsing',
      netRegex: { id: '9612', source: 'Wicked Thunder', capture: false },
      condition: (data) => data.secondTwilightCleaveSafe === undefined,
      response: Responses.getIn(),
    },
    {
      id: 'R4S Aetherial Conversion',
      type: 'StartsUsing',
      netRegex: { id: Object.keys(aetherialAbility), source: 'Wicked Thunder' },
      durationSeconds: 7,
      infoText: (data, matches, output) => {
        if (!isAetherialId(matches.id))
          throw new UnreachableCode();
        // First time - no stored call (since it happens next), just save the effect
        const firstTime = data.aetherialEffect === undefined;
        data.aetherialEffect = aetherialAbility[matches.id];
        if (!firstTime)
          return output.stored!({ effect: output[data.aetherialEffect]!() });
      },
      outputStrings: {
        ...tailThrustOutputStrings,
        stored: {
          en: 'Stored: ${effect}',
          ja: 'あとで ${effect}',
        },
      },
    },
    {
      id: 'R4S Tail Thrust',
      type: 'StartsUsing',
      // 9606-9609 correspond to the id casts for the triggering Aetherial Conversion,
      // but we don't care which is which at this point because we've already stored the effect
      netRegex: { id: ['9606', '9607', '9608', '9609'], source: 'Wicked Thunder', capture: false },
      alertText: (data, _matches, output) => output[data.aetherialEffect ?? 'unknown']!(),
      outputStrings: tailThrustOutputStrings,
    },

    // Pre-Sabbaths
    {
      id: 'R4S Cross Tail Switch',
      type: 'StartsUsing',
      netRegex: { id: '95F2', source: 'Wicked Thunder', capture: false },
      delaySeconds: (data) => data.role === 'tank' ? 3 : 1,
      response: (data, _matches, output) => {
        // cactbot-builtin-response
        output.responseOutputStrings = {
          lb3: {
            en: 'LB3!',
            ja: 'タンクLB3!',
          },
        };

        if (data.role === 'tank')
          return { alarmText: output.lb3!() };
        return Responses.bigAoe();
      },
    },
    {
      id: 'R4S Wicked Blaze',
      type: 'HeadMarker',
      netRegex: { id: '013C', capture: false },
      condition: (data) => data.phase === 'crosstail',
      suppressSeconds: 1,
      infoText: (_data, _matches, output) => output.stacks!(),
      outputStrings: {
        stacks: Outputs.healerGroups,
      },
    },

    // Twilight Sabbath
    {
      id: 'R4S Wicked Fire',
      type: 'StartsUsing',
      netRegex: { id: '9630', source: 'Wicked Thunder', capture: false },
      infoText: (_data, _matches, output) => output.bait!(),
      outputStrings: {
        bait: Outputs.baitPuddles,
      },
    },
    {
      id: 'R4S Twilight Sabbath Sidewise Spark',
      type: 'GainsEffect',
      // count: 319 - add cleaves to its right, 31A - add cleaves to its left
      netRegex: { effectId: '808', count: ['319', '31A'] },
      condition: (data) => data.phase === 'twilight',
      alertText: (data, matches, output) => {
        data.replicaCleaveCount++;
        const dir = data.replicas[matches.targetId]?.location;
        if (dir === undefined || !isCardinalDir(dir))
          return;

        const cleaveDir = matches.count === '319' ? 'right' : 'left';
        const unsafeDirs = replicaCleaveUnsafeMap[dir][cleaveDir];
        data.twilightSafe = data.twilightSafe.filter((d) => !unsafeDirs.includes(d));

        if (data.replicaCleaveCount !== 2)
          return;
        const [safe0] = data.twilightSafe;
        if (safe0 === undefined)
          return;

        // on the first combo, set the second safe spot to unknown, and return the first safe spot
        // next time around, store the safe spot, so we can do a combined output with Wicked Special
        if (!data.secondTwilightCleaveSafe) {
          data.secondTwilightCleaveSafe = 'unknown';
          return output[safe0]!();
        }
        data.secondTwilightCleaveSafe = safe0;
      },
      run: (data) => {
        if (data.replicaCleaveCount !== 2)
          return;
        data.replicaCleaveCount = 0;
        data.twilightSafe = Directions.outputIntercardDir;
      },
      outputStrings: Directions.outputStringsIntercardDir,
    },
    {
      id: 'R4S Twilight Sabbath + Wicked Special',
      type: 'StartsUsing',
      netRegex: { id: ['9610', '9612'], source: 'Wicked Thunder' },
      condition: (data) => data.secondTwilightCleaveSafe !== undefined,
      alertText: (data, matches, output) => {
        const dir = data.secondTwilightCleaveSafe;
        if (dir === undefined)
          throw new UnreachableCode();

        return matches.id === '9610'
          ? output.combo!({ dir: output[dir]!(), inSides: output.sides!() })
          : output.combo!({ dir: output[dir]!(), inSides: output.in!() });
      },
      run: (data) => delete data.secondTwilightCleaveSafe,
      outputStrings: {
        ...Directions.outputStringsIntercardDir,
        in: Outputs.in,
        sides: Outputs.sides,
        combo: {
          en: '${dir} => ${inSides}',
          ja: '${dir} => ${inSides}',
        },
      },
    },

    // Midnight Sabbath
    {
      // ActorControl category vfxUnknown49 (0x0031) determines which sets of clones execute first
      // param1 = F4 executes first; param1 = F2 executes second
      // We already have the actor positions and wings/guns from `R4S Model State Collect`, but
      // since all lines arrive simultaneously, we need a short delay to let the collector run.
      id: 'R4S Midnight Sabbath First Adds',
      type: 'ActorControlExtra',
      netRegex: { id: '4.{7}', category: actorControlCategoryMap.vfxUnknown49, param1: 'F4' },
      condition: (data) => data.phase === 'midnight',
      delaySeconds: 0.5,
      suppressSeconds: 1, // we only need one
      run: (data, matches) => {
        const id = matches.id;
        const loc = data.replicas[id]?.location;
        const modelState = data.replicas[id]?.modelState;

        if (loc === undefined || modelState === undefined)
          return;

        data.midnightCardFirst = isCardinalDir(loc);
        data.midnightFirstAdds = modelState === 'wings' ? 'wings' : 'gun';
      },
    },
    {
      id: 'R4S Midnight Sabbath Second Adds',
      type: 'ActorControlExtra',
      netRegex: { id: '4.{7}', category: actorControlCategoryMap.vfxUnknown49, param1: 'F2' },
      condition: (data) => data.phase === 'midnight',
      delaySeconds: 0.5,
      suppressSeconds: 1, // we only need one
      run: (data, matches) => {
        const id = matches.id;
        const modelState = data.replicas[id]?.modelState;

        if (modelState === undefined)
          return;

        data.midnightSecondAdds = modelState === 'wings' ? 'wings' : 'gun';
      },
    },
    {
      id: 'R4S Concentrated/Scattered Burst 1',
      type: 'StartsUsing',
      // 962B - Concentrated Burst (Partners => Spread)
      // 962C - Scattered Burst (Spread => Partners)
      netRegex: { id: ['962B', '962C'], source: 'Wicked Thunder' },
      alertText: (data, matches, output) => {
        const firstMech = matches.id === '962B' ? 'partners' : 'spread';
        const firstMechStr = output[firstMech]!();

        if (data.midnightCardFirst === undefined || data.midnightFirstAdds === undefined)
          return firstMechStr;

        // If the next add is doing wings, that add is safe; if guns, the opposite is safe.
        const dirStr = data.midnightFirstAdds === 'wings'
          ? (data.midnightCardFirst ? output.cardinals!() : output.intercards!())
          : (data.midnightCardFirst ? output.intercards!() : output.cardinals!());

        return output.combo!({ dir: dirStr, mech: firstMechStr });
      },
      outputStrings: {
        combo: {
          en: '${dir} => ${mech}',
          ja: '${dir} => ${mech}',
        },
        cardinals: Outputs.cardinals,
        intercards: Outputs.intercards,
        partners: Outputs.stackPartner,
        spread: Outputs.spread,
      },
    },
    {
      id: 'R4S Concentrated/Scattered Burst 2',
      type: 'Ability', // use the ability line to trigger the second call for optimal timing
      // 962B - Concentrated Burst (Partners => Spread)
      // 962C - Scattered Burst (Spread => Partners)
      netRegex: { id: ['962B', '962C'], source: 'Wicked Thunder' },
      alertText: (data, matches, output) => {
        const secondMech = matches.id === '962B' ? 'spread' : 'partners';
        const secondMechStr = output[secondMech]!();

        if (data.midnightCardFirst === undefined || data.midnightFirstAdds === undefined)
          return secondMechStr;

        const secondAddsOnCards = !data.midnightCardFirst;

        // If the next add is doing wings, that add is safe; if guns, the opposite is safe.
        const dirStr = data.midnightSecondAdds === 'wings'
          ? (secondAddsOnCards ? output.cardinals!() : output.intercards!())
          : (secondAddsOnCards ? output.intercards!() : output.cardinals!());

        return output.combo!({ dir: dirStr, mech: secondMechStr });
      },
      outputStrings: {
        combo: {
          en: '${dir} => ${mech}',
          ja: '${dir} => ${mech}',
        },
        cardinals: Outputs.cardinals,
        intercards: Outputs.intercards,
        partners: Outputs.stackPartner,
        spread: Outputs.spread,
        unknown: Outputs.unknown,
      },
    },

    // Chain Lightning
    {
      id: 'R4S Flame Slash',
      type: 'StartsUsing',
      netRegex: { id: '9614', source: 'Wicked Thunder', capture: false },
      response: Responses.goSides(),
    },
    {
      id: 'R4S Raining Swords',
      type: 'Ability',
      // use the ability line of the preceding Flame Slash cast, as the cast time
      // for Raining Swords is very short.
      netRegex: { id: '9614', source: 'Wicked Thunder', capture: false },
      alertText: (_data, _matches, output) => output.towers!(),
      outputStrings: {
        towers: {
          en: 'Tower Positions',
          ja: '塔の位置へ',
        },
      },
    },

    // Sunrise Sabbath
    {
      id: 'R4S Ion Cluster Debuff Initial',
      type: 'GainsEffect',
      // FA0 - Positron (Yellow) (blue cannon)
      // FA1 - Negatron (Blue) (yellow cannon)
      // Long = 38s, Short = 23s
      netRegex: { effectId: ['FA0', 'FA1'] },
      condition: (data, matches) => {
        return data.me === matches.target &&
          data.phase === 'sunrise' &&
          data.ionClusterDebuff === undefined; // debuffs can get swapped/reapplied if you oopsie, so no spam
      },
      infoText: (data, matches, output) => {
        data.ionClusterDebuff = matches.effectId === 'FA0'
          ? (parseFloat(matches.duration) > 30 ? 'yellowLong' : 'yellowShort')
          : (parseFloat(matches.duration) > 30 ? 'blueLong' : 'blueShort');
        return output[data.ionClusterDebuff]!();
      },
      outputStrings: {
        yellowLong: {
          en: 'Long Yellow Debuff (Towers First)',
          ja: '黄色の長いデバフ (先に塔)',
        },
        blueLong: {
          en: 'Long Blue Debuff (Towers First)',
          ja: '青の長いデバフ (先に塔)',
        },
        yellowShort: {
          en: 'Short Yellow Debuff (Cannons First)',
          ja: '黄色の短いデバフ (先にビーム)',
        },
        blueShort: {
          en: 'Short Blue Debuff (Cannons First)',
          ja: '青の短いデバフ (先にビーム)',
        },
      },
    },
    {
      id: 'R4S Sunrise Sabbath Jumping Clone Collect 1',
      type: 'ActorControlExtra',
      netRegex: { id: '4.{7}', category: actorControlCategoryMap.setModelState, param1: '1C' },
      condition: (data) => data.phase === 'sunrise',
      // they both face opposite or adjacent, so we only need one to resolve the mechanic
      suppressSeconds: 1,
      run: (data, matches) => {
        const id = matches.id;
        const loc = data.replicas[id]?.location;
        const facing = data.replicas[id]?.cardinalFacing;

        if (loc === undefined || facing === undefined)
          return;

        data.sunriseClones.push(id);
        if (loc === 'dirN' || loc === 'dirS')
          data.sunriseTowerSpots = facing === 'opposite' ? 'northSouth' : 'eastWest';
        else if (loc === 'dirE' || loc === 'dirW')
          data.sunriseTowerSpots = facing === 'opposite' ? 'eastWest' : 'northSouth';
      },
    },
    // After clones jump for 1st towers, their model state does not change, but an ActorMove packet
    // is sent to change their location/heading.  There's really no need to continually track
    // actor/position heading and update data.replicas because we can set the data props we need
    // directly from a single ActorMove packet for the 2nd set of towers.
    {
      id: 'R4S Replica Jumping Clone Collect 2',
      type: 'ActorMove',
      netRegex: { id: '4.{7}' },
      condition: (data) => data.phase === 'sunrise' && data.seenFirstSunrise,
      suppressSeconds: 1, // only need one, and no other ActorMove packets near this time
      run: (data, matches) => {
        const id = matches.id;
        if (!data.sunriseClones.includes(id))
          return;

        const x = parseFloat(matches.x);
        const y = parseFloat(matches.y);
        const hdg = parseFloat(matches.heading);

        // centerX = 100, centerY = 165 during phase 2
        const locDir = Directions.xyTo4DirNum(x, y, 100, 165) % 2; // 0 = N/S, 1 = E/W
        const hdgDir = Directions.outputFrom8DirNum(Directions.hdgTo8DirNum(hdg));
        data.sunriseTowerSpots = isCardinalDir(hdgDir)
          ? (locDir === 0 ? 'northSouth' : 'eastWest') // opposite-facing
          : (locDir === 0 ? 'eastWest' : 'northSouth'); // adjacent-facing
      },
    },
    {
      id: 'R4S Sunrise Sabbath Cannon Color Collect',
      type: 'GainsEffect',
      // 2F4 = yellow cannnon, 2F5 = blue cannon
      netRegex: { effectId: 'B9A', count: ['2F4', '2F5'] },
      condition: (data) => data.phase === 'sunrise',
      run: (data, matches) => {
        const id = matches.targetId;
        const color = matches.count === '2F4' ? 'yellow' : 'blue';
        data.sunriseCannons.push(id);
        (data.replicas[id] ??= {}).cannonColor = color;
      },
    },
    {
      id: 'R4S Sunrise Sabbath Cannnons + Towers',
      type: 'GainsEffect',
      netRegex: { effectId: 'B9A', count: ['2F4', '2F5'], capture: false },
      condition: (data) => data.phase === 'sunrise',
      delaySeconds: 0.2,
      suppressSeconds: 1,
      alertText: (data, _matches, output) => {
        if (data.ionClusterDebuff === undefined || data.sunriseCannons.length !== 4)
          return;

        const blueCannons: DirectionOutputIntercard[] = [];
        const yellowCannons: DirectionOutputIntercard[] = [];
        data.sunriseCannons.forEach((id) => {
          const loc = data.replicas[id]?.location;
          const color = data.replicas[id]?.cannonColor;
          if (loc === undefined || color === undefined || !isIntercardDir(loc))
            return;
          (color === 'blue' ? blueCannons : yellowCannons).push(loc);
        });

        // Second time through, shorts and longs swap responsibilities
        const swapMap: Record<IonClusterDebuff, IonClusterDebuff> = {
          'yellowShort': 'yellowLong',
          'yellowLong': 'yellowShort',
          'blueShort': 'blueLong',
          'blueLong': 'blueShort',
        };
        const task = data.seenFirstSunrise ? swapMap[data.ionClusterDebuff] : data.ionClusterDebuff;

        // use bracket notatioon because cactbot eslint doesn't handle spread operators
        // in outputStrings; see #266 for more info
        let towerSoakStr = output['unknown']!();
        let cannonBaitStr = output['unknown']!();

        if (data.sunriseTowerSpots !== undefined) {
          towerSoakStr = output[data.sunriseTowerSpots]!();
          cannonBaitStr = data.sunriseTowerSpots === 'northSouth'
            ? output.eastWest!()
            : output.northSouth!();
        }

        if (task === 'yellowShort' || task === 'blueShort') {
          const cannonLocs = task === 'yellowShort' ? blueCannons : yellowCannons;
          const locStr = cannonLocs.map((loc) => output[loc]!()).join('/');
          return output[task]!({ loc: locStr, bait: cannonBaitStr });
        }
        return output[task]!({ bait: towerSoakStr });
      },
      run: (data) => {
        data.sunriseCannons = [];
        data.seenFirstSunrise = true;
        delete data.sunriseTowerSpots;
      },
      outputStrings: {
        ...Directions.outputStringsIntercardDir,
        northSouth: {
          en: 'N/S',
          ja: '南/北',
        },
        eastWest: {
          en: 'E/W',
          ja: '東/西',
        },
        yellowLong: {
          en: 'Soak Tower (${bait})',
          ja: '塔を踏む (${bait})',
        },
        blueLong: {
          en: 'Soak Tower (${bait})',
          ja: '塔を踏む (${bait})',
        },
        yellowShort: {
          en: 'Blue Cannon (${loc}) - Point ${bait}',
          ja: '青のビーム (${loc}) - 場所 ${bait}',
        },
        blueShort: {
          en: 'Yellow Cannon (${loc}) - Point ${bait}',
          ja: '黄色のビーム (${loc}) - 場所 ${bait}',
        },
      },
    },
    // Sword Quiver - 4th line based on original cast id: 95F9 - front, FA - mid, FB - back
  ],
};

export default triggerSet;
