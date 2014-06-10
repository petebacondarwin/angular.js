'use strict';


function $TestabilityProvider() {
  this.$get = ['$rootScope', '$browser', '$location',
       function($rootScope,   $browser,   $location) {

    /**
     * @ngdoc service
     * @name $testability
     *
     * @description
     * The $testability service provides a collection of methods for use when debugging
     * or by automated test and debugging tools.
     */
    var testability = {};

    /**
     * @ngdoc method
     * @name $testability#findBindings
     *
     * @description
     * Returns an array of elements that are bound (via ng-bind or {{}})
     * to expressions matching the input.
     *
     * @param {Element} element The element root to search from.
     * @param {string} expression The binding expression to match.
     * @param {boolean} opt_exactMatch If true, only returns exact matches
     *     for the expression.
     */
    testability.findBindings = function(element, expression, opt_exactMatch) {
      var bindings = element.getElementsByClassName('ng-binding');
      var matches = [];
      for (var i = 0; i < bindings.length; ++i) {
        var dataBinding = angular.element(bindings[i]).data('$binding');
        if (dataBinding) {
          for (var j = 0; j < bindingNames.length; ++j) {
            if (opt_exactMatch) {
              var matcher = new RegExp('([^a-zA-Z\\d]|$)' + expression + '([^a-zA-Z\\d]|^)');
              if (matcher.test(dataBinding[j])) {
                matches.push(bindings[i]);
              }
            } else {
              if (dataBinding[j].indexOf(expression) != -1) {
                matches.push(bindings[i]);
              }
            }
          }
        }
      }
      return matches;
    };

    /**
     * @ngdoc method
     * @name $testability#findModels
     *
     * @description
     * Returns an array of elements that are two-way found via ng-model to
     * expressions matching the input.
     *
     * @param {Element} element The element root to search from.
     * @param {string} expression The model expression to match.
     * @param {boolean} opt_exactMatch If true, only returns exact matches
     *     for the expression.
     */
    testability.findModels = function(element, expression, opt_exactMatch) {
      var prefixes = ['ng-', 'ng_', 'data-ng-', 'x-ng-', 'ng\\:'];
      for (var p = 0; p < prefixes.length; ++p) {
        var attributeEquals = opt_exactMatch ? '=' : '*=';
        var selector = '[' + prefixes[p] + 'model' + attributeEquals + '"' + expression + '"]';
        var elements = element.querySelectorAll(selector);
        if (elements.length) {
          return elements;
        }
      }
    };

    /**
     * @ngdoc method
     * @name $testability#getLocation
     *
     * @description
     * Shortcut for getting the location in a browser agnostic way.
     */
    testability.getLocation = function() {
      return $location.absUrl();
    };

    /**
     * @ngdoc method
     * @name $testability#setLocation
     *
     * @description
     * Shortcut for navigating to a location without doing a full page reload.
     *
     * @param {string} path The location path to go to.
     */
    testability.setLocation = function(path) {
      if (path !== $location.path()) {
        $location.path(path);
        $rootScope.$digest();
      }
    };

    /**
     * @ngdoc method
     * @name $testability#whenStable
     *
     * @description
     * Calls the callback when $timeout and $http requests are completed.
     *
     * @param {function} callback
     */
    testability.whenStable = function(callback) {
      $browser.notifyWhenNoOutstandingRequests(callback);
    };

    return testability;
  }];
}
