'use client'

import Header from "./components/Header";
import { contractAbi, contractAdress } from "./constants";
import { useEffect, useState } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { parseEther, formatEther, zeroAddress } from "viem";

export default function Home() {
  const [scBalance, setScBalance] = useState(0)
  const [scPendingTransactions, setScPendingTransactions] = useState([])
  const [scTotalTxCount, setScTotalTxCount] = useState(0)
  const [ethToUseForDeposit, setEthToUseForDeposit] = useState('')
  const [ethToUseForWhithdrawal, setEthToUseForWhithdrawal] = useState('')
  const [ethAddressToUseForWhithdrawal, setEthAddressToUseForWhithdrawal] = useState('')
  const [transactionHash, setTransactionHash] = useState(null)

  const { address } = useAccount()

  const { data: owners, refetch: refetchOwners } = useReadContract({
    abi: contractAbi,
    address: contractAdress,
    functionName: 'getOwners',
  })

  useEffect(() => {
    console.log("Owners:", owners);
  }, [owners]);

  const { data: withdrawTxCount, refetch: refetchWithdrawTxCount } = useReadContract({
    abi: contractAbi,
    address: contractAdress,
    functionName: 'getWithdrawTxCount'
  })

  const { data: contractBalance, refetch: refetchContractBalance } = useReadContract({
    abi: contractAbi,
    address: contractAdress,
    functionName: 'balanceOf'
  })

  const { data: whithdrawTxes, refetch: refetchWithdrawTxes } = useReadContract({
    abi: contractAbi,
    address: contractAdress,
    functionName: 'getWithdrawTxes'
  })

  const { writeContract } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: transactionHash,
  })

  useEffect(() => {
    if (contractBalance) {
      setScBalance(formatEther(contractBalance));
    }
    if(withdrawTxCount) {
      setScTotalTxCount(withdrawTxCount)
    }
    if (whithdrawTxes) {
      console.log("Raw withdraw transactions:", whithdrawTxes);
      let pendingTxes = whithdrawTxes
        .map((tx, index) => ({
          transactionIndex: index,
          to: tx.to,
          amount: formatEther(tx.amount),
          approvals: Number(tx.approvals),
          sent: tx.sent
        }))
        .filter(tx => !tx.sent && tx.to !== zeroAddress);
      console.log("Filtered pending transactions:", pendingTxes);
      setScPendingTransactions(pendingTxes);
    }
  }, [contractBalance, withdrawTxCount, whithdrawTxes])

  const depositEtherToWalletContract = async () => {
    try {
      console.log("Attempting deposit...");
      const result = await writeContract({
        address: contractAdress,
        abi: contractAbi,
        functionName: 'deposit', 
        value: parseEther(ethToUseForDeposit),
      });
      console.log("Deposit transaction result:", result);
      if (result) setTransactionHash(result);
    } catch (error) {
      console.error('Error during deposit:', error);
    }
    setEthToUseForDeposit('')
  }

  const whithdrawEth = async () => {
    try {
      console.log("Attempting withdrawal...");
      console.log("To address:", ethAddressToUseForWhithdrawal);
      console.log("Amount:", ethToUseForWhithdrawal);
      const result = await writeContract({
        address: contractAdress,
        abi: contractAbi,
        functionName: 'createWithdrawTx',
        args: [ethAddressToUseForWhithdrawal, parseEther(ethToUseForWhithdrawal)],
      });
      console.log("Withdraw transaction result:", result);
      if (result) {
        setTransactionHash(result);
        // Manually trigger a refresh of withdraw transactions
        await refetchWithdrawTxes();
      }
    } catch (error) {
      console.error('Error during withdrawal:', error);
    }
    setEthAddressToUseForWhithdrawal('')
    setEthToUseForWhithdrawal('')
  }

  const approveWhithdraw = async (txIndex) => {
    try {
      console.log("Tentative d'approbation pour l'index:", txIndex);
      const result = await writeContract({
        abi: contractAbi,
        address: contractAdress,
        functionName: 'approveWithdrawTx',
        args: [txIndex],
      });
      console.log("Approve transaction result:", result);
      if (result) {
        setTransactionHash(result);
        // Manually trigger a refresh of withdraw transactions
        await refetchWithdrawTxes();
      }
    } catch (error){
      console.error('Erreur lors de l\'approbation:', error);
    }
  }

  const refreshData = async () => {
    console.log("Refreshing data...");
    await Promise.all([
      refetchOwners(),
      refetchWithdrawTxCount(),
      refetchContractBalance(),
      refetchWithdrawTxes()
    ]);
    console.log("Data refreshed");
  }

  useEffect(() => {
    if (isConfirmed) {
      console.log("Transaction confirmed, refreshing data...");
      refreshData();
      setTransactionHash(null);
      setEthToUseForDeposit('');
      setEthToUseForWhithdrawal('');
      setEthAddressToUseForWhithdrawal('');
    }
  }, [isConfirmed]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (address) {
        refreshData();
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, [address]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-800">
      <Header/>
      <div className="p-5 grow flex flex-col items-center text-white">
        <div className="w-full max-w-6xl mb-8 flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-3/4 p-4 bg-gray-700 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Multi-signature Wallet Owners</h2>
            <ul className="grid grid-cols-1 gap-2">
              {owners ? owners.map((owner, index) => (
                <li key={index} className="bg-gray-600 p-2 rounded break-all">{owner}</li>
              )) : <li>Loading owners...</li>}
            </ul>
          </div>
          <div className="w-full md:w-1/4 p-4 bg-gray-700 rounded-lg shadow-md flex flex-col justify-center items-center">
            <h3 className="text-lg font-semibold mb-2">Wallet Balance</h3>
            <p className="text-2xl font-bold">{scBalance} ETH</p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-8 w-full max-w-4xl">
          <div className="w-full md:w-5/12 p-4 bg-gray-700 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Deposit</h3>
            <div className="flex flex-col gap-2">
              <input
                type='text'
                value={ethToUseForDeposit}
                onChange={(e)=> setEthToUseForDeposit(e.target.value)}
                placeholder="ETH amount to deposit"
                className="text-black px-2 py-1 rounded"
              />
              <button 
                onClick={depositEtherToWalletContract} 
                disabled={isConfirming}
                className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded disabled:opacity-50"
              >
                {isConfirming ? 'Transaction en cours...' : 'Deposit'}
              </button>
            </div>
          </div>

          <div className="w-full md:w-5/12 p-4 bg-gray-700 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Withdraw</h3>
            <div className="flex flex-col gap-2">
              <input
                type='text'
                value={ethAddressToUseForWhithdrawal}
                onChange={(e)=> setEthAddressToUseForWhithdrawal(e.target.value)}
                placeholder="Receiving address"
                className="text-black px-2 py-1 rounded"
              />
              <input
                type='text'
                value={ethToUseForWhithdrawal}
                onChange={(e)=> setEthToUseForWhithdrawal(e.target.value)}
                placeholder="ETH amount to withdraw"
                className="text-black px-2 py-1 rounded"
              />
              <button 
                onClick={whithdrawEth} 
                disabled={isConfirming}
                className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded disabled:opacity-50"
              >
                {isConfirming ? 'Transaction en cours...' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 w-full max-w-2xl">
          <h3 className="text-lg font-semibold mb-4">Wallet Information</h3>
          <p>Total withdraw transactions: {scTotalTxCount}</p>
        </div>

        <div className="mt-8 w-full max-w-2xl">
          <h3 className="text-lg font-semibold mb-4">Pending Transactions</h3>
          {scPendingTransactions.length === 0 ? (
            <p>No pending transactions</p>
          ) : (
            <ul className="space-y-4">
              {scPendingTransactions.map((tx, index) => (
                <li key={index} className="bg-gray-700 p-4 rounded-lg shadow-md">
                  <p>Transaction {tx.transactionIndex}</p>
                  <p>To: {tx.to}</p>
                  <p>Amount: {tx.amount} ETH</p>
                  <p>Approvals: {tx.approvals.toString()}</p>
                  <button 
                    onClick={() => approveWhithdraw(tx.transactionIndex)} 
                    disabled={isConfirming}
                    className="mt-2 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded disabled:opacity-50"
                  >
                    {isConfirming ? 'Approving...' : 'Approve'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}