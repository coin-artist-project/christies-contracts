// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
const { ethers } = require('hardhat');
const getContracts = require('./util/getContracts.js');

async function main() {
  // Check the address of the sender
  const [deployer] = await ethers.getSigners();

  const CONTRACT_ADDRESS = (getContracts()).F473;
  const CONTRACT_ADDRESS_TOKENS = (getContracts()).F473_TOKENS;
  const CONTRACT_ADDRESS_REPLAY = (getContracts()).F473_REPLAY_TOKENS;

  // We get the contract to deploy
  const F473 = await ethers.getContractFactory('F473');
  const contract = await F473.attach(CONTRACT_ADDRESS);

  const F473Tokens = await ethers.getContractFactory('F473Tokens');
  const contractTokens = await F473Tokens.attach(CONTRACT_ADDRESS_TOKENS);

  const F473ReplayToken = await ethers.getContractFactory('F473ReplayToken');
  const contractReplay = await F473ReplayToken.attach(CONTRACT_ADDRESS_REPLAY);

  let tx = await contractTokens.setGameAddress(CONTRACT_ADDRESS, {gasPrice: 10, gasLimit: 20000000});
  let receipt = await tx.wait();
  console.log(receipt);

  tx = await contractReplay.setGameAddress(CONTRACT_ADDRESS, {gasPrice: 10, gasLimit: 20000000});
  receipt = await tx.wait();
  console.log(receipt);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
