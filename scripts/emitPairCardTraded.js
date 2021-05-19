// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
const { ethers } = require('hardhat');

const CONTRACT_ADDRESS = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';

/** CONFIG **/
const TO_ADDRESS = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'; // address 0 of hardhat default
const CARD_ID = parseInt('0x1337');
/** CONFIG **/

async function main() {
  // Check the address of the sender
  const [deployer] = await ethers.getSigners();

  // We get the contract to deploy
  const F473 = await ethers.getContractFactory('F473');
  const contract = await F473.attach(CONTRACT_ADDRESS);

  const provider = await ethers.getDefaultProvider();

  let tx = await contract.emitPairCardTraded(TO_ADDRESS, CARD_ID);
  let receipt = await tx.wait();
  console.log(receipt);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
