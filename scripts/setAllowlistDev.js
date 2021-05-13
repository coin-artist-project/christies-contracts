// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
const { ethers } = require('hardhat');

const CONTRACT_ADDRESS = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';

/** CONFIG **/
const TO_ADDRESSES = [
  '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc'
];
const TRUE_OR_FALSE = true;
/** CONFIG **/

async function main() {
  // Check the address of the sender
  const [deployer] = await ethers.getSigners();

  // We get the contract to deploy
  const F473 = await ethers.getContractFactory('F473');
  const contract = await F473.attach(CONTRACT_ADDRESS);

  const provider = await ethers.getDefaultProvider();

  for (let addr of TO_ADDRESSES) {
    let tx = await contract.setInAllowlist(addr, TRUE_OR_FALSE);
    let receipt = await tx.wait();
    console.log(receipt);
  }

  console.log("done.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
