const LoanPlatform = artifacts.require("LoanPlatform");

module.exports = function (deployer) {
  deployer.deploy(LoanPlatform);
};