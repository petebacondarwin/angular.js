'use strict';

angular.module('test', [])
  .directive('jqueryVersion', function() {
    return {
      link: function(scope) {
        if (window.angular.element !== window.jQuery) {
          scope.jqueryVersion = 'jqLite';
        }
      }
    };
  });
