/* eslint-env qunit */
import TestHelpers from './test-helpers.js';
import sinon from 'sinon';
import window from 'global/window';
import * as middleware from '../../src/js/tech/middleware.js';

QUnit.module('Play', {
  beforeEach() {
    this.clock = sinon.useFakeTimers();
  },
  afterEach() {
    this.clock.restore();
    // remove added middleware
    Object.keys(middleware.middlewares).forEach(function(k) {
      delete middleware.middlewares[k];
    });
    middleware.middlewareInstances = {};
  }
});

if (window.Promise) {
  QUnit.test('play promise should resolve to native promise if returned', function(assert) {
    const player = TestHelpers.makePlayer({});
    const done = assert.async();

    player.src({
      src: 'http://example.com/video.mp4',
      type: 'video/mp4'
    });

    this.clock.tick(1);

    player.tech_.play = () => window.Promise.resolve('foo');
    const p = player.play();

    assert.ok(p, 'play returns something');
    assert.equal(typeof p.then, 'function', 'play returns a promise');
    p.then(function(val) {
      assert.equal(val, 'foo', 'should resolve to native promise value');

      player.dispose();
      done();
    });
  });
}

QUnit.test('play promise should resolve to native value if returned', function(assert) {
  const done = assert.async();
  const player = TestHelpers.makePlayer({});

  player.src({
    src: 'http://example.com/video.mp4',
    type: 'video/mp4'
  });

  this.clock.tick(1);

  player.tech_.play = () => 'foo';
  const p = player.play();

  const finish = (v) => {
    assert.equal(v, 'foo', 'play returns foo');
    player.dispose();
    done();
  };

  if (typeof p === 'string') {
    finish(p);
  } else {
    p.then((v) => {
      finish(v);
    });
  }
});

QUnit.test('Player#play() works before Player#src()', function(assert) {
  const done = assert.async();
  const player = TestHelpers.makePlayer({});

  const p = player.play();

  player.src({
    src: 'http://example.com/video.mp4',
    type: 'video/mp4'
  });

  // mock tech play
  player.tech_.play = () => 'foo';
  // wait for source set
  this.clock.tick(1);
  player.tech_.trigger('loadstart');

  const finish = (v) => {
    assert.equal(v, 'foo', 'play returns foo');
    player.dispose();
    done();
  };

  if (typeof p === 'string') {
    finish(p);
  } else {
    p.then((v) => {
      finish(v);
    });
  }
});

QUnit.test('Player#play() works after Player#src()', function(assert) {
  const done = assert.async();
  const player = TestHelpers.makePlayer({});

  player.src({
    src: 'http://example.com/video.mp4',
    type: 'video/mp4'
  });

  const p = player.play();

  // mock tech play
  player.tech_.play = () => 'foo';
  // wait for source set
  this.clock.tick(1);
  player.tech_.trigger('loadstart');

  const finish = (v) => {
    assert.equal(v, 'foo', 'play returns foo');
    player.dispose();
    done();
  };

  if (typeof p === 'string') {
    finish(p);
  } else {
    p.then((v) => {
      finish(v);
    });
  }
});

QUnit.test('Player#play() works after Player#src() after changinSrc_ false', function(assert) {
  const done = assert.async();
  const player = TestHelpers.makePlayer({});

  player.src({
    src: 'http://example.com/video.mp4',
    type: 'video/mp4'
  });

  // mock tech play
  player.tech_.play = () => 'foo';
  // wait for source set
  this.clock.tick(1);

  const p = player.play();

  player.tech_.trigger('loadstart');

  const finish = (v) => {
    assert.equal(v, 'foo', 'play returns foo');
    player.dispose();
    done();
  };

  if (typeof p === 'string') {
    finish(p);
  } else {
    p.then((v) => {
      finish(v);
    });
  }
});

QUnit.test('Player#play() works after Player#src() after loadstart', function(assert) {
  const done = assert.async();
  const player = TestHelpers.makePlayer({});

  player.src({
    src: 'http://example.com/video.mp4',
    type: 'video/mp4'
  });

  // mock tech play
  player.tech_.play = () => 'foo';
  // wait for source set
  this.clock.tick(1);

  player.tech_.trigger('loadstart');

  const p = player.play();

  const finish = (v) => {
    assert.equal(v, 'foo', 'play returns foo');
    player.dispose();
    done();
  };

  if (typeof p === 'string') {
    finish(p);
  } else {
    p.then((v) => {
      finish(v);
    });
  }
});

QUnit.test('Player#play() works after middleware terminate and Player#play()', function(assert) {
  let terminate = true;
  let playTerminated = 0;

  middleware.use('*', function() {
    return {
      // pass along source
      setSource(srcObj, next) {
        next(null, srcObj);
      },
      callPlay() {
        if (terminate) {
          return middleware.TERMINATOR;
        }
      }
    };
  });
  const done = assert.async(2);
  const player = TestHelpers.makePlayer({});

  player.one('playterminated', () => playTerminated++);
  player.src({
    src: 'http://example.com/video.mp4',
    type: 'video/mp4'
  });

  // mock tech play
  player.tech_.play = () => 'foo';
  // wait for source set
  this.clock.tick(1);

  player.tech_.trigger('loadstart');

  const p = player.play();

  terminate = false;

  // this should finish the other callback
  const p2 = player.play();

  let callCount = 0;

  const finish = (v) => {
    callCount++;
    assert.equal(v, 'foo', 'play returns foo');
    assert.equal(playTerminated, 1, 'play was terminated once');
    if (callCount === 2) {
      player.dispose();
    }
    done();
  };

  if (typeof p === 'string') {
    finish(p);
  } else {
    p.then((v) => {
      finish(v);
    });
  }

  if (typeof p2 === 'string') {
    finish(p2);
  } else {
    p2.then((v) => {
      finish(v);
    });
  }
});

QUnit.test('Player#play() works after middleware terminate and play event', function(assert) {
  let terminate = true;
  let playTerminated = 0;

  middleware.use('*', function() {
    return {
      // pass along source
      setSource(srcObj, next) {
        next(null, srcObj);
      },
      callPlay() {
        if (terminate) {
          return middleware.TERMINATOR;
        }
      }
    };
  });
  const done = assert.async();
  const player = TestHelpers.makePlayer({});

  player.src({
    src: 'http://example.com/video.mp4',
    type: 'video/mp4'
  });
  player.one('playterminated', () => playTerminated++);

  // mock tech play
  player.tech_.play = () => 'foo';
  // wait for source set
  this.clock.tick(1);

  player.tech_.trigger('loadstart');

  const p = player.play();

  terminate = false;

  // this should finish the other callback
  player.tech_.trigger('play');

  const finish = (v) => {
    assert.equal(playTerminated, 1, 'play was terminated once');
    assert.equal(v, 'foo', 'play returns foo');
    player.dispose();

    done();
  };

  if (typeof p === 'string') {
    finish(p);
  } else {
    p.then((v) => {
      finish(v);
    });
  }

});

QUnit.test('Player#play() works after autoplay is middleware terminated', function(assert) {
  let terminate = true;
  let playTerminated = 0;

  middleware.use('*', function() {
    return {
      // pass along source
      setSource(srcObj, next) {
        next(null, srcObj);
      },
      callPlay() {
        if (terminate) {
          return middleware.TERMINATOR;
        }
      }
    };
  });
  const done = assert.async();
  const player = TestHelpers.makePlayer({autoplay: 'muted'});

  player.one('playterminated', () => playTerminated++);

  player.src({
    src: 'http://example.com/video.mp4',
    type: 'video/mp4'
  });

  // mock tech play
  player.tech_.play = () => 'foo';
  // wait for source set
  this.clock.tick(1);

  player.tech_.trigger('loadstart');
  terminate = false;

  const p = player.play();

  // this should finish the other callback
  player.tech_.trigger('play');

  const finish = (v) => {
    assert.equal(player.muted(), false, 'player is not muted from autoplay');
    assert.equal(playTerminated, 1, 'play was terminated once');
    assert.equal(v, 'foo', 'play returns foo');
    player.dispose();
    done();
  };

  if (typeof p === 'string') {
    finish(p);
  } else {
    p.then((v) => {
      finish(v);
    });
  }

});
