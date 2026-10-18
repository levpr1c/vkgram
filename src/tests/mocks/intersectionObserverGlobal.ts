import {IntersectionObserverMock} from './intersectionObserver';

// AnimationIntersector constructs an IntersectionObserver the moment its module
// graph loads; jsdom has none. Import this module FIRST in a test that needs it.
// A global stub in setup.ts is not an option: upstream's tests rely on
// IntersectionObserver being undefined there (richMessageBubble's eager
// hydration falls back only for `typeof IntersectionObserver === 'undefined'`).
if(typeof(window.IntersectionObserver) !== 'function') {
  vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
}
