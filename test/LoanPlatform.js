const LoanPlatform = artifacts.require('LoanPlatform')

contract('LoanPlatform', async accounts => {
    
    let instance
    let borrower = accounts[0]
    let guarantor = accounts[1]
    let lender = accounts[2]
    let thirdParty = accounts[3]

    function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    it('should initialize the LoanRequests array to be empty', async () => {
        instance = await LoanPlatform.deployed()
        let arrayLength = await instance.getLoanRequestArrayLength()
        assert.equal(arrayLength, 0)
    })

    it('should not allow a borrower to submit a LoanRequest of 0 ether', async () => {
        instance = await LoanPlatform.deployed()
        try {
            await instance.submitRequest(0, web3.utils.toWei('0.5', 'ether'), 5, { from: borrower })
        } catch (error) {
            assert.equal(error.reason, 'Loan value cannot be zero!')
        }
     })
    
    it('should push a LoanRequest struct onto the requests array when a borrower submits a loan request', async () => {
        instance = await LoanPlatform.deployed()
        await instance.submitRequest(web3.utils.toWei('2', 'ether'), web3.utils.toWei('0.5', 'ether'), 50, { from: borrower })
        let arrayLength = await instance.getLoanRequestArrayLength()
        assert.equal(arrayLength, 1)
    })

    it('should prevent a guarantor from requesting all the available interest', async () => {
        instance = await LoanPlatform.deployed()
        try {
            await instance.guarantee(0, web3.utils.toWei('0.5', 'ether'), { from: guarantor, value: web3.utils.toWei('2', 'ether') })
        } catch(error) {
            assert.equal(error.reason, 'Guarantor interest is too high!')
        }
    })

    it('should block guarantees that are less than the loan value', async () => {
        instance = await LoanPlatform.deployed()
        try {
            await instance.guarantee(0, web3.utils.toWei('0.25', 'ether'), { from: guarantor, value: web3.utils.toWei('1', 'ether') })
        } catch(error) {
            assert.equal(error.reason, 'Funds passed in must equal the sum of loan!')
        }
    })

    it('should block guarantees that are greater than the loan value', async () => {
        instance = await LoanPlatform.deployed()
        try {
            await instance.guarantee(0, web3.utils.toWei('0.25', 'ether'), { from: guarantor, value: web3.utils.toWei('3', 'ether') })
        } catch(error) {
            assert.equal(error.reason, 'Funds passed in must equal the sum of loan!')
        }
    })

    it('should stop the borrower from guaranteeing their own loan request', async () => {
        instance = await LoanPlatform.deployed()
        try {
            await instance.guarantee(0, web3.utils.toWei('0.25', 'ether'), { from: borrower, value: web3.utils.toWei('2', 'ether') })
        } catch(error) {
            assert.equal(error.reason, 'Borrower cannot guarantee the loan!')
        }
    })

    it('should allow a guarantor to place a guarantee on a LoanRequest', async () => {
        instance = await LoanPlatform.deployed()
        await instance.guarantee(0, web3.utils.toWei('0.25', 'ether'), { from: guarantor, value: web3.utils.toWei('2', 'ether') })
        let ret = await instance.viewRequest(0)
        assert.equal(guarantor, ret.guarantor)
        assert.equal(0, ret.status)     
        assert.equal(web3.utils.toWei('0.25', 'ether'), ret.guarantorInterest)   
    })

    it('should block other guarantees once a guarantee has been placed but not yet accepted', async () => {
        instance = await LoanPlatform.deployed()
        try {
            await instance.guarantee(0, web3.utils.toWei('0.25', 'ether'), { from: thirdParty, value: web3.utils.toWei('2', 'ether') })
        } catch (error) {
            assert.equal(error.reason, 'There is already a pending guarantee on this loan request!')
        }
    })

    it('should allow the borrower to successfully accept a guarantee', async () => {
        instance = await LoanPlatform.deployed()
        await instance.accept(0)
        let ret = await instance.viewRequest(0)
        assert.equal(1, ret.status)
    })

    it('should block loans that are not exactly equal to the loan value', async () => {
        instance = await LoanPlatform.deployed()
        try { 
            await instance.lend(0, { from: borrower, value: web3.utils.toWei('1', 'ether') }) 
        } catch (error) {
            assert.equal(error.reason, 'Funds passed in must exactly equal the sum of loan!') 
        }
        try {
            await instance.lend(0, { from: borrower, value: web3.utils.toWei('3', 'ether') })
        } catch (error) {
            assert.equal(error.reason, 'Funds passed in must exactly equal the sum of loan!')
        }
    })

    it('should stop the borrower or guarantor from providing the loan', async () => {
        instance = await LoanPlatform.deployed()
        try {
            await instance.lend(0, { from: borrower, value: web3.utils.toWei('2', 'ether') })
        } catch (error) {
            assert.equal(error.reason, 'Borrower cannot provide the loan!')
        }
        try {
            await instance.lend(0, { from: guarantor, value: web3.utils.toWei('2', 'ether')})
        } catch (error) {
            assert.equal(error.reason, 'Guarantor cannot provide the loan!')
        }
    })

    it('should clear the guarantor address and return their funds upon guarantee rejection', async () => {
        instance = await LoanPlatform.deployed()
        // get guarantor balance before rejection
        let guarantorBalBefore = await web3.eth.getBalance(guarantor)
        guarantorBalBefore =  web3.utils.fromWei(guarantorBalBefore, 'ether')
        // reject their guarantee
        await instance.reject(0, { from: borrower })
        let ret = await instance.viewRequest(0)
        assert.equal(ret.guarantor, '0x0000000000000000000000000000000000000000')
        // get guarantor balance after rejection
        let guarantorBalAfter = await web3.eth.getBalance(guarantor)
        guarantorBalAfter =  web3.utils.fromWei(guarantorBalAfter, 'ether')

        assert.equal((guarantorBalAfter - guarantorBalBefore).toFixed(2), 2)
    })

    it('should prevent the lender from rejecting a guarantee (paying back the garantor) more than once', async () => {
        instance = await LoanPlatform.deployed()
        try {
            await instance.reject(0, { from: borrower })
        } catch (error) {
            assert.equal(error.reason, 'There is no guarantee to reject!')
        }
    })

    it('should stop a lender from providing the loan if guarantee is not accepted', async () => {
        instance = await LoanPlatform.deployed()
        try {
            await instance.lend(0, { from: lender, value: web3.utils.toWei('2', 'ether') })
        } catch (error) {
            assert.equal(error.reason, 'The guarantee has either not yet been accepted, or a loan has already been provided!')
        }
    })

    it('should update LoanRequest status upon loan and transfer the funds to borrower', async () => {
        instance = await LoanPlatform.deployed()
        await instance.guarantee(0, web3.utils.toWei('0.25', 'ether'), { from: guarantor, value: web3.utils.toWei('2', 'ether') })
        await instance.accept(0, { from: borrower })

        let borrowerBalBefore = await web3.eth.getBalance(borrower)
        borrowerBalBefore =  web3.utils.fromWei(borrowerBalBefore, 'ether')
        let lenderBalBefore = await web3.eth.getBalance(lender)
        lenderBalBefore =  web3.utils.fromWei(lenderBalBefore, 'ether')

        await instance.lend(0, { from: lender, value: web3.utils.toWei('2', 'ether') })
        let ret = await instance.viewRequest(0)
        assert.equal(ret.status, 2)

        let borrowerBalAfter = await web3.eth.getBalance(borrower)
        borrowerBalAfter =  web3.utils.fromWei(borrowerBalAfter, 'ether')
        let lenderBalAfter = await web3.eth.getBalance(lender)
        lenderBalAfter =  web3.utils.fromWei(lenderBalAfter, 'ether')

        assert.equal((borrowerBalAfter - borrowerBalBefore).toFixed(2), 2)
        assert.equal((lenderBalBefore - lenderBalAfter).toFixed(2), 2)
    })

    it('should associate the lender with the LoanRequest', async () => {
        instance = await LoanPlatform.deployed()
        let ret = await instance.viewRequest(0)
        assert.equal(ret.lender, lender)
    })

    it('should stop the borrower from rejecting a guarantee once the loan is provided', async () => {
        instance = await LoanPlatform.deployed()
        try {
            await instance.reject(0, { from: borrower })
        } catch (error) {
            assert.equal(error.reason, 'The loan is already provided, you cannot reject the guarantee!')
        }
    })

    it('should allow only the borrower to pay back the loan', async () => {
        instance = await LoanPlatform.deployed()
        try {
            await instance.payBack(0, { from: lender })
        } catch (error) {
            assert.equal(error.reason, 'You are not the borrower!')
        }
        try {
            await instance.payBack(0, { from: guarantor })
        } catch (error) {
            assert.equal(error.reason, 'You are not the borrower!')
        }
    })

    it('should stop the borrower from paying back any amount less than (loan value + interest)', async () => {
        instance = await LoanPlatform.deployed()
        try {
            await instance.payBack(0, { from: borrower, value: web3.utils.toWei('2', 'ether')})
        } catch (error) {
            assert.equal(error.reason, 'Insufficient funds passed in!')
        }
    })

    it('should transfer back (funds + interest) to lender and guarantor upon payback', async () => {
        instance = await LoanPlatform.deployed()
        // get guarantor and lender balances before payback
        let guarantorBalBefore = await web3.eth.getBalance(guarantor)
        guarantorBalBefore =  web3.utils.fromWei(guarantorBalBefore, 'ether')
        let lenderBalBefore = await web3.eth.getBalance(lender)
        lenderBalBefore =  web3.utils.fromWei(lenderBalBefore, 'ether')
        // payback loan
        await instance.payBack(0, { from: borrower, value: web3.utils.toWei('2.5', 'ether')})
        // get guarantor and lender balances after payback
        let guarantorBalAfter = await web3.eth.getBalance(guarantor)
        guarantorBalAfter =  web3.utils.fromWei(guarantorBalAfter, 'ether')
        let lenderBalAfter = await web3.eth.getBalance(lender)
        lenderBalAfter =  web3.utils.fromWei(lenderBalAfter, 'ether')

        assert.equal((guarantorBalAfter - guarantorBalBefore).toFixed(2), 2.25)
        assert.equal((lenderBalAfter - lenderBalBefore).toFixed(2), 2.25)
    })

    it('should update LoanRequest status to reflect being paid back', async () => {
        instance = await LoanPlatform.deployed()
        let ret = await instance.viewRequest(0)
        assert.equal(ret.status, 3)
    })

    it('should not allow lender to withdraw guarantee if loan is already paid back', async () => {
        instance = await LoanPlatform.deployed()
        try {
            await instance.missedPayback(0, { from: lender })
        } catch (error) {
            assert.equal(error.reason, 'Lender has been payed back by guarantee or borrower!')
        }
    })

    it('should not allow a lender to provide a loan before borrower has accepted the guarantee', async () => {
        instance = await LoanPlatform.deployed()
        await instance.submitRequest(web3.utils.toWei('2', 'ether'), web3.utils.toWei('0.5', 'ether'), 10, { from: borrower })
        await instance.guarantee(1, web3.utils.toWei('0.25', 'ether'), { from: guarantor, value: web3.utils.toWei('2', 'ether') })
        try {
            await instance.lend(1, { from: lender, value: web3.utils.toWei('2', 'ether') })
        } catch(error) {
            assert.equal(error.reason, 'The guarantee has either not yet been accepted, or a loan has already been provided!')
        }
    })

    it('should not allow lender to withdraw guarantee if paybackPeriod is not over', async () => {
        instance = await LoanPlatform.deployed()
        await instance.accept(1, { from: borrower })
        await instance.lend(1, { from: lender, value: web3.utils.toWei('2', 'ether') })
        try {
            await instance.missedPayback(1, { from: lender })
        } catch(error) {
            assert.equal(error.reason, 'Payback period not over yet!')
        }
    })

    it('should allow only the lender to withdraw guarantee', async () => {
        console.log("[+] Waiting 10 seconds for paybackPeriod to expire...");
        await timeout(10000);
        instance = await LoanPlatform.deployed()
        try {
            await instance.missedPayback(1, { from: borrower })
        } catch(error) {
            assert.equal(error.reason, 'Only the lender can reclaim the guarantee!')
        }
        try {
            await instance.missedPayback(1, { from: guarantor })
        } catch(error) {
            assert.equal(error.reason, 'Only the lender can reclaim the guarantee!')
        }
        try {
            await instance.missedPayback(1, { from: thirdParty })
        } catch(error) {
            assert.equal(error.reason, 'Only the lender can reclaim the guarantee!')
        }
    })

    it('should not allow a guarantor to provide funds for an expired loan request', async () => {
        instance = await LoanPlatform.deployed()
        await instance.submitRequest(1000, 100, 1, { from: borrower })
        await timeout(5000);
        console.log("[+] Waiting a bit more for another loan request to expire...");
        try {
            await instance.guarantee(2, 50, { from: guarantor, value: 1000 })
        } catch(error) {
            assert.equal(error.reason, 'Loan request is expired!')
        }
        // try {
        //     await instance.lend(2, { from: lender, value: 1000 })
        // } catch(error) {
        //     assert.equal(error.reason, 'Loan request is expired!')
        // }
    })


    






















})

