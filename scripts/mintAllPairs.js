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
const TO_ADDRESS0 = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'; // address 0 of hardhat default
const TO_ADDRESS1 = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // address 1 of hardhat default
const background = 1;
const audio      = 2;
const version    = 1;
/** CONFIG **/

async function main() {
  // Check the address of the sender
  const [deployer] = await ethers.getSigners();

  // We get the contract to deploy
  const F473Tokens = await ethers.getContractFactory('F473Tokens');
  const contract = await F473Tokens.attach(CONTRACT_ADDRESS);

  const NUM_SOLO = (await contract.NUM_SOLO_CHAR()).toNumber();
  const NUM_PAIR = (await contract.NUM_PAIR_CHAR()).toNumber();

  for (let charIdx = NUM_SOLO + 1; charIdx <= NUM_PAIR + NUM_SOLO; charIdx++) {
    await contract.mintCard(TO_ADDRESS0, charIdx, background, audio, version);
    await contract.mintCard(TO_ADDRESS1, charIdx, background, audio, version);
  }

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
