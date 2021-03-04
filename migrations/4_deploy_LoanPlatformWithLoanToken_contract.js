const LoanPlatformWithLoanTokens = artifacts.require("LoanPlatformWithLoanTokens");

module.exports = function (deployer) {
  deployer.deploy(LoanPlatformWithLoanTokens);
};