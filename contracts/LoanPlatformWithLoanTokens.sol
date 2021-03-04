pragma solidity ^0.6.6;

import './LoanToken.sol';

contract LoanPlatformWithLoanTokens {
    
    LoanRequest[] requests;
    LoanToken token;
    address owner;

    struct LoanRequest {
        address payable borrower;
        address payable guarantor;
        address payable lender;
        uint256 sum;
        uint256 interest;
        uint256 paybackPeriod;
        uint256 guarantorInterest;
        uint256 lenderInterest;
        uint256 status;             // 0 = has no accepted guarantee, 1 = has an accepted guarantee, 2 = has been provided a loan, 3 = has been paid back by borrower, 4 = missed payment
    }

    constructor() public {
        owner = msg.sender;
    }

    // Make reference to the deployed LoanToken smart contract
    function setLoanTokens(address loanTokenContract) public {
        require(msg.sender == owner, "Only the contract owner can instantiate the LoanTokens!");
        token = LoanToken(loanTokenContract);
    }

    modifier indexInRange(uint256 index) {
        require(_indexInRange(index) == true, "There is no loan request at that position!");
        _;
    }

    modifier isBorrower(uint256 index) {
        require(msg.sender == requests[index].borrower, "You are not the borrower!");
        _;
    }

    function getLoanRequestArrayLength() public view returns(uint256 length) {
        return requests.length;
    }
    
    function _indexInRange(uint256 index) private view returns(bool inRange) {
        if (index < requests.length) {return true;}
        return false;
    }
    
    function submitRequest(uint256 sum, uint256 interest, uint256 paybackPeriod) public {
        // Newly submitted loan request
        require(sum > 0, "Loan value cannot be 0!");
        require((sum < 1000000) && (interest < 1000000 - sum), "Loan value cannot take all existing LoanTokens!");
        requests.push(LoanRequest(msg.sender, address(0), address(0), sum, interest, (now + paybackPeriod), 0, 0, 0));
    }
    
    function viewRequest(uint256 index) public view indexInRange(index) returns(address borrower, address guarantor, address lender, uint256 sum , uint256 interest, uint256 paybackPeriod, uint256 guarantorInterest, uint256 lenderInterest, uint256 status) {
        LoanRequest memory lr = requests[index];    // this prevents stack from getting too deep
        return(lr.borrower,
               lr.guarantor,
               lr.lender,
               lr.sum,
               lr.interest,
               lr.paybackPeriod,
               lr.guarantorInterest,
               lr.interest - lr.guarantorInterest,
               lr.status);
    }
    
    // No longer payable!
    function guarantee(uint256 index, uint256 gInterest) public indexInRange(index) {
        require(msg.sender != requests[index].borrower, "Borrower cannot guarantee the loan!");
        require(requests[index].guarantor == address(0), "There is already a pending guarantee on this loan request!");
        require(gInterest < requests[index].interest, "Guarantor interest is too high!");
        requests[index].guarantor = msg.sender;
        requests[index].guarantorInterest = gInterest;
        // Uses LoanToken function transferFrom() to transfer guarantor's funds into smart contract
        token.transferFrom(msg.sender, address(this), requests[index].sum);
    }
    
    // No longer payable!
    function lend(uint256 index) public indexInRange(index) {
        require(msg.sender != requests[index].borrower, "Borrower cannot provide the loan!");
        require(msg.sender != requests[index].guarantor, "Guarantor cannot provide the loan!");
        require(requests[index].guarantor != address(0), "Loan is not guaranteed!");
        require(requests[index].status == 1, "The guarantee has either not yet been accepted, or a loan has already been provided!");
        requests[index].status = 2;
        requests[index].lender = msg.sender;
        requests[index].lenderInterest =  (requests[index].interest -  requests[index].guarantorInterest);
        // Uses LoanToken function transferFrom() to transfer loan directly from lender to borrower
        token.transferFrom(requests[index].lender, requests[index].borrower, requests[index].sum);
    }

    function accept(uint256 index) public indexInRange(index) isBorrower(index) {
        require(requests[index].status == 0, "The guarantee is already accepted!");
        requests[index].status = 1;
    }

    function reject(uint256 index) public indexInRange(index) isBorrower(index) {
        require((requests[index].status != 2) && (requests[index].status != 3), "The loan is already provided, you cannot reject the guarantee!");
        require(requests[index].status != 0, "There is no guarantee to reject!");
        requests[index].status = 0;
        requests[index].guarantorInterest = 0;
        token.transfer(requests[index].guarantor, requests[index].sum);
        requests[index].guarantor = address(0);
    }
    
    // No longer payable!
    function payBack(uint256 index) public indexInRange(index) isBorrower(index) {
        require(requests[index].status == 2, "No loan provided yet, or loan is already paid back!");
        requests[index].status = 3;
        // LoanTokens are transferred on payBack along with all interest
        token.transferFrom(address(this), requests[index].guarantor, requests[index].sum);
        token.transferFrom(requests[index].borrower, requests[index].guarantor, requests[index].guarantorInterest);
        token.transferFrom(requests[index].borrower, requests[index].lender, requests[index].sum + requests[index].lenderInterest);
    }
    
    function missedPayback(uint256 index) indexInRange(index) public {
        require(now > requests[index].paybackPeriod, "Payback period not over yet!");
        require(msg.sender == requests[index].lender, "Only the lender can reclaim the guarantee!");
        require(requests[index].status == 2, "Lender has been payed back by guarantee or borrower!");
        requests[index].status = 4;
        // LoanTokens are transferred on missedPayback using pull-payment
        token.transferFrom(address(this), requests[index].lender, requests[index].sum);
    }


    
}




// TODO 
// Include variable names in returns statements

// Questions
// Fallback for catching payments?
// Allow for staggered paybacks?

// Assumptions
// LoanRequest must have be guaranteed for a loan to happen

