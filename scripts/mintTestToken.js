// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
const { ethers } = require('hardhat');
const getContracts = require('./util/getContracts.js');

const CONTRACT_ADDRESS = '0xa0a774f9f34D5CB5179D80660E07Ccba53C3DC83';

/** CONFIG **/
const TO_ADDRESS = '0x97cc50FBA17F8683b5c05DccE0B36b37311e6bb3';
/** CONFIG **/

async function main() {
  // Check the address of the sender
  const [deployer] = await ethers.getSigners();

  // We get the contract to deploy
  const F473TestToken = await ethers.getContractFactory('F473TestToken');
  const contract = await F473TestToken.attach(CONTRACT_ADDRESS);

  const provider = await ethers.getDefaultProvider();

  let tx = await contract.mint(TO_ADDRESS, 1);
  let receipt = await tx.wait();
  console.log(receipt);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
