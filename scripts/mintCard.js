// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
const { ethers } = require('hardhat');

const CONTRACT_ADDRESS = '0x5fbdb2315678afecb367f032d93f642f64180aa3';

/** CONFIG **/
//const TO_ADDRESS = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'; // address 0 of hardhat default
const TO_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // address 1 of hardhat default
const character  = 1;
const background = 1;
const audio      = 1;
const version    = 1;
/** CONFIG **/

async function main() {
  // Check the address of the sender
  const [deployer] = await ethers.getSigners();

  // We get the contract to deploy
  const F473Tokens = await ethers.getContractFactory('F473Tokens');
  const contract = await F473Tokens.attach(CONTRACT_ADDRESS);

  const provider = await ethers.getDefaultProvider();

  let tx = await contract.mintCard(TO_ADDRESS, character, background, audio, version);
  let receipt = await tx.wait();
  console.log(receipt);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
