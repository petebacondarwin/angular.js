// Sample E2E test:
//
describe('Force jqlite', function() {
  beforeEach(function() {
    loadFixture("ngJq").andWaitForAngular();
  });

  it('should use jqlite', function() {
    expect(element(by.binding('text')).getText())
        .toBe('Hello, world!');

    // expect(browser.executeScript('return window.angular.jq();')).toBe('');
  });
});
