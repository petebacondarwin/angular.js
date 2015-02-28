describe('Customizing the jqlite / jquery version', function() {

  it('should be able to force jqlite', function() {
    loadFixture("ngJq").andWaitForAngular();
    expect(browser.executeScript('return window.angular.element !== window.jQuery')).toBe(true);
  });

  it('should be able to use a specific version jQuery', function() {
    loadFixture("ngJqJquery").andWaitForAngular();
    expect(browser.executeScript('return window.angular.element !== window.jQuery_2_0_0')).toBe(true);
  });
});
