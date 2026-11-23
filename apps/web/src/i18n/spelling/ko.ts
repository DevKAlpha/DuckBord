/**
 * Korean autocorrect: the most frequent 맞춤법 mistakes. Korean glues endings
 * and particles to the word (되요, 안되요, 몇일이), so the rules look at the
 * start or the end of the word instead of whole words. No capital letters.
 */
import type { SpellPack } from './engine';

const SYLLABLES = 0xac00;
/** Final consonant ㄹ (받침): 할, 갈, 줄. */
const endsInRieul = (syllable: string) => (syllable.charCodeAt(0) - SYLLABLES) % 28 === 8;

export const pack: SpellPack = {
  fixes: {
    구지: '굳이',
  },
  patterns: [
    // 되어요 -> 돼요, 되어서 -> 돼서: "되요" and "되서" are never right.
    [/되요$/, '돼요'],
    [/되서$/, '돼서'],
    [/됬/g, '됐'],
    // 할께요 -> 할게요 (after ㄹ only: 선생님께요 stays).
    [/([가-힣])께(요?)$/, (m, syllable, yo) => (endsInRieul(syllable) ? `${syllable}게${yo}` : m)],
    [/^몇일/, '며칠'],
    [/^오랫만/, '오랜만'],
    [/^어떻해/, '어떡해'],
    [/^웬지/, '왠지'],
    [/^왠만/, '웬만'],
    [/^금새/, '금세'],
    [/^역활/, '역할'],
    [/^희안/, '희한'],
    [/^어의없/, '어이없'],
    [/^설겆이/, '설거지'],
    [/^설레임/, '설렘'],
    [/^일일히/, '일일이'],
    [/^깨끗히/, '깨끗이'],
    [/^곰곰히/, '곰곰이'],
    [/^틈틈히/, '틈틈이'],
    [/^꼼꼼이/, '꼼꼼히'],
    [/^솔직이/, '솔직히'],
    [/^아니예요/, '아니에요'],
    // "않" is for 않다 after a verb; before one it is "안": 않해요 -> 안 해요.
    [/^않(해|돼|되|하)/, '안 $1'],
  ],
  sentenceCase: false,
};
