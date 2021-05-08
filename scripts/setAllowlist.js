// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
const { ethers } = require('hardhat');

const CONTRACT_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';

/** CONFIG **/
//const TO_ADDRESS = '0x9eE5E3Ff06425CF972E77c195F70Ecb18aC23d7f';
const TO_ADDRESS = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'; // address 0 of hardhat default
const TRUE_OR_FALSE = true;
/** CONFIG **/

async function main() {
  // Check the address of the sender
  const [deployer] = await ethers.getSigners();

  // We get the contract to deploy
  const F473 = await ethers.getContractFactory('F473');
  const contract = await F473.attach(CONTRACT_ADDRESS);

  const provider = await ethers.getDefaultProvider();

  let tx = await contract.setInAllowlist(TO_ADDRESS, TRUE_OR_FALSE);
  let receipt = await tx.wait();
  console.log(receipt);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
