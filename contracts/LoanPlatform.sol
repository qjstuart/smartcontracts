pragma solidity ^0.6.6;


contract LoanPlatform {
    
    LoanRequest[] requests;

    struct LoanRequest {
        address payable borrower;
        address payable guarantor;
        address payable lender;
        uint256 sum;
        uint256 interest;
        uint256 paybackPeriod;
        uint256 guarantorInterest;
        uint256 lenderInterest;
        uint256 status;             // 0 = has no accepted guarantee, 1 = has an accepted guarantee, 2 = has been provided a loan, 3 = has been paid back by borrower, 4 = borrower has missed the payback period
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
        require(sum > 0, "Loan value cannot be zero!");
        // Newly submitted loan request TEST THIS^^^
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
    
    function guarantee(uint256 index, uint256 gInterest) public indexInRange(index) payable {
        require(msg.value == requests[index].sum, "Funds passed in must equal the sum of loan!");
        require(msg.sender != requests[index].borrower, "Borrower cannot guarantee the loan!");
        require(requests[index].guarantor == address(0), "There is already a pending guarantee on this loan request!");
        require(gInterest < requests[index].interest, "Guarantor interest is too high!");
        require(now < requests[index].paybackPeriod, "Loan request is expired!");
        requests[index].guarantor = msg.sender;
        requests[index].guarantorInterest = gInterest;
    }
    
    function lend(uint256 index) public indexInRange(index) payable {
        require(msg.value == requests[index].sum, "Funds passed in must exactly equal the sum of loan!");
        require(msg.sender != requests[index].borrower, "Borrower cannot provide the loan!");
        require(msg.sender != requests[index].guarantor, "Guarantor cannot provide the loan!");
        require(requests[index].status == 1, "The guarantee has either not yet been accepted, or a loan has already been provided!");
        require(now < requests[index].paybackPeriod, "Loan request is expired!");
        requests[index].status = 2;
        requests[index].lender = msg.sender;
        requests[index].lenderInterest =  (requests[index].interest -  requests[index].guarantorInterest);
        requests[index].borrower.transfer(msg.value);
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
        requests[index].guarantor.transfer(requests[index].sum);
        requests[index].guarantor = address(0);
    }
    
    
    function payBack(uint256 index) public indexInRange(index) isBorrower(index) payable {
        require(msg.value == (requests[index].sum + requests[index].interest), "Insufficient funds passed in!");
        require(requests[index].status == 2, "No loan provided yet, or loan is already paid back!");
        requests[index].status = 3; // Set request as paid back by borrower
        requests[index].guarantor.transfer(requests[index].sum + requests[index].guarantorInterest);
        requests[index].lender.transfer(requests[index].sum + requests[index].lenderInterest);
    }
    
    
    function missedPayback(uint256 index) indexInRange(index) public {
        require(requests[index].status == 2, "Lender has been payed back by guarantee or borrower!");
        require(now > requests[index].paybackPeriod, "Payback period not over yet!");
        require(msg.sender == requests[index].lender, "Only the lender can reclaim the guarantee!");
        requests[index].status = 4;        
        msg.sender.transfer(requests[index].sum);
    }


    
}




// TODO 
// Include variable names in returns statements

// Questions
// Fallback for catching payments?
// Allow for staggered paybacks?

// Assumptions
// LoanRequest must have be guaranteed for a loan to happen

