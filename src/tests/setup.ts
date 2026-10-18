import {installNodeEnv} from './api/nodeEnv';
import {ResizeObserverMock} from './mocks/resizeObserver';

installNodeEnv();

vi.stubGlobal('ResizeObserver', ResizeObserverMock);

// jsdom's canvas has no bitmap backend: toDataURL throws, so every module that
// asks `IS_WEBP_SUPPORTED` at import time (`@environment/webpSupport` — the VKgram
// media components) fails to load. Real browsers answer `true` here.
// Node-env test files (`@vitest-environment node`) have no canvas at all — skip.
if(typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.toDataURL = () => 'data:image/webp';
}

// The Web K import graph needs these at module scope, before any test mounts
// anything: `apiManagerProxy` rewraps the worker constructors and attaches to
// the (never-spoken-to) worker port. No-op stubs keep the import alive; a test
// that needs real behaviour fakes the manager answers itself.
// NB: no global IntersectionObserver here — upstream's tests (richMessageBubble,
// …) rely on it being undefined in jsdom, with the components falling back to
// eager work; tests that import it (AnimationIntersector's graph) stub it
// locally via IntersectionObserverMock.

class PortStub {
  addEventListener() {}
  removeEventListener() {}
  postMessage() {}
  start() {}
  close() {}
}
vi.stubGlobal('Worker', class WorkerStub {
  addEventListener() {}
  removeEventListener() {}
  postMessage() {}
  terminate() {}
});
vi.stubGlobal('SharedWorker', class SharedWorkerStub {
  port = new PortStub();
  addEventListener() {}
  removeEventListener() {}
});
