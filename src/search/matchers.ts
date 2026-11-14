import { arabicMatcher, rootLetterMatcher } from './basic';
import { englishMatcher } from './english';
import { spellingMatcher } from './spelling';
import type { Matcher } from './types';
import { wordFormMatcher } from './wordFormMatcher';

/**
 * All exact matchers, run for every query. Each search goal adds its matcher here
 * (one line), so goals do not edit each other's files.
 */
export const MATCHERS: Matcher[] = [arabicMatcher, rootLetterMatcher, spellingMatcher, englishMatcher, wordFormMatcher];
