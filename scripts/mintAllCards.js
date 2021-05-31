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
const TO_ADDRESS0 = '0x97cc50FBA17F8683b5c05DccE0B36b37311e6bb3';
const version    = 1;
/** CONFIG **/

async function main() {
  // Check the address of the sender
  const [deployer] = await ethers.getSigners();

  // We get the contract to deploy
  const F473Tokens = await ethers.getContractFactory('F473Tokens');
  const contract = await F473Tokens.attach(CONTRACT_ADDRESS);

  let gasLimit = (process.env.HARDHAT_NETWORK == undefined) ? 12450000 : 20000000;

  for (let charIdx = 1; charIdx <= 78; charIdx++) {
    await contract.mintCard(TO_ADDRESS0, charIdx, Math.floor(Math.random() * 15) + 1, 3, version, {gasLimit});
    console.log("Minted", charIdx);
  }

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
