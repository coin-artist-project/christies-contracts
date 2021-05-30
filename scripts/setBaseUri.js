// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
const { ethers } = require('hardhat');
const getContracts = require('./util/getContracts.js');

const CONTRACT_ADDRESS = (getContracts()).F473_TOKENS;

/** CONFIG **/
//const TO_ADDRESS = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'; // address 0 of hardhat default
const TO_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // address 1 of hardhat default
const index   = 1;
const version = 1;
const amount  = 1;
/** CONFIG **/

async function main() {
  // Check the address of the sender
  const [deployer] = await ethers.getSigners();

  // We get the contract to deploy
  const F473Tokens = await ethers.getContractFactory('F473Tokens');
  const contract = await F473Tokens.attach(CONTRACT_ADDRESS);

  let tx = await contract.mintHearts(TO_ADDRESS, index, version, amount);
  let receipt = await tx.wait();
  console.log(receipt);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
