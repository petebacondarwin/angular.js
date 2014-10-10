'use strict';

describe('$anchorScroll', function() {

  var elmSpy;
  var docSpies;
  var windowSpies;

  function addElements() {
    var elements = sliceArgs(arguments);

    return function($window) {
      forEach(elements, function(identifier) {
        var match = identifier.match(/(?:(\w*) )?(\w*)=(\w*)/),
            nodeName = match[1] || 'a',
            tmpl = '<' + nodeName + ' ' + match[2] + '="' + match[3] + '">' +
                      match[3] +   // add some content or else Firefox and IE place the element
                                   // in weird ways that break yOffset-testing.
                   '</' + nodeName + '>',
            jqElm = jqLite(tmpl),
            elm = jqElm[0];
            // Inline elements cause Firefox to report an unexpected value for
            // `getBoundingClientRect().top` on some platforms (depending on the default font and
            // line-height). Using inline-block elements prevents this.
            // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1014738
            elm.style.display = 'inline-block';

        elmSpy[identifier] = spyOn(elm, 'scrollIntoView');
        jqLite($window.document.body).append(jqElm);
      });
    };
  }

  function callAnchorScroll() {
    return function($anchorScroll) {
      $anchorScroll();
    };
  }

  function changeHashAndScroll(hash) {
    return function($location, $anchorScroll) {
      $location.hash(hash);
      $anchorScroll();
    };
  }

  function changeHashTo(hash) {
    return function($anchorScroll, $location, $rootScope) {
      $rootScope.$apply(function() {
        $location.hash(hash);
      });
    };
  }

  function createMockDocument(initialReadyState) {
    var mockedDoc = {};
    docSpies = {};

    var propsToPassThrough = ['body', 'documentElement'];
    var methodsToPassThrough = [
      'getElementById',
      'getElementsByName',
      'addEventListener',
      'removeEventListener'
    ];

    var document_ = document;

    propsToPassThrough.forEach(function(prop) {
      mockedDoc[prop] = document_[prop];
    });
    methodsToPassThrough.forEach(function(method) {
      mockedDoc[method] = document_[method].bind(document_);
      docSpies[method] = spyOn(mockedDoc, method).andCallThrough();
    });

    mockedDoc.readyState = initialReadyState || 'complete';
    mockedDoc.dispatchFakeReadyStateChangeEvent = function() {
      var evt = document_.createEvent('Event');
      evt.initEvent('readystatechange', false, false);
      document_.dispatchEvent(evt);
    };
    mockedDoc.updateReadyState = function(newState) {
      this.readyState = newState;
      this.dispatchFakeReadyStateChangeEvent();
    };

    return mockedDoc;
  }

  function createMockWindow(initialReadyState) {
    return function() {
      module(function($provide) {
        elmSpy = {};
        windowSpies = {};

        var mockedWin = {
          scrollTo: (windowSpies.scrollTo = jasmine.createSpy('$window.scrollTo')),
          scrollBy: (windowSpies.scrollBy = jasmine.createSpy('$window.scrollBy')),
          document: createMockDocument(initialReadyState),
          navigator: {},
          getComputedStyle: function(elem) {
            return getComputedStyle(elem);
          },
          addEventListener: function(eventType, callback, unsupported) {
            window.addEventListener(eventType, callback, unsupported);
          },
          removeEventListener: function(eventType, callback, unsupported) {
            window.removeEventListener(eventType, callback, unsupported);
          }
        };

        windowSpies.addEventListener = spyOn(mockedWin, 'addEventListener').andCallThrough();
        windowSpies.removeEventListener = spyOn(mockedWin, 'removeEventListener').andCallThrough();

        $provide.value('$window', mockedWin);
      });
    };
  }

  function expectNoScrolling() {
    return expectScrollingTo(NaN);
  }

  function expectScrollingTo(identifierCountMap) {
    var map = {};
    if (isString(identifierCountMap)) {
      map[identifierCountMap] = 1;
    } else if (isArray(identifierCountMap)) {
      forEach(identifierCountMap, function(identifier) {
        map[identifier] = 1;
      });
    } else {
      map = identifierCountMap;
    }

    return function($window) {
      forEach(elmSpy, function(spy, id) {
        var count = map[id] || 0;
        expect(spy.callCount).toBe(count);
      });
      expect($window.scrollTo).not.toHaveBeenCalled();
    };
  }

  function expectScrollingToTop($window) {
    forEach(elmSpy, function(spy, id) {
      expect(spy).not.toHaveBeenCalled();
    });

    expect($window.scrollTo).toHaveBeenCalledWith(0, 0);
  }

  function resetAllSpies() {
    function resetSpy(spy) {
      spy.reset();
    }

    return function($window) {
      forEach(elmSpy, resetSpy);
      forEach(docSpies, resetSpy);
      forEach(windowSpies, resetSpy);
    };
  }


  afterEach(inject(function($browser, $document) {
    expect($browser.deferredFns.length).toBe(0);
    dealoc($document);
  }));


  describe('when explicitly called', function() {

    beforeEach(createMockWindow());


    it('should scroll to top of the window if empty hash', inject(
      changeHashAndScroll(''),
      expectScrollingToTop));


    it('should not scroll if hash does not match any element', inject(
      addElements('id=one', 'id=two'),
      changeHashAndScroll('non-existing'),
      expectNoScrolling()));


    it('should scroll to anchor element with name', inject(
      addElements('a name=abc'),
      changeHashAndScroll('abc'),
      expectScrollingTo('a name=abc')));


    it('should not scroll to other than anchor element with name', inject(
      addElements('input name=xxl', 'select name=xxl', 'form name=xxl'),
      changeHashAndScroll('xxl'),
      expectNoScrolling()));


    it('should scroll to anchor even if other element with given name exist', inject(
      addElements('input name=some', 'a name=some'),
      changeHashAndScroll('some'),
      expectScrollingTo('a name=some')));


    it('should scroll to element with id with precedence over name', inject(
      addElements('name=abc', 'id=abc'),
      changeHashAndScroll('abc'),
      expectScrollingTo('id=abc')));


    it('should scroll to top if hash == "top" and no matching element', inject(
      changeHashAndScroll('top'),
      expectScrollingToTop));


    it('should scroll to element with id "top" if present', inject(
      addElements('id=top'),
      changeHashAndScroll('top'),
      expectScrollingTo('id=top')));
  });


  describe('with respect to `document.readyState`', function() {

    function triggerLoadEvent() {
      return function($browser, $window) {
        // It is possible that this operation adds tasks to the asyncQueue (needs flushing)
        $window.document.readyState = 'complete';
        jqLite($window).triggerHandler('load');
        if ($browser.deferredFns.length) {
          $browser.defer.flush();
        }
      };
    }


    function spyOnJQLiteOnOff() {
      return function() {
        spyOn(jqLite.prototype,'on').andCallThrough();
        spyOn(jqLite.prototype,'off').andCallThrough();
      };
    }

    function unspyOnJQLiteOnOff() {
      return function() {
        jqLite.prototype.on = jqLite.prototype.on.originalValue;
        jqLite.prototype.off = jqLite.prototype.off.originalValue;
      };
    }

    function expectJQLiteOnOffCallsToEqual(callCount) {
      return function() {
        var onCalls = 0, offCalls = 0;

        forEach(jqLite.prototype.on.calls, function(call) {
          if ( call.args[0] === 'load' ) {
            onCalls += 1;
          }
        });

        forEach(jqLite.prototype.off.calls, function(call) {
          if ( call.args[0] === 'load' ) {
            offCalls += 1;
          }
        });
      };
    }

    function expectJQLiteOnOffCallsToHaveSameHandler() {
      return function() {
        var registeredListener = jqLite.prototype.on.mostRecentCall.args[1];
        var unregisteredListener = jqLite.prototype.off.mostRecentCall.args[1];
        expect(unregisteredListener).toBe(registeredListener);
      };
    }

    beforeEach(createMockWindow('interactive'));


    it('should wait for the `load` event', inject(
      addElements('id=some1'),

      changeHashTo('some1'),
      expectNoScrolling(),

      triggerLoadEvent(),
      expectScrollingTo('id=some1')));


    it('should only register one listener while `readyState !== "complete"`', inject(
      addElements('id=some1', 'id=some2'),

      changeHashTo('some1'),
      changeHashTo('some2'),
      expectNoScrolling(),

      triggerLoadEvent(),
      expectScrollingTo('id=some2')));


    it('should properly register and unregister listeners for the `load` event', function() {
      module(spyOnJQLiteOnOff());
      inject(
        addElements('id=some1', 'id=some2'),

        changeHashTo('some1'),
        changeHashTo('some2'),

        triggerLoadEvent(),

        expectJQLiteOnOffCallsToEqual(1),
        expectJQLiteOnOffCallsToHaveSameHandler(),
        unspyOnJQLiteOnOff()
      );
    });


    it('should scroll immediately if already `readyState === "complete"`', inject(
      addElements('id=some1'),

      triggerLoadEvent(),
      changeHashTo('some1'),

      expectScrollingTo('id=some1'),
      function() {
        expect(windowSpies.addEventListener.callCount).toBe(0);
        expect(windowSpies.removeEventListener.callCount).toBe(0);
      }));
  });


  describe('watcher', function() {

    function initAnchorScroll() {
      return function($rootScope, $anchorScroll) {
        $rootScope.$digest();
      };
    }

    function initLocation(config) {
      return function($provide, $locationProvider) {
        $provide.value('$sniffer', {history: config.historyApi});
        $locationProvider.html5Mode(config.html5Mode);
      };
    }

    function disableAutoScrolling() {
      return function($anchorScrollProvider) {
        $anchorScrollProvider.disableAutoScrolling();
      };
    }

    beforeEach(createMockWindow());


    it('should scroll to element when hash change in hashbang mode', function() {
      module(initLocation({html5Mode: false, historyApi: true}));
      inject(
        initAnchorScroll(),
        addElements('id=some'),
        changeHashTo('some'),
        expectScrollingTo('id=some')
      );
    });


    it('should scroll to element when hash change in html5 mode with no history api', function() {
      module(initLocation({html5Mode: true, historyApi: false}));
      inject(
        initAnchorScroll(),
        addElements('id=some'),
        changeHashTo('some'),
        expectScrollingTo('id=some')
      );
    });


    it('should not scroll to the top if $anchorScroll is initializing and location hash is empty',
      inject(
        initAnchorScroll(),
        expectNoScrolling())
    );


    it('should not scroll when element does not exist', function() {
      module(initLocation({html5Mode: false, historyApi: false}));
      inject(
        initAnchorScroll(),
        addElements('id=some'),
        changeHashTo('other'),
        expectNoScrolling()
      );
    });


    it('should scroll when html5 mode with history api', function() {
      module(initLocation({html5Mode: true, historyApi: true}));
      inject(
        initAnchorScroll(),
        addElements('id=some'),
        changeHashTo('some'),
        expectScrollingTo('id=some')
      );
    });


    it('should not scroll when auto-scrolling is disabled', function() {
      module(
          disableAutoScrolling(),
          initLocation({html5Mode: false, historyApi: false})
      );
      inject(
        addElements('id=fake'),
        changeHashTo('fake'),
        expectNoScrolling()
      );
    });


    it('should scroll when called explicitly (even if auto-scrolling is disabled)', function() {
      module(
          disableAutoScrolling(),
          initLocation({html5Mode: false, historyApi: false})
      );
      inject(
        addElements('id=fake'),
        changeHashTo('fake'),
        expectNoScrolling(),
        callAnchorScroll(),
        expectScrollingTo('id=fake')
      );
    });
  });


  describe('yOffset', function() {

    function expectScrollingWithOffset(identifierCountMap, offsetList) {
      var list = isArray(offsetList) ? offsetList : [offsetList];

      return function($rootScope, $window) {
        inject(expectScrollingTo(identifierCountMap));
        expect($window.scrollBy.callCount).toBe(list.length);
        forEach(list, function(offset, idx) {
          // Due to sub-pixel rendering, there is a +/-1 error margin in the actual offset
          var args = $window.scrollBy.calls[idx].args;
          expect(args[0]).toBe(0);
          expect(Math.abs(offset + args[1])).toBeLessThan(1);
        });
      };
    }

    function expectScrollingWithoutOffset(identifierCountMap) {
      return expectScrollingWithOffset(identifierCountMap, []);
    }

    function mockBoundingClientRect(childValuesMap) {
      return function($window) {
        var children = $window.document.body.children;
        forEach(childValuesMap, function(valuesList, childIdx) {
          var elem = children[childIdx];
          elem.getBoundingClientRect = function() {
            var val = valuesList.shift();
            return {
              top: val,
              bottom: val
            };
          };
        });
      };
    }

    function setYOffset(yOffset) {
      return function($anchorScroll) {
        $anchorScroll.yOffset = yOffset;
      };
    }

    beforeEach(createMockWindow());


    describe('and body with no border/margin/padding', function() {

      describe('when set as a fixed number', function() {

        var yOffsetNumber = 50;

        beforeEach(inject(setYOffset(yOffsetNumber)));


        it('should scroll with vertical offset', inject(
          addElements('id=some'),
          mockBoundingClientRect({0: [0]}),
          changeHashTo('some'),
          expectScrollingWithOffset('id=some', yOffsetNumber)));


        it('should use the correct vertical offset when changing `yOffset` at runtime', inject(
          addElements('id=some'),
          mockBoundingClientRect({0: [0, 0]}),
          changeHashTo('some'),
          setYOffset(yOffsetNumber - 10),
          callAnchorScroll(),
          expectScrollingWithOffset({'id=some': 2}, [yOffsetNumber, yOffsetNumber - 10])));


        it('should adjust the vertical offset for elements near the end of the page', function() {

          var targetAdjustedOffset = 20;

          inject(
            addElements('id=some1', 'id=some2'),
            mockBoundingClientRect({1: [yOffsetNumber - targetAdjustedOffset]}),
            changeHashTo('some2'),
            expectScrollingWithOffset('id=some2', targetAdjustedOffset));
        });
      });


      describe('when set as a function', function() {

        it('should scroll with vertical offset', function() {

          var val = 0;
          var increment = 10;

          function yOffsetFunction() {
            val += increment;
            return val;
          }

          inject(
            addElements('id=id1', 'name=name2'),
            mockBoundingClientRect({
              0: [0, 0, 0],
              1: [0]
            }),
            setYOffset(yOffsetFunction),
            changeHashTo('id1'),
            changeHashTo('name2'),
            changeHashTo('id1'),
            callAnchorScroll(),
            expectScrollingWithOffset({
              'id=id1': 3,
              'name=name2': 1
            }, [
              1 * increment,
              2 * increment,
              3 * increment,
              4 * increment
            ]));
        });
      });


      describe('when set as a jqLite element', function() {

        var elemBottom = 50;

        function createAndSetYOffsetElement(position) {
          var jqElem = jqLite('<div></div>');
          jqElem[0].style.position = position;

          return function($anchorScroll, $window) {
            jqLite($window.document.body).append(jqElem);
            $anchorScroll.yOffset = jqElem;
          };
        }


        it('should scroll with vertical offset when `position === fixed`', inject(
          createAndSetYOffsetElement('fixed'),
          addElements('id=some'),
          mockBoundingClientRect({0: [elemBottom], 1: [0]}),
          changeHashTo('some'),
          expectScrollingWithOffset('id=some', elemBottom)));


        it('should scroll without vertical offset when `position !== fixed`', inject(
          createAndSetYOffsetElement('absolute', elemBottom),
          expectScrollingWithoutOffset('id=some')));
      });
    });


    describe('and body with border/margin/padding', function() {

      var borderWidth = 4;
      var marginWidth = 8;
      var paddingWidth = 16;
      var yOffsetNumber = 50;
      var necessaryYOffset = yOffsetNumber - borderWidth - marginWidth - paddingWidth;

      beforeEach(inject(setYOffset(yOffsetNumber)));


      it('should scroll with vertical offset', inject(
        addElements('id=some'),
        mockBoundingClientRect({0: [yOffsetNumber - necessaryYOffset]}),
        changeHashTo('some'),
        expectScrollingWithOffset('id=some', necessaryYOffset)));


      it('should use the correct vertical offset when changing `yOffset` at runtime', inject(
        addElements('id=some'),
        mockBoundingClientRect({0: [
          yOffsetNumber - necessaryYOffset,
          yOffsetNumber - necessaryYOffset
        ]}),
        changeHashTo('some'),
        setYOffset(yOffsetNumber - 10),
        callAnchorScroll(),
        expectScrollingWithOffset({'id=some': 2}, [necessaryYOffset, necessaryYOffset - 10])));


      it('should adjust the vertical offset for elements near the end of the page', function() {

        var targetAdjustedOffset = 20;

        inject(
          addElements('id=some1', 'id=some2'),
          mockBoundingClientRect({1: [yOffsetNumber - targetAdjustedOffset]}),
          changeHashTo('some2'),
          expectScrollingWithOffset('id=some2', targetAdjustedOffset));
      });
    });


    describe('and body with border/margin/padding and boxSizing', function() {

      var borderWidth = 4;
      var marginWidth = 8;
      var paddingWidth = 16;
      var yOffsetNumber = 50;
      var necessaryYOffset = yOffsetNumber - borderWidth - marginWidth - paddingWidth;

      beforeEach(inject(setYOffset(yOffsetNumber)));


      it('should scroll with vertical offset', inject(
        addElements('id=some'),
        mockBoundingClientRect({0: [yOffsetNumber - necessaryYOffset]}),
        changeHashTo('some'),
        expectScrollingWithOffset('id=some', necessaryYOffset)));


      it('should use the correct vertical offset when changing `yOffset` at runtime', inject(
        addElements('id=some'),
        mockBoundingClientRect({0: [
          yOffsetNumber - necessaryYOffset,
          yOffsetNumber - necessaryYOffset
        ]}),
        changeHashTo('some'),
        setYOffset(yOffsetNumber - 10),
        callAnchorScroll(),
        expectScrollingWithOffset({'id=some': 2}, [necessaryYOffset, necessaryYOffset - 10])));


      it('should adjust the vertical offset for elements near the end of the page', function() {

        var targetAdjustedOffset = 20;

        inject(
          addElements('id=some1', 'id=some2'),
          mockBoundingClientRect({1: [yOffsetNumber - targetAdjustedOffset]}),
          changeHashTo('some2'),
          expectScrollingWithOffset('id=some2', targetAdjustedOffset));
      });
    });
  });
});
