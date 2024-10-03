const {loadFixture} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { ethers } = require("hardhat");
const { expect } = require("chai");
const { PANIC_CODES } = require("@nomicfoundation/hardhat-chai-matchers/panic");

describe("MultiSig", function () {
    async function deployFixture() {
      const [owner1, owner2, owner3, otherAccount] = await ethers.getSigners()
      const quorumRequired = 2

      const MultiSig = await ethers.getContractFactory('MultiSig')
      const multiSig = await MultiSig.deploy(
        [owner1.address, owner2.address, owner3.address],
        quorumRequired
      )
      const deployedContractAddress = await multiSig.getAddress()

      return { multiSig, deployedContractAddress, owner1, owner2, owner3, otherAccount }
    }

  describe("Deployment", function (){
      it("Should deploy and set the owners and quorum", async function () {
          const { multiSig, owner1, owner2, owner3 } = await loadFixture(deployFixture);

          expect(await multiSig.getOwners()).to.deep.equal([owner1.address, owner2.address, owner3.address]);
          expect(await multiSig.quorumRequired()).to.equal(2);
      });
  });

  describe("Deposit", function (){
      it('Should deposit Ether to the contract', async function () {
          const { multiSig, deployedContractAddress } = await loadFixture(deployFixture)
    
          const tx = await multiSig.deposit({
            value: ethers.parseEther('1'),
          })
          await tx.wait()
    
          const balance = await ethers.provider.getBalance(deployedContractAddress)
          expect(balance.toString()).to.equal(ethers.parseEther('1'))
        })
      })

  describe("Check balance", function (){
      it("Should check default balance of the contract", async function(){
          const { multiSig } = await loadFixture(deployFixture);

          const balance = await multiSig.balanceOf();

          expect(balance.toString()).to.equal(ethers.parseEther('0'));
      })
      it("Should check the balance of the contract after a deposit", async function(){
          const { multiSig } = await loadFixture(deployFixture);

          const tx = await multiSig.deposit({
              value: ethers.parseEther('1')
          })
          await tx.wait();

          const balance = await multiSig.balanceOf();

          expect(balance.toString()).to.equal(ethers.parseEther('1'));
      })
  })

  describe("Withdraw", function(){
      it("Should create a withdraw transaction", async function(){
          const { multiSig, owner1 } = await loadFixture(deployFixture);

          const withdrawTx = await multiSig.createWithdrawTx(
              owner1.address,
              ethers.parseEther('0')
          );
          await withdrawTx.wait();

          const withdrawTxes = await multiSig.getWithdrawTxes();
          const actualTx = withdrawTxes[0];

          expect(actualTx.to).to.equal(owner1);
          expect(actualTx.amount).to.equal(ethers.parseEther('0'));
          expect(actualTx.approvals).to.equal(0);
          expect(actualTx.sent).to.equal(false);
      })

      it("Should revert the tx when called by someone other than the owner", async function(){
          const { multiSig, otherAccount } = await loadFixture(deployFixture);

          await expect(
              multiSig
              .connect(otherAccount)
              .createWithdrawTx(otherAccount.address, ethers.parseEther('0'))
          ).to.be.revertedWith('not owner')
      })
  })

  describe("Approve withdraw tx", function(){
      it("Should approve a withdraw tx", async function(){
          const { multiSig, owner1 } = await loadFixture(deployFixture);

          const withdrawTx = await multiSig.createWithdrawTx(
              owner1.address,
              ethers.parseEther('0')
          ); 
          await withdrawTx.wait();

          const approveTx = await multiSig.approveWithdrawTx(0);
          await approveTx.wait();

          const withdrawTxes = await multiSig.getWithdrawTxes();
          const actualTx = withdrawTxes[0];

          expect(actualTx.to).to.equal(owner1.address);
          expect(actualTx.amount).to.equal(ethers.parseEther('0'));
          expect(actualTx.approvals).to.equal(1);
          expect(actualTx.sent).to.equal(false);
      })
      
      it("Should send the tx after the quorum is reached", async function(){
          const { multiSig, owner1, owner2 } = await loadFixture(deployFixture);

          const withdrawTx = await multiSig.createWithdrawTx(
              owner1.address,
              ethers.parseEther('0')
          ); 
          await withdrawTx.wait();

          let approveTx = await multiSig.approveWithdrawTx(0);
          await approveTx.wait()

          approveTx = await multiSig.connect(owner2).approveWithdrawTx(0);
          await approveTx.wait();

          const withdrawTxes = await multiSig.getWithdrawTxes();
          const actualTx = withdrawTxes[0];

          expect(actualTx.to).to.equal(owner1.address);
          expect(actualTx.amount).to.equal(ethers.parseEther('0'));
          expect(actualTx.approvals).to.equal(2);
          expect(actualTx.sent).to.equal(true);
      })

      it("Should revert the tx when approve is called by someone who is not the owner", async function(){
          const { multiSig, owner1, otherAccount } = await loadFixture(deployFixture);

          const withdrawTx = await multiSig.createWithdrawTx(
              owner1.address,
              ethers.parseEther('0')
          )
          await withdrawTx.wait()

          await expect(
              multiSig.connect(otherAccount).approveWithdrawTx(0)
              ).to.be.revertedWith('not owner')
      })

      it("Should revert the tx when approve is called for a tx that does not exist", async function(){
          const { multiSig, owner1 } = await loadFixture(deployFixture);

          await expect(
              multiSig.connect(owner1).approveWithdrawTx(0)
              ).to.be.revertedWithPanic(PANIC_CODES.ARRAY_ACCESS_OUT_OF_BOUNDS)
      })

      it("Should revert the tx if the tx has already been approved by the caller", async function(){
          const { multiSig, owner1 } = await loadFixture(deployFixture);

          const withdrawTx = await multiSig.createWithdrawTx(
              owner1.address,
              ethers.parseEther('0')
          )
          await withdrawTx.wait()

          const approveTx = await multiSig.approveWithdrawTx(0);
          await approveTx.wait()

          expect(
              multiSig.connect(owner1).approveWithdrawTx(0)
              ).to.be.revertedWithCustomError(multiSig, "TxAlreadyApproved")
      })

      it("Should revert the tx when approve is called for a tx that has already been sent", async function(){
          const { multiSig, owner1, owner2, owner3 } = await loadFixture(deployFixture);

          const withdrawTx = await multiSig.createWithdrawTx(
              owner1.address,
              ethers.parseEther('0')
          )
          await withdrawTx.wait()

          let approveTx = await multiSig.approveWithdrawTx(0)
          await approveTx.wait()

          approveTx = await multiSig.connect(owner2).approveWithdrawTx(0)
          await approveTx.wait()

          await expect(
              multiSig.connect(owner3).approveWithdrawTx(0)
              ).to.be.revertedWithCustomError(multiSig, "TxAlreadySent")
      })
  })
});
