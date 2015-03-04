'use strict';

angular.module('test', [])

  .run(function($rootScope) {
    $rootScope.jqueryVersion = window.angular.element().jquery || 'jqLite';
  })

  .directive('jqueryVersion', function() {
    return {
      link: function(scope) {

        // scope.jqueryVersion = angular.isDefined(window.jQuery_2_1_0);
        // scope.jqueryVersion = angular.isDefined(window.jQuery_2_1_0().jquery);
        // scope.jqueryVersion = window.jQuery_2_1_0().jquery;

        scope.jqueryVersion = window.angular.element().jquery;
        // scope.jqueryVersion = window.jQuery_2_1_0().jquery;
        // scope.jqueryVersion = window.$().jquery;

        if (window.angular.element === window.jQuery_2_1_0) {
          // scope.jqueryVersion = 'jQuery_2_0_0';
        }
      }
    };
  });
