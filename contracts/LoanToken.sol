pragma solidity ^0.6.6;

contract LoanToken {
    
    // State variables - accessible to entire contract. Will be written to blockchain
    string public name = 'LoanToken';               // Name (optional)
    string public symbol = 'LOAN';                  // Symbol (optional)
    uint256 public totalSupply;                     // How many LoanTokens are minted?
    mapping(address => uint256) public balanceOf;   // Who has LoanTokens? How many?
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer (
        address indexed _from,
        address indexed _to,
        uint256 _value
    );

    event Approval (
        address indexed _owner,
        address indexed _spender,
        uint256 _value
    );

    constructor(uint256 _initialSupply) public {
        // Initial supply is alocated to contract creator  
        balanceOf[msg.sender] = _initialSupply;
        totalSupply = _initialSupply;

    }

    // Transfer LoanToken
    function transfer(address _to, uint256 _value) public returns(bool success) {
        
        // Exception if account doesnt have enough funds
        require(balanceOf[msg.sender] >= _value, "Not enough funds!");
        
        // Transfer the balance
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        
        // Emit transfer event
        emit Transfer(msg.sender, _to, _value);
        
        // Return a boolean
        return true;
    }


    function approve() public pure returns(bool success){
        return true;
    }

    // The ERC20 standard specifies the following approve() structure, but are not required in this case.
    // function approve(address _spender, uint256 _value) public returns(bool success) {
        // allowance[msg.sender][_spender] = _value;
        // emit Approval(msg.sender, _spender, _value);
        // return true




    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
        // Require _from has enough tokens
        require(_value <= balanceOf[_from], "Not enough funds in _from account!");
        // Require allowance is large enough
        require(_value <= allowance[_from][msg.sender], "Allowance is not large enough");
        // Change balance
        balanceOf[_from] -= _value;
        balanceOf[_to] += _value;
        // Update allowance
        allowance[_from][msg.sender] -= _value;
        // Emit transfer event
        emit Transfer(_from, _to, _value); 
        // Return boolean
        return true;
    }
}
