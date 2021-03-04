const LoanToken = artifacts.require("LoanToken");

module.exports = function (deployer) {
  deployer.deploy(LoanToken, 1000000);
};
